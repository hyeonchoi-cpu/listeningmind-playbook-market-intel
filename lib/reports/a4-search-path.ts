// A-4 · 인지→구매 검색 경로 (path_finder, 카테고리 수준).
//
// C-3(브랜드 유입·이탈)와 같은 커넥터를 쓰지만 관점이 다르다 — 카테고리 전체 여정의
// 퍼널 단계 분포와 단계 이동 흐름을 본다. LLM 없음(단계 분류는 path_finder 스펙상 알고리즘 추정).
import { pathFinder, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { A4Report, A4Stage, Industry, ReportInsight } from "@/types";

const TOP_NODES_PER_STAGE = 6;
const TOP_TRANSITIONS = 12;
const STAGE_ORDER = ["awareness", "consideration", "decision"];

export async function generateA4Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<A4Report> {
  const { industry, category, gl } = input;

  const { nodes, edges, cost } = await pathFinder(category.trim(), gl, 200);
  if (nodes.length === 0 && edges.length === 0) {
    throw new Error(
      `"${category}" 키워드의 검색 여정 데이터가 없습니다. 시드 검색량 부족(월 1,000 미만 의심)일 수 있으니 더 대표적인 카테고리 키워드로 시도해보세요.`,
    );
  }

  const byStage = new Map<string, typeof nodes>();
  for (const n of nodes) {
    const stage = n.stage ?? "미분류";
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage)!.push(n);
  }
  const stageRank = (s: string) => {
    const i = STAGE_ORDER.indexOf(s.toLowerCase());
    return i === -1 ? STAGE_ORDER.length : i;
  };
  const stages: A4Stage[] = [...byStage.entries()]
    .map(([stage, ns]) => ({
      stage,
      nodeCount: ns.length,
      topNodes: [...ns]
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, TOP_NODES_PER_STAGE)
        .map((n) => ({ keyword: n.keyword, sessionCount: { value: n.sessionCount, basis: "measured" as const } })),
    }))
    .sort((a, b) => stageRank(a.stage) - stageRank(b.stage));

  const topTransitions = [...edges]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_TRANSITIONS)
    .map((e) => ({
      from: e.from,
      to: e.to,
      weight: { value: Math.round(e.weight * 1000) / 1000, basis: "measured" as const },
    }));

  return {
    meta: {
      industry: industry.slug,
      reportCode: "A-4",
      category,
      gl,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      generatedAt: new Date().toISOString(),
    },
    stages,
    topTransitions,
    insights: computeInsights(stages, topTransitions, nodes.length),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "path_finder", calls: 1, totalCost: cost }],
  };
}

function computeInsights(
  stages: A4Stage[],
  transitions: { from: string; to: string; weight: { value: number } }[],
  totalNodes: number,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  const classified = stages.filter((s) => s.stage !== "미분류");
  if (classified.length) {
    const top = [...classified].sort((a, b) => b.nodeCount - a.nodeCount)[0];
    insights.push({
      kind: "stage_weight",
      title: `여정 무게중심 · ${top.stage} (${Math.round((top.nodeCount / Math.max(1, totalNodes)) * 100)}%)`,
      body: `노드 ${totalNodes}개 중 ${top.stage} 단계가 최다 · 단계 분류는 알고리즘 추정이므로 참고용`,
    });
  }

  if (transitions.length) {
    const t = transitions[0];
    insights.push({
      kind: "transition",
      title: `최강 이동 · "${t.from}" → "${t.to}"`,
      body: `전환 확률 ${t.weight.value} 최상위 시퀀스 · 두 쿼리를 잇는 콘텐츠·랜딩 연결 검토 대상 (집계 그래프 기준, 개인 추적 아님)`,
    });
  }

  const thin = stages.filter((s) => s.stage !== "미분류" && s.nodeCount < 5);
  if (thin.length) {
    insights.push({
      kind: "data_gap",
      title: `신뢰도 낮은 단계 ${thin.length}개`,
      body: `노드 5개 미만 단계(${thin.map((s) => s.stage).join(", ")})는 분석 신뢰도가 낮습니다(path_finder 스펙 기준).`,
    });
  }
  const unclassified = stages.find((s) => s.stage === "미분류");
  if (unclassified && unclassified.nodeCount > totalNodes * 0.3) {
    insights.push({
      kind: "data_gap",
      title: `미분류 노드 ${unclassified.nodeCount}개`,
      body: "단계가 분류되지 않은 노드가 30%를 넘습니다 · 퍼널 해석은 분류된 구간 위주로만 하세요.",
    });
  }

  return insights;
}
