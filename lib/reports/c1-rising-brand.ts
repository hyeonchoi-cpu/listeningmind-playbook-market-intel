// C-1 · 라이징·경쟁 브랜드 — 브랜드 지형 공용 파이프라인(brands-shared.ts) 사용.
// "라이징" 판정은 볼륨 가중 트렌드 기준이며, 극소 볼륨 브랜드의 노이즈를 걸러내기 위해
// 브랜드 볼륨 합의 1% 이상인 브랜드만 후보로 삼는다(가정 — 인사이트에 명시).
import type { Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import { buildBrandLandscape } from "./brands-shared";
import type { BrandRow, C1Report, Industry, ReportInsight } from "@/types";

const RISING_MIN_SHARE_PCT = 1; // 라이징 후보 최소 점유율(%) — 가정

export async function generateC1Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<C1Report> {
  const { industry, category, gl } = input;
  const landscape = await buildBrandLandscape({ industry, category, gl });

  return {
    meta: {
      industry: industry.slug,
      reportCode: "C-1",
      category,
      gl,
      totalNodes: landscape.totalNodes,
      llmModel: landscape.llmModel,
      brandExtraction: landscape.brandExtraction,
      generatedAt: new Date().toISOString(),
    },
    brands: landscape.brands,
    insights: computeInsights(landscape.brands, landscape.brandExtraction),
    compliance: getComplianceBlock(industry),
    costLog: landscape.costLog,
  };
}

function computeInsights(brands: BrandRow[], extraction: "complete" | "partial"): ReportInsight[] {
  if (extraction === "partial") {
    return [
      {
        kind: "data_gap",
        title: "브랜드 추출 실패 — 재생성 필요",
        body: "실시간 LLM 브랜드 추출이 재시도 후에도 실패했습니다. 다시 생성해보세요.",
      },
    ];
  }
  if (brands.length === 0) {
    return [
      {
        kind: "data_gap",
        title: "감지된 브랜드 없음",
        body: "상위 키워드에서 브랜드·제조사명이 확인되지 않았습니다. 브랜드 검색이 적은 카테고리이거나, 카테고리명을 더 구체적으로 바꿔볼 필요가 있습니다.",
      },
    ];
  }

  const insights: ReportInsight[] = [];
  const top = brands[0];
  insights.push({
    kind: "sov_leader",
    title: `검색 점유 1위 · ${top.name} ${top.sharePct.value}%`,
    body: `감지된 브랜드 볼륨 합 기준 ${top.name}이 ${top.sharePct.value}% (검색량 기준 근사 · 실제 판매 점유율 아님)`,
  });

  const risingCandidates = brands.filter((b) => b.sharePct.value >= RISING_MIN_SHARE_PCT && b.weightedTrend.basis !== "missing");
  if (risingCandidates.length) {
    const rising = risingCandidates.reduce((a, b) => (b.weightedTrend.value > a.weightedTrend.value ? b : a));
    if (rising.weightedTrend.value > 0) {
      insights.push({
        kind: "rising",
        title: `라이징 후보 · ${rising.name} (+${Math.round(rising.weightedTrend.value * 1000) / 10}%)`,
        body: `볼륨 가중 트렌드 최상위 · 점유율 ${RISING_MIN_SHARE_PCT}% 이상 브랜드만 후보로 삼음(가정) · 급등 원인은 별도 검증 필요`,
      });
    }
    const falling = risingCandidates.reduce((a, b) => (b.weightedTrend.value < a.weightedTrend.value ? b : a));
    if (falling.weightedTrend.value < 0 && falling.name !== rising.name) {
      insights.push({
        kind: "falling",
        title: `하락 신호 · ${falling.name} (${Math.round(falling.weightedTrend.value * 1000) / 10}%)`,
        body: `볼륨 가중 트렌드 최하위 · 검색 관심 감소 동향(상관·동향 서술, 인과 단정 아님)`,
      });
    }
  }

  return insights;
}
