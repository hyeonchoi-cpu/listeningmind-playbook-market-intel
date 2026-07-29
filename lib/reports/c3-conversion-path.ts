// C-3 · 자사 검색 전환·이탈 구간 (path_finder).
//
// 입력의 category 필드를 "자사 브랜드·제품 시드 키워드"로 사용한다 (폼 라벨도 그렇게 표시됨).
// 유입 = 시드 포함 키워드로 들어오는 상위 엣지, 유출 = 시드 포함 키워드에서 나가는 상위 엣지.
// 유출 대상이 시드를 포함하지 않으면 "이탈 방향 후보"로만 서술 — 실제 이탈/전환 단정 금지
// (검색 여정은 집계 행동 그래프이지 개인 추적이 아니며, 검색 ≠ 실제 구매/해지).
import { pathFinder, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { C3FlowRow, C3Report, C3StageRow, Industry, ReportInsight } from "@/types";

const TOP_FLOWS = 12;

export async function generateC3Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<C3Report> {
  const { industry, category, gl } = input;
  const seed = category.trim();
  const seedLower = seed.toLowerCase();

  const { nodes, edges, cost } = await pathFinder(seed, gl, 200);
  if (nodes.length === 0 && edges.length === 0) {
    throw new Error(
      `"${seed}" 키워드의 검색 여정 데이터가 없습니다. 시드 검색량 부족(월 1,000 미만 의심)일 수 있으니 더 대표적인 브랜드·제품 키워드로 시도해보세요.`,
    );
  }

  const containsSeed = (kw: string) => kw.toLowerCase().includes(seedLower);

  const inflows: C3FlowRow[] = edges
    .filter((e) => containsSeed(e.to) && !containsSeed(e.from))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_FLOWS)
    .map((e) => ({
      keyword: e.from,
      weight: { value: Math.round(e.weight * 1000) / 1000, basis: "measured" },
      containsSeed: false,
    }));

  const outflows: C3FlowRow[] = edges
    .filter((e) => containsSeed(e.from))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_FLOWS)
    .map((e) => ({
      keyword: e.to,
      weight: { value: Math.round(e.weight * 1000) / 1000, basis: "measured" },
      containsSeed: containsSeed(e.to),
    }));

  const stageCounts = new Map<string, number>();
  for (const n of nodes) {
    if (n.stage) stageCounts.set(n.stage, (stageCounts.get(n.stage) ?? 0) + 1);
  }
  const stages: C3StageRow[] = [...stageCounts.entries()]
    .map(([stage, nodeCount]) => ({ stage, nodeCount }))
    .sort((a, b) => b.nodeCount - a.nodeCount);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "C-3",
      category: seed,
      gl,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      generatedAt: new Date().toISOString(),
    },
    inflows,
    outflows,
    stages,
    insights: computeInsights(seed, inflows, outflows, stages, nodes.length),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "path_finder", calls: 1, totalCost: cost }],
  };
}

function computeInsights(
  seed: string,
  inflows: C3FlowRow[],
  outflows: C3FlowRow[],
  stages: C3StageRow[],
  totalNodes: number,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  if (inflows.length) {
    insights.push({
      kind: "inflow",
      title: `최대 유입 트리거 · "${inflows[0].keyword}"`,
      body: `이 쿼리에서 "${seed}" 방향 전환 확률이 가장 높음 · 유입 랜딩·콘텐츠 우선 검토 대상`,
    });
  } else {
    insights.push({
      kind: "data_gap",
      title: "유입 엣지 없음",
      body: "시드 방향으로 들어오는 시퀀스가 확인되지 않았습니다. 시드 검색량이 작거나 브랜드 직접 유입 위주일 수 있습니다.",
    });
  }

  const exits = outflows.filter((o) => !o.containsSeed);
  if (exits.length) {
    insights.push({
      kind: "exit_candidate",
      title: `이탈 방향 후보 · "${exits[0].keyword}"`,
      body: `자사 키워드에서 나가는 흐름 중 최상위 · 집계 검색 그래프 기준의 이동 방향일 뿐 실제 이탈/전환 단정 아님 — 해당 쿼리에서 자사 콘텐츠 커버리지 점검 권장`,
    });
  }

  if (stages.length) {
    const total = stages.reduce((s, r) => s + r.nodeCount, 0) || 1;
    const top = stages[0];
    insights.push({
      kind: "stage",
      title: `여정 무게중심 · ${top.stage} (${Math.round((top.nodeCount / total) * 100)}%)`,
      body: `노드 ${totalNodes}개 중 ${top.stage} 단계가 최다 · 단계 분류는 알고리즘 추정이므로 참고용`,
    });
    const thin = stages.filter((s) => s.nodeCount < 5);
    if (thin.length) {
      insights.push({
        kind: "data_gap",
        title: `신뢰도 낮은 단계 ${thin.length}개`,
        body: `노드 5개 미만 단계(${thin.map((s) => s.stage).join(", ")})는 분석 신뢰도가 낮습니다(path_finder 스펙 기준).`,
      });
    }
  }

  return insights;
}
