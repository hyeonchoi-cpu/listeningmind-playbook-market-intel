// ListeningMind DaaS REST 클라이언트 (서버 전용) — Listeningmind-DaaS/web/lib/daas.ts 패턴을 이식.
// 인증: LM-API-KEY 헤더. base: https://listeningmind-data-api.ascentlab.io
// 엔드포인트: POST /cluster_finder /keyword_info (Phase 2 = B-1 한정, intent_finder/path_finder는 Phase 3에서 필요해지면 추가)
//
// web/lib/daas.ts 대비 확장한 것:
//  - KeywordInfo에 demography(성별·연령 태깅) 필드 추가 — B-1 세그먼트 분류에 필수, geo 파이프라인엔 없었음
//  - uniqueKeywords() — cluster_finder 응답에서 고유 키워드 목록 추출 (nodes → communities → rels 순 폴백,
//    lima-agents 스킬의 api/cluster_finder.py unique_keywords()와 동일한 우선순위)
//  - keywordInfoAll() — 1000개 배치 + 동시성 상한 3 (lima-agents api/client.py의 MAX_CONCURRENT=3 승계),
//    누적 cost_detail.total_cost 합산 반환 (크레딧은 소비 로그일 뿐 잔액 아님 — 컴플라이언스 규율)

const BASE = process.env.LM_API_BASE || "https://listeningmind-data-api.ascentlab.io";
const KEY = process.env.LM_API_KEY || "";

export type Gl = "kr" | "us" | "jp";

export class DaasError extends Error {
  constructor(public path: string, public status: number, message: string) {
    super(`[DaaS ${path}] ${status}: ${message}`);
    this.name = "DaasError";
  }
}

async function post<T = any>(path: string, payload: Record<string, unknown>): Promise<T> {
  if (!KEY) throw new DaasError(path, 0, "LM_API_KEY 미설정 (서버 환경변수 확인)");
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "LM-API-KEY": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DaasError(path, res.status, text.slice(0, 300));
  }
  return (await res.json()) as T;
}

// ── cluster_finder ─────────────────────────────────────────────────
export interface ClusterResponse {
  result?: string;
  reason?: string;
  cost_detail?: { total_cost?: number };
  data?: {
    nodes?: unknown;
    communities?: unknown;
    rels?: unknown;
  };
}

export async function clusterFinder(
  keyword: string,
  gl: Gl,
  opts: { hop?: number; limit?: number; dataType?: "communities" | "rels" | "all" } = {},
): Promise<ClusterResponse> {
  return post<ClusterResponse>("/cluster_finder", {
    keyword,
    gl,
    time_point: "curr",
    hop: opts.hop ?? 2,
    limit: opts.limit ?? 5000,
    orientation: "UNDIRECTED",
    data_type: opts.dataType ?? "all",
  });
}

function keywordOf(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const o = v as any;
    return String(o.keyword ?? o.name ?? o.label ?? o.id ?? "").trim();
  }
  return "";
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

function flattenCommunities(c: unknown): string[] {
  if (!c) return [];
  if (!Array.isArray(c) && typeof c === "object") {
    const vals = Object.values(c as Record<string, unknown>);
    if (vals.every((v) => Array.isArray(v))) {
      return (vals as unknown[][]).flatMap((g) => g.map(keywordOf));
    }
    const nodes = (c as any).nodes;
    if (Array.isArray(nodes)) return nodes.map(keywordOf);
  }
  if (Array.isArray(c)) {
    if (c.length && Array.isArray((c[0] as any)?.keywords)) {
      return (c as any[]).flatMap((g) => (g.keywords as unknown[]).map(keywordOf));
    }
    return (c as any[]).map(keywordOf);
  }
  return [];
}

function flattenRels(r: unknown): string[] {
  const out: string[] = [];
  if (Array.isArray(r)) {
    for (const e of r as any[]) {
      if (Array.isArray(e) && e.length >= 2) out.push(keywordOf(e[0]), keywordOf(e[1]));
      else if (e && typeof e === "object") out.push(keywordOf((e as any).source ?? (e as any).from ?? (e as any).a), keywordOf((e as any).target ?? (e as any).to ?? (e as any).b));
    }
  } else if (r && typeof r === "object") {
    for (const [k, neigh] of Object.entries(r as Record<string, unknown>)) {
      out.push(k);
      if (Array.isArray(neigh)) for (const nb of neigh) out.push(keywordOf(nb));
    }
  }
  return out;
}

/** cluster_finder 응답의 communities를 "키워드 그룹 배열"로 정규화 — 응답 스키마 변형을 방어적으로 처리.
 *  (web/lib/daas.ts의 parseCommunities와 동일한 케이스 커버리지) */
export function parseCommunities(resp: ClusterResponse): string[][] {
  const c = resp?.data?.communities;
  if (!c) return [];
  let groups: string[][] = [];
  if (!Array.isArray(c) && typeof c === "object") {
    const vals = Object.values(c as Record<string, unknown>);
    if (vals.every((v) => Array.isArray(v))) {
      groups = (vals as unknown[][]).map((g) => dedupe(g.map(keywordOf)));
    } else {
      const nodes = (c as any).nodes;
      if (Array.isArray(nodes)) groups = groupByCommunity(nodes);
    }
  } else if (Array.isArray(c)) {
    if (c.length && Array.isArray((c[0] as any)?.keywords)) {
      groups = (c as any[]).map((g) => dedupe((g.keywords as unknown[]).map(keywordOf)));
    } else {
      groups = groupByCommunity(c as any[]);
    }
  }
  return groups.filter((g) => g.length > 0);
}

function groupByCommunity(nodes: any[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const kw = keywordOf(n);
    if (!kw) continue;
    const cid = String((n as any)?.community ?? (n as any)?.community_id ?? (n as any)?.group ?? "0");
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid)!.push(kw);
  }
  return [...groups.values()].map(dedupe);
}

/** cluster_finder 응답에서 고유 키워드 우주를 추출한다 — nodes → communities → rels 폴백. */
export function uniqueKeywords(resp: ClusterResponse): string[] {
  const nodes = resp?.data?.nodes;
  if (Array.isArray(nodes) && nodes.length) {
    const kws = dedupe(nodes.map(keywordOf));
    if (kws.length) return kws;
  }
  const fromCommunities = dedupe(flattenCommunities(resp?.data?.communities));
  if (fromCommunities.length) return fromCommunities;
  return dedupe(flattenRels(resp?.data?.rels));
}

// ── keyword_info ───────────────────────────────────────────────────
export interface IntentVector {
  i: number;
  n: number;
  c: number;
  t: number;
}

export interface MonthPoint {
  month: string;
  total: number;
}

/** demography 원본 필드 그대로 보존 — m_* 플래그(1/0) + *_ratio(%) */
export type Demography = Record<string, number | undefined>;

export interface KeywordInfo {
  keyword: string;
  volumeAvg: number;
  volumeTrend: number;
  intents: IntentVector;
  monthly: MonthPoint[];
  demography: Demography | null;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function normalizeKeywordInfo(row: any): KeywordInfo {
  const metrics = row?.ads_metrics ?? row ?? {};
  const rawIntents = row?.intents ?? {};
  const arr: any[] = Array.isArray(row?.monthly_volume) ? row.monthly_volume : [];
  const monthly: MonthPoint[] = arr
    .map((m) => ({ month: String(m?.month ?? ""), total: num(m?.total ?? m?.gg) + num(m?.nv ?? 0) }))
    .filter((m) => m.month);
  return {
    keyword: String(row?.keyword ?? metrics?.keyword ?? ""),
    volumeAvg: num(metrics.volume_avg),
    volumeTrend: num(metrics.volume_trend),
    intents: { i: num(rawIntents.i), n: num(rawIntents.n), c: num(rawIntents.c), t: num(rawIntents.t) },
    monthly,
    demography: row?.demography && typeof row.demography === "object" ? (row.demography as Demography) : null,
  };
}

interface KeywordInfoBatchResponse {
  data?: any[];
  cost_detail?: { total_cost?: number };
}

async function keywordInfoBatch(
  keywords: string[],
  gl: Gl,
): Promise<{ items: KeywordInfo[]; cost: number }> {
  const r = await post<KeywordInfoBatchResponse>("/keyword_info", {
    keywords,
    gl,
    data_type: "all",
  });
  return {
    items: (r.data ?? []).map(normalizeKeywordInfo),
    cost: r.cost_detail?.total_cost ?? 0,
  };
}

/** 배열을 size 크기로 자른다. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** thunk 배열을 동시성 상한을 지키며 실행 — lima-agents api/client.py의 MAX_CONCURRENT=3 승계. */
async function runWithConcurrency<T>(thunks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(thunks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < thunks.length) {
      const i = cursor++;
      results[i] = await thunks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, thunks.length) }, worker));
  return results;
}

/** keyword_info를 1000개씩 배치·동시성 3으로 전체 조회하고 누적 비용을 반환한다. */
export async function keywordInfoAll(
  keywords: string[],
  gl: Gl,
): Promise<{ items: KeywordInfo[]; totalCost: number }> {
  const batches = chunk(keywords, 1000);
  const results = await runWithConcurrency(
    batches.map((batch) => () => keywordInfoBatch(batch, gl)),
    3,
  );
  return {
    items: results.flatMap((r) => r.items),
    totalCost: results.reduce((sum, r) => sum + r.cost, 0),
  };
}

export function indexByKeyword(items: KeywordInfo[]): Map<string, KeywordInfo> {
  const map = new Map<string, KeywordInfo>();
  for (const item of items) if (item.keyword) map.set(item.keyword, item);
  return map;
}
