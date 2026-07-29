// Claude 기반 실시간 KBF(핵심 구매요인) 분류 — 서버 전용.
// web/lib/llm.ts의 fetch 기반 Anthropic 호출 패턴을 그대로 따름(SDK 의존성 추가 안 함).
//
// 설계 배경 (docs/market-intelligence-webapp-design.md §6, §8 결정 1/5/7):
//  - lima-agents Python MVP는 정규식 사전(KBF_PATTERNS) 기반 분류였음 — 식품 카테고리에만 맞춰진 하드코딩이라
//    다른 업권(화장품·금융 등)엔 그대로 못 씀. 이 파일이 그걸 대체한다.
//  - 매 리포트 생성마다 실시간 호출(정규식/캐시 없음) — §8 결정 1.
//  - playbook 전용 Anthropic API 키를 쓴다 — §8 결정 5.
//  - 스키마 불일치/타임아웃 시 최대 2회 재시도, 그래도 실패하면 리포트 전체를 죽이지 않고
//    "partial" 상태로 빈 분류를 반환해 호출부가 [재분류 필요] 배지로 표시하게 한다 — §8 결정 7.
import type { Industry } from "@/types";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_ATTEMPTS = 3; // 최초 시도 1회 + 재시도 최대 2회
const MAX_KEYWORDS_PER_CALL = 250; // 프롬프트 크기 방어 상한

export function llmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type KbfClassification = {
  /** 이번 생성에서 Claude가 스스로 정의한 이 카테고리용 KBF 라벨 집합 */
  taxonomy: string[];
  /** keyword → 해당하는 KBF 라벨들 (없으면 빈 배열) */
  labels: Record<string, string[]>;
  /** 재시도까지 모두 실패해 빈 분류로 대체된 경우 "partial" */
  status: "complete" | "partial";
  model: string;
};

function buildSystemPrompt(category: string, industry: Industry): string {
  const guardrails = industry.guardrailSummary.map((g) => `- ${g}`).join("\n");
  return `당신은 "${category}" 카테고리(${industry.label} 업권) 검색 키워드를 핵심구매요인(KBF)으로 분류하는 분석가입니다.

업권 참고: ${industry.entityDictionaryLabel}.

이 업권 리포트에는 아래 컴플라이언스 가드레일이 항상 적용됩니다 — 만들어내는 KBF 라벨명 자체가 이 규칙을 위반하는 단정·권유 표현이 되지 않도록 주의하세요:
${guardrails}

작업 순서:
1) 이 카테고리에 맞는 KBF(핵심 구매요인) 라벨을 5~8개 스스로 정의하세요. 한국어, 2~6자 내외 명사구 (예: "가격·가성비", "성분·효능", "안전·부작용").
2) 입력된 키워드 각각이 어떤 KBF 라벨에 해당하는지 분류하세요. 한 키워드가 여러 라벨에 해당할 수 있습니다. 근거가 약하면 억지로 분류하지 말고 빈 배열로 두세요 — 잘못된 분류보다 "미분류"가 낫습니다.

출력은 오직 아래 JSON 형식으로만 (설명·마크다운·코드펜스 금지):
{"taxonomy":["라벨1","라벨2"],"labels":{"키워드1":["라벨1"],"키워드2":[]}}
입력 키워드를 빠짐없이 labels의 키로 포함하세요.`;
}

function parseJson(text: string): { taxonomy?: unknown; labels?: unknown } {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function isValid(parsed: { taxonomy?: unknown; labels?: unknown }, keywords: string[]): boolean {
  if (!Array.isArray(parsed.taxonomy) || parsed.taxonomy.length === 0) return false;
  if (!parsed.labels || typeof parsed.labels !== "object") return false;
  const labelKeys = Object.keys(parsed.labels as object);
  // 최소 80%의 입력 키워드가 응답에 포함돼야 "완전한" 분류로 간주 — 그 이하는 재시도 대상
  const covered = keywords.filter((k) => labelKeys.includes(k)).length;
  return covered >= keywords.length * 0.8;
}

async function callClaude(system: string, userPayload: string, model: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY 미설정 (서버 환경변수 확인)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userPayload }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find((c) => c.type === "text")?.text ?? "";
}

/**
 * 키워드 목록을 카테고리·업권 맥락에 맞춰 KBF로 분류한다.
 * 호출부가 이미 세그먼트별 상위 키워드로 규모를 줄여서 넘기는 것을 전제로 한다
 * (전체 키워드 우주를 그대로 넘기면 비용·지연시간이 커짐 — 상세: 설계 문서 §6).
 */
export async function classifyKbf(
  category: string,
  industry: Industry,
  keywords: string[],
): Promise<KbfClassification> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const distinct = [...new Set(keywords.filter(Boolean))].slice(0, MAX_KEYWORDS_PER_CALL);
  if (distinct.length === 0) {
    return { taxonomy: [], labels: {}, status: "complete", model };
  }

  const system = buildSystemPrompt(category, industry);
  const userPayload = JSON.stringify({ category, keywords: distinct });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callClaude(system, userPayload, model);
      const parsed = parseJson(text);
      if (isValid(parsed, distinct)) {
        const labels: Record<string, string[]> = {};
        for (const kw of distinct) {
          const v = (parsed.labels as Record<string, unknown>)[kw];
          labels[kw] = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        }
        return {
          taxonomy: (parsed.taxonomy as string[]).filter((x) => typeof x === "string"),
          labels,
          status: "complete",
          model,
        };
      }
      lastError = new Error("응답이 스키마 검증(80% 키워드 커버리지)을 통과하지 못함");
    } catch (e) {
      lastError = e;
    }
  }

  // 재시도까지 모두 실패 — 리포트 전체를 죽이지 않고 partial로 빈 분류 반환
  console.error(`[llm.classifyKbf] ${MAX_ATTEMPTS}회 시도 후 실패:`, lastError);
  return {
    taxonomy: [],
    labels: Object.fromEntries(distinct.map((k) => [k, []])),
    status: "partial",
    model,
  };
}

// ─────────── CEP 7W 분류 (A-3 등) ───────────

export type CepGroupInput = { id: string; keywords: { kw: string; vol: number }[] };

export type CepClassification = {
  /** cluster id → 7W 라벨. 실패 시 비어있고 status가 partial */
  groups: Record<string, { axis: string; cepShort: string; situation: string }>;
  status: "complete" | "partial";
  model: string;
};

const CEP_AXES = ["WHEN", "WHERE", "WHILE", "WITH_WHOM", "WITH_WHAT", "HOW_FEEL", "WHY", "UNCLEAR"];

function buildCepSystemPrompt(category: string, industry: Industry): string {
  const guardrails = industry.guardrailSummary.map((g) => `- ${g}`).join("\n");
  return `당신은 "${category}" 카테고리(${industry.label} 업권)의 검색 키워드 군집을 CEP(카테고리 진입점) 7W 축으로 해석하는 분석가입니다.

입력은 실제 검색 데이터로 만든 키워드 군집들입니다(각 군집의 키워드+검색량). 각 군집이 소비자의 어떤 "검색 목적·상황"을 가리키는지 해석하세요.

이 업권 리포트에는 아래 가드레일이 항상 적용됩니다 — situation 문장이 이 규칙을 위반하는 단정·권유 표현이 되지 않게 하세요:
${guardrails}

각 군집에 대해:
1) axis: 7W 축 중 가장 지배적인 하나 — WHEN(언제)/WHERE(어디서)/WHILE(~하다가)/WITH_WHOM(누구와)/WITH_WHAT(무엇과 함께)/HOW_FEEL(어떤 기분·우려)/WHY(왜). 어느 축인지 근거가 약하면 UNCLEAR.
2) cepShort: 그 상황의 짧은 라벨 (8자 내외, 예: "이사 준비", "부작용 우려").
3) situation: 군집 키워드가 공통으로 가리키는 검색 상황을 한 문장으로 (브랜드명 나열이 아니라 상황 서술).

출력은 오직 아래 JSON 형식으로만 (설명·마크다운·코드펜스 금지):
{"groups":{"G1":{"axis":"WHEN","cepShort":"...","situation":"..."},"G2":{...}}}
입력된 모든 군집 id를 빠짐없이 포함하세요. 한국어로 작성.`;
}

function isValidCep(parsed: { groups?: unknown }, ids: string[]): boolean {
  if (!parsed.groups || typeof parsed.groups !== "object") return false;
  const groups = parsed.groups as Record<string, any>;
  const covered = ids.filter((id) => {
    const g = groups[id];
    return g && typeof g.situation === "string" && typeof g.axis === "string";
  }).length;
  return covered >= ids.length * 0.8;
}

/** 키워드 군집들을 CEP 7W 축으로 해석한다. 실패 시 partial(빈 groups)로 폴백 — B-1 KBF와 동일 규율. */
export async function classifyCep(
  category: string,
  industry: Industry,
  clusters: CepGroupInput[],
): Promise<CepClassification> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  if (clusters.length === 0) return { groups: {}, status: "complete", model };

  const system = buildCepSystemPrompt(category, industry);
  const userPayload = JSON.stringify({ category, clusters });
  const ids = clusters.map((c) => c.id);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callClaude(system, userPayload, model);
      const parsed = parseJson(text) as { groups?: Record<string, any> };
      if (isValidCep(parsed, ids)) {
        const groups: CepClassification["groups"] = {};
        for (const id of ids) {
          const g = parsed.groups![id];
          if (!g) continue;
          groups[id] = {
            axis: CEP_AXES.includes(String(g.axis)) ? String(g.axis) : "UNCLEAR",
            cepShort: typeof g.cepShort === "string" ? g.cepShort : "미분류",
            situation: typeof g.situation === "string" ? g.situation : "",
          };
        }
        return { groups, status: "complete", model };
      }
      lastError = new Error("응답이 스키마 검증(80% 군집 커버리지)을 통과하지 못함");
    } catch (e) {
      lastError = e;
    }
  }

  console.error(`[llm.classifyCep] ${MAX_ATTEMPTS}회 시도 후 실패:`, lastError);
  return { groups: {}, status: "partial", model };
}

// ─────────── 브랜드 엔티티 추출 (C-1·C-2) ───────────
// web/lib/llm.ts geo 파이프라인의 검증된 규율을 따름: LLM은 후보를 추리기만 하고,
// 실제 키워드에 부분 문자열로 등장하는 표기만 살아남는다(환각 방지 — 추측 브랜드 창작 금지).
//
// 브랜드는 "대표명 + 별칭 집합"으로 정규화한다 — 브랜드마다 토큰 수준이 다르면(예: "삼성" vs "lg tv")
// 부분 문자열 매칭 커버리지가 비대칭이 되어 SoV가 왜곡되는 실사례가 있었음. 모든 브랜드를 기업/브랜드
// 수준 대표명으로 통일하고 한/영/축약 별칭으로 매칭 폭을 맞춘다.

export type ExtractedBrand = {
  /** 기업/브랜드 수준 대표명 — 카테고리 단어가 붙은 형태("lg tv") 금지 */
  name: string;
  /** 검색 키워드에 실제 등장하는 표기 변형 (한/영/축약/붙여쓰기) — 검증 통과분만 */
  aliases: string[];
};

export type BrandExtraction = {
  brands: ExtractedBrand[];
  status: "complete" | "partial";
  model: string;
};

function buildBrandSystemPrompt(category: string, industry: Industry, mustInclude: string[]): string {
  const mustLine = mustInclude.length
    ? `\n- 다음 브랜드는 반드시 결과에 포함하고 별칭도 함께 정리하세요: ${mustInclude.join(", ")}`
    : "";
  return `당신은 "${category}" 카테고리(${industry.label} 업권) 검색 키워드에서 브랜드·제조사·기관 엔티티를 정규화하는 분석가입니다.

업권 참고: ${industry.entityDictionaryLabel}.

입력된 키워드 목록에서 브랜드·제조사·기관을 최대 12개 추출하되, 각 브랜드를 **대표명(name) + 별칭(aliases)**으로 정규화하세요.
- name은 기업/브랜드 수준 대표명 — "lg tv"처럼 카테고리 단어가 붙은 형태 금지(카테고리 단어를 제거한 "LG"로). 모든 브랜드가 같은 수준이어야 점유율 비교가 공정해집니다.
- aliases는 키워드 목록에 **실제로 보이는** 표기 변형만: 한글/영문/축약/붙여쓰기 (예: LG → ["lg","엘지","lg전자","엘지전자"]). 파이프라인이 부분 문자열 매칭으로 재검증하므로 목록에 없는 표기를 창작하면 버려집니다.
- 일반명사·사양어·상황어(추천, 가격, 대용량, 저소음 등)는 브랜드가 아니므로 제외.${mustLine}
- 브랜드가 없으면 빈 배열.

출력은 오직 아래 JSON 형식으로만 (설명·마크다운·코드펜스 금지):
{"brands":[{"name":"LG","aliases":["lg","엘지","lg전자"]},{"name":"삼성","aliases":["삼성","samsung","삼성전자"]}]}`;
}

export async function extractBrands(
  category: string,
  industry: Industry,
  keywords: string[],
  mustInclude: string[] = [],
): Promise<BrandExtraction> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const distinct = [...new Set(keywords.filter(Boolean))].slice(0, MAX_KEYWORDS_PER_CALL);
  if (distinct.length === 0) return { brands: [], status: "complete", model };

  const system = buildBrandSystemPrompt(category, industry, mustInclude);
  const userPayload = JSON.stringify({ category, keywords: distinct });
  const lowerKws = distinct.map((k) => k.toLowerCase());

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callClaude(system, userPayload, model);
      const parsed = parseJson(text) as { brands?: unknown };
      if (Array.isArray(parsed.brands)) {
        const seen = new Set<string>();
        const verified: ExtractedBrand[] = [];
        for (const raw of parsed.brands) {
          const name = typeof (raw as any)?.name === "string" ? (raw as any).name.trim() : "";
          if (!name || seen.has(name.toLowerCase())) continue;
          const rawAliases: unknown[] = Array.isArray((raw as any)?.aliases) ? (raw as any).aliases : [];
          // 환각 방지: 대표명 자신 + 별칭 중 실제 키워드에 부분 문자열로 등장하는 표기만 통과 (2자 미만 제외)
          const candidates = [
            ...new Set(
              [name, ...rawAliases.filter((a): a is string => typeof a === "string")]
                .map((a) => a.trim().toLowerCase())
                .filter((a) => a.length >= 2),
            ),
          ];
          const aliases = candidates.filter((a) => lowerKws.some((kw) => kw.includes(a)));
          if (aliases.length === 0) continue;
          seen.add(name.toLowerCase());
          verified.push({ name, aliases });
          if (verified.length >= 12) break;
        }
        return { brands: verified, status: "complete", model };
      }
      lastError = new Error("응답에 brands 배열이 없음");
    } catch (e) {
      lastError = e;
    }
  }

  console.error(`[llm.extractBrands] ${MAX_ATTEMPTS}회 시도 후 실패:`, lastError);
  return { brands: [], status: "partial", model };
}

// ─────────── 페인포인트 분류 (C-4) ───────────

export type PainClassification = {
  taxonomy: string[];
  /** keyword → 페인 그룹 라벨들. 페인·우려·불만이 아닌 키워드는 빈 배열 */
  labels: Record<string, string[]>;
  status: "complete" | "partial";
  model: string;
};

function buildPainSystemPrompt(category: string, industry: Industry): string {
  const guardrails = industry.guardrailSummary.map((g) => `- ${g}`).join("\n");
  return `당신은 "${category}" 카테고리(${industry.label} 업권) 검색 키워드에서 페인포인트·부정 신호를 분류하는 분석가입니다.

이 업권 리포트에는 아래 가드레일이 항상 적용됩니다 — 그룹 라벨명이 이 규칙을 위반하는 단정 표현이 되지 않게 하세요:
${guardrails}

작업 순서:
1) 이 카테고리의 페인포인트 그룹을 3~6개 스스로 정의하세요. 한국어 2~8자 명사구 (예: "부작용·안전 우려", "고장·내구성 불만", "가격 불만", "효과 의문").
2) 입력 키워드 중 **소비자의 우려·불만·부정 인식을 담은 키워드만** 해당 그룹으로 분류하세요. 중립·긍정 키워드(추천, 가격 비교, 사용법 등)는 빈 배열로 두세요 — 페인이 아닌 것을 억지로 분류하지 마세요.

출력은 오직 아래 JSON 형식으로만 (설명·마크다운·코드펜스 금지):
{"taxonomy":["그룹1","그룹2"],"labels":{"키워드1":["그룹1"],"키워드2":[]}}
입력 키워드를 빠짐없이 labels의 키로 포함하세요.`;
}

export async function classifyPainpoints(
  category: string,
  industry: Industry,
  keywords: string[],
): Promise<PainClassification> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const distinct = [...new Set(keywords.filter(Boolean))].slice(0, MAX_KEYWORDS_PER_CALL);
  if (distinct.length === 0) return { taxonomy: [], labels: {}, status: "complete", model };

  const system = buildPainSystemPrompt(category, industry);
  const userPayload = JSON.stringify({ category, keywords: distinct });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callClaude(system, userPayload, model);
      const parsed = parseJson(text);
      if (isValid(parsed, distinct)) {
        const labels: Record<string, string[]> = {};
        for (const kw of distinct) {
          const v = (parsed.labels as Record<string, unknown>)[kw];
          labels[kw] = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        }
        return {
          taxonomy: (parsed.taxonomy as string[]).filter((x) => typeof x === "string"),
          labels,
          status: "complete",
          model,
        };
      }
      lastError = new Error("응답이 스키마 검증(80% 키워드 커버리지)을 통과하지 못함");
    } catch (e) {
      lastError = e;
    }
  }

  console.error(`[llm.classifyPainpoints] ${MAX_ATTEMPTS}회 시도 후 실패:`, lastError);
  return {
    taxonomy: [],
    labels: Object.fromEntries(distinct.map((k) => [k, []])),
    status: "partial",
    model,
  };
}
