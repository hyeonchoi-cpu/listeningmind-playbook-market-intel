// C-3 · 자사 검색 전환·이탈 구간 (path_finder — 경로 시퀀스 기반).
//
// 실응답(2026-07-29 실측 검증): data = 검색 경로 배열, 각 경로는 시간순 키워드 시퀀스.
// 입력의 category 필드를 "자사 브랜드·제품 시드 키워드"로 사용한다 (폼 라벨도 그렇게 표시됨).
//  유입 = 경로에서 시드 포함 키워드 "직전"에 등장한 쿼리 (어디서 자사로 넘어오나)
//  유출 = 시드 포함 키워드 "직후"에 등장한 쿼리 — 시드 미포함이면 "이탈 방향 후보"로만 서술
// 비중은 경로 등장 횟수 기반 파생값이며, 검색 여정은 집계 행동 그래프이지 개인 추적이 아니고
// 검색 이동 ≠ 실제 이탈/전환 (컴플라이언스 공통 규율).
import { pathFinder, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { C3FlowRow, C3Report, Industry, ReportInsight } from "@/types";

const PATH_LIMIT = 150; // 비용은 반환 키워드 수 비례(실측: 5경로=450cr) — 보수적 상한
const TOP_FLOWS = 12;

function aggregateFlows(
  entries: { keyword: string; containsSeed: boolean }[],
): C3FlowRow[] {
  const agg = new Map<string, { count: number; containsSeed: boolean }>();
  for (const e of entries) {
    const cur = agg.get(e.keyword) ?? { count: 0, containsSeed: e.containsSeed };
    cur.count += 1;
    agg.set(e.keyword, cur);
  }
  const total = entries.length || 1;
  return [...agg.entries()]
    .map(([keyword, v]) => ({
      keyword,
      count: v.count,
      sharePct: { value: Math.round((v.count / total) * 1000) / 10, basis: "derived" as const },
      containsSeed: v.containsSeed,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_FLOWS);
}

export async function generateC3Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<C3Report> {
  const { industry, category, gl } = input;
  const seed = category.trim();
  const seedLower = seed.toLowerCase();
  const containsSeed = (kw: string) => kw.toLowerCase().includes(seedLower);

  const { paths, cost } = await pathFinder(seed, gl, PATH_LIMIT);
  if (paths.length === 0) {
    throw new Error(
      `"${seed}" 키워드의 검색 여정 데이터가 없습니다. 시드 검색량 부족일 수 있으니 더 대표적인 브랜드·제품 키워드로 시도해보세요.`,
    );
  }

  const inflowEntries: { keyword: string; containsSeed: boolean }[] = [];
  const outflowEntries: { keyword: string; containsSeed: boolean }[] = [];
  let pathsWithSeed = 0;
  for (const path of paths) {
    let seedInPath = false;
    for (let i = 0; i < path.length; i++) {
      if (!containsSeed(path[i])) continue;
      seedInPath = true;
      const prev = path[i - 1];
      if (prev && !containsSeed(prev)) {
        inflowEntries.push({ keyword: prev, containsSeed: false });
      }
      const next = path[i + 1];
      if (next && next !== path[i]) {
        outflowEntries.push({ keyword: next, containsSeed: containsSeed(next) });
      }
    }
    if (seedInPath) pathsWithSeed += 1;
  }

  const inflows = aggregateFlows(inflowEntries);
  const outflows = aggregateFlows(outflowEntries);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "C-3",
      category: seed,
      gl,
      totalPaths: paths.length,
      pathsWithSeed,
      generatedAt: new Date().toISOString(),
    },
    inflows,
    outflows,
    insights: computeInsights(seed, inflows, outflows, paths.length, pathsWithSeed),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "path_finder", calls: 1, totalCost: cost }],
  };
}

function computeInsights(
  seed: string,
  inflows: C3FlowRow[],
  outflows: C3FlowRow[],
  totalPaths: number,
  pathsWithSeed: number,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  insights.push({
    kind: "coverage",
    title: `경로 ${totalPaths}개 중 시드 등장 ${pathsWithSeed}개`,
    body: `"${seed}"가 포함된 여정 비중 ${Math.round((pathsWithSeed / Math.max(1, totalPaths)) * 100)}% · 집계 검색 그래프 기준이며 개인 추적 아님`,
  });

  if (inflows.length) {
    insights.push({
      kind: "inflow",
      title: `최다 유입 트리거 · "${inflows[0].keyword}"`,
      body: `이 쿼리 직후 "${seed}" 방향 이동이 ${inflows[0].count}회로 최다 · 유입 랜딩·콘텐츠 우선 검토 대상`,
    });
  } else {
    insights.push({
      kind: "data_gap",
      title: "유입 전이 없음",
      body: "시드 직전 쿼리가 확인되지 않았습니다 · 여정이 시드에서 시작하는(직접 유입 위주) 패턴일 수 있습니다.",
    });
  }

  const exits = outflows.filter((o) => !o.containsSeed);
  if (exits.length) {
    insights.push({
      kind: "exit_candidate",
      title: `이탈 방향 후보 · "${exits[0].keyword}"`,
      body: `자사 키워드 직후 이동 중 시드 미포함 쿼리 최다(${exits[0].count}회) · 검색 이동 방향일 뿐 실제 이탈/전환 단정 아님 — 해당 쿼리에서 자사 커버리지 점검 권장`,
    });
  }

  return insights;
}
