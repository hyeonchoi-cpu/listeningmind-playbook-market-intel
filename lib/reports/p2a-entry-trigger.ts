// P-2a · 카테고리 진입 트리거 — 퍼블리시스 Otrivin 케이스에서 일반화한 템플릿.
//
// 원 스펙은 "path_finder REVERSE"였으나 실제 API에 REVERSE 모드는 없다. 대신 실응답(경로 시퀀스)에
// 시드로 "도착"하는 경로가 이미 포함되어 있음을 실측으로 확인(예: 냉방 → 냉방기구 종류 → 에어컨) —
// 시드가 처음 등장하기 "이전 구간"을 분석하면 역방향 여정(무엇이 카테고리 진입을 트리거하나)이 나온다.
//  트리거 = 시드 등장 직전 쿼리 (진입 직전에 무엇을 검색했나)
//  출발점 = 도착 경로의 첫 쿼리 (진입 여정이 어디서 시작됐나)
// 비중은 경로 집계 파생값. 검색 여정은 집계 행동 그래프이며 개인 추적이 아님. LLM 없음.
import { pathFinder, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { Industry, P2aFlowRow, P2aReport, ReportInsight } from "@/types";

const PATH_LIMIT = 150;
const TOP_ROWS = 12;

function aggregate(keywords: string[], denominator: number): P2aFlowRow[] {
  const agg = new Map<string, number>();
  for (const kw of keywords) agg.set(kw, (agg.get(kw) ?? 0) + 1);
  return [...agg.entries()]
    .map(([keyword, count]) => ({
      keyword,
      count,
      sharePct: { value: Math.round((count / Math.max(1, denominator)) * 1000) / 10, basis: "derived" as const },
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_ROWS);
}

export async function generateP2aReport(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<P2aReport> {
  const { industry, category, gl } = input;
  const seed = category.trim();
  const seedLower = seed.toLowerCase();
  const containsSeed = (kw: string) => kw.toLowerCase().includes(seedLower);

  const { paths, cost } = await pathFinder(seed, gl, PATH_LIMIT);
  if (paths.length === 0) {
    throw new Error(
      `"${seed}" 키워드의 검색 여정 데이터가 없습니다. 시드 검색량 부족일 수 있으니 더 대표적인 카테고리 키워드로 시도해보세요.`,
    );
  }

  const triggerKws: string[] = [];
  const originKws: string[] = [];
  let arrivalPaths = 0;
  let directPaths = 0;
  for (const path of paths) {
    const firstSeedIdx = path.findIndex(containsSeed);
    if (firstSeedIdx === -1) continue;
    if (firstSeedIdx === 0) {
      directPaths += 1;
      continue;
    }
    arrivalPaths += 1;
    triggerKws.push(path[firstSeedIdx - 1]);
    originKws.push(path[0]);
  }

  const classified = arrivalPaths + directPaths;
  const directEntrySharePct = {
    value: Math.round((directPaths / Math.max(1, classified)) * 1000) / 10,
    basis: "derived" as const,
  };

  return {
    meta: {
      industry: industry.slug,
      reportCode: "P-2a",
      category: seed,
      gl,
      totalPaths: paths.length,
      arrivalPaths,
      directEntrySharePct,
      generatedAt: new Date().toISOString(),
    },
    triggers: aggregate(triggerKws, arrivalPaths),
    origins: aggregate(originKws, arrivalPaths),
    insights: computeInsights(seed, aggregate(triggerKws, arrivalPaths), aggregate(originKws, arrivalPaths), arrivalPaths, directEntrySharePct.value),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "path_finder", calls: 1, totalCost: cost }],
  };
}

function computeInsights(
  seed: string,
  triggers: P2aFlowRow[],
  origins: P2aFlowRow[],
  arrivalPaths: number,
  directSharePct: number,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  insights.push({
    kind: "entry_mix",
    title: `직접 진입 ${directSharePct}% · 유도 진입 ${Math.round((100 - directSharePct) * 10) / 10}%`,
    body: `"${seed}"(포함 키워드)에서 여정을 시작한 비중 vs 다른 검색을 거쳐 도착한 비중 · 집계 그래프 기준 근사`,
  });

  if (arrivalPaths === 0) {
    insights.push({
      kind: "data_gap",
      title: "도착 경로 없음 — 진입 트리거 분석 불가",
      body: "모든 경로가 시드에서 시작합니다. 직접 진입 위주 카테고리이거나 반환 경로 표본의 한계일 수 있으니, 더 상위 카테고리 키워드로 재시도해보세요.",
    });
    return insights;
  }

  if (triggers.length) {
    insights.push({
      kind: "trigger",
      title: `최다 진입 트리거 · "${triggers[0].keyword}"`,
      body: `카테고리 진입 직전에 가장 많이 검색된 쿼리(${triggers[0].count}회) · 이 상황·문제 맥락을 겨냥한 진입 콘텐츠 검토 대상`,
    });
  }
  if (origins.length && origins[0].keyword !== triggers[0]?.keyword) {
    insights.push({
      kind: "origin",
      title: `최다 여정 출발점 · "${origins[0].keyword}"`,
      body: `시드로 도착한 여정이 가장 많이 시작된 쿼리(${origins[0].count}회) · 카테고리 인지 이전의 근본 니즈 후보 (단정 아님)`,
    });
  }

  return insights;
}
