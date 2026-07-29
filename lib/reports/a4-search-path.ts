// A-4 · 인지→구매 검색 경로 (path_finder — 경로 시퀀스 기반).
//
// 실응답(2026-07-29 실측 검증): data = 검색 경로 배열(시간순 키워드 시퀀스). 원 스펙 문서의
// 퍼널 단계(stage) 필드는 실제 API에 없으므로, 위치 기반으로 여정을 해석한다:
//  시작 쿼리 = 경로의 첫 키워드 (카테고리 진입/인지 후보)
//  종착 쿼리 = 경로의 마지막 키워드 (결정 또는 이탈 지점 후보 — 단정 금지)
//  전이     = 연속 쿼리 쌍의 등장 빈도
// 모든 비중은 경로 집계 파생값. LLM 없음.
import { pathFinder, type Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import type { A4FlowRow, A4Report, A4TransitionRow, Industry, ReportInsight } from "@/types";

const PATH_LIMIT = 150;
const TOP_ROWS = 10;
const TOP_TRANSITIONS = 12;

function aggregateEndpoints(keywords: string[], totalPaths: number): A4FlowRow[] {
  const agg = new Map<string, number>();
  for (const kw of keywords) agg.set(kw, (agg.get(kw) ?? 0) + 1);
  return [...agg.entries()]
    .map(([keyword, count]) => ({
      keyword,
      count,
      sharePct: { value: Math.round((count / Math.max(1, totalPaths)) * 1000) / 10, basis: "derived" as const },
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_ROWS);
}

export async function generateA4Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<A4Report> {
  const { industry, category, gl } = input;

  const { paths, cost } = await pathFinder(category.trim(), gl, PATH_LIMIT);
  if (paths.length === 0) {
    throw new Error(
      `"${category}" 키워드의 검색 여정 데이터가 없습니다. 시드 검색량 부족일 수 있으니 더 대표적인 카테고리 키워드로 시도해보세요.`,
    );
  }

  const startKeywords = aggregateEndpoints(paths.map((p) => p[0]), paths.length);
  const endKeywords = aggregateEndpoints(paths.map((p) => p[p.length - 1]), paths.length);

  const transAgg = new Map<string, number>();
  let totalTransitions = 0;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] === path[i + 1]) continue;
      const key = JSON.stringify([path[i], path[i + 1]]);
      transAgg.set(key, (transAgg.get(key) ?? 0) + 1);
      totalTransitions += 1;
    }
  }
  const topTransitions: A4TransitionRow[] = [...transAgg.entries()]
    .map(([key, count]) => {
      const [from, to] = JSON.parse(key) as [string, string];
      return {
        from,
        to,
        count,
        sharePct: {
          value: Math.round((count / Math.max(1, totalTransitions)) * 1000) / 10,
          basis: "derived" as const,
        },
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_TRANSITIONS);

  const avgLen = paths.reduce((s, p) => s + p.length, 0) / paths.length;

  return {
    meta: {
      industry: industry.slug,
      reportCode: "A-4",
      category,
      gl,
      totalPaths: paths.length,
      avgPathLength: { value: Math.round(avgLen * 10) / 10, basis: "derived" },
      generatedAt: new Date().toISOString(),
    },
    startKeywords,
    endKeywords,
    topTransitions,
    insights: computeInsights(category, startKeywords, endKeywords, topTransitions, avgLen),
    compliance: getComplianceBlock(industry),
    costLog: [{ endpoint: "path_finder", calls: 1, totalCost: cost }],
  };
}

function computeInsights(
  category: string,
  starts: A4FlowRow[],
  ends: A4FlowRow[],
  transitions: A4TransitionRow[],
  avgLen: number,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  if (starts.length) {
    insights.push({
      kind: "entry",
      title: `최다 여정 시작 · "${starts[0].keyword}" (${starts[0].sharePct.value}%)`,
      body: `카테고리 여정의 진입 쿼리 최다 · 인지 단계 콘텐츠·광고 키워드 후보 (위치 기반 근사, 단계 분류 아님)`,
    });
  }
  if (ends.length) {
    insights.push({
      kind: "destination",
      title: `최다 여정 종착 · "${ends[0].keyword}" (${ends[0].sharePct.value}%)`,
      body: `여정이 가장 많이 끝나는 쿼리 · 결정 지점일 수도, 관심 이탈일 수도 있음 — 단정 금지, 해당 쿼리의 전환 장치 점검 대상`,
    });
  }
  if (transitions.length) {
    const t = transitions[0];
    insights.push({
      kind: "transition",
      title: `최다 전이 · "${t.from}" → "${t.to}"`,
      body: `${t.count}회 등장한 최다 연속 쿼리 쌍 · 두 쿼리를 잇는 콘텐츠·랜딩 연결 검토 대상 (집계 그래프 기준, 개인 추적 아님)`,
    });
  }
  insights.push({
    kind: "depth",
    title: `평균 여정 깊이 ${Math.round(avgLen * 10) / 10}개 쿼리`,
    body:
      avgLen >= 4
        ? "비교·검토 쿼리가 긴 카테고리 — 여정 중간 단계 콘텐츠 커버리지가 중요하다는 신호(단정 아님)"
        : "짧은 여정 위주 — 진입 쿼리에서 곧바로 결정으로 이어지는 패턴이 많다는 신호(단정 아님)",
  });

  return insights;
}
