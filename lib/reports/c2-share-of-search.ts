// C-2 · 자사 vs 경쟁 검색 점유율 — 브랜드 지형 공용 파이프라인 + 자사 브랜드 하이라이트.
// SoV는 항상 "검색량 기준 근사"로만 서술 (검색 ≠ 실제 가입/판매/점유율 — 컴플라이언스 공통 규율).
import type { Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import { buildBrandLandscape } from "./brands-shared";
import type { BrandRow, C2Report, Industry, ReportInsight } from "@/types";

export async function generateC2Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
  brand?: string;
}): Promise<C2Report> {
  const { industry, category, gl } = input;
  const ourBrand = input.brand?.trim() ?? "";
  if (!ourBrand) {
    throw new Error("C-2는 자사 브랜드 입력이 필요합니다.");
  }

  const landscape = await buildBrandLandscape({ industry, category, gl, mustInclude: [ourBrand] });
  // LLM이 대표명을 정규화했을 수 있으므로(예: 입력 "엘지" → 대표명 "LG") 별칭까지 확인해 자사 식별
  const ourLower = ourBrand.toLowerCase();
  const brands = landscape.brands.map((b) => ({
    ...b,
    isOurs: b.name.toLowerCase() === ourLower || b.aliases.includes(ourLower),
  }));

  return {
    meta: {
      industry: industry.slug,
      reportCode: "C-2",
      category,
      gl,
      ourBrand,
      totalNodes: landscape.totalNodes,
      llmModel: landscape.llmModel,
      brandExtraction: landscape.brandExtraction,
      generatedAt: new Date().toISOString(),
    },
    brands,
    insights: computeInsights(brands, ourBrand),
    compliance: getComplianceBlock(industry),
    costLog: landscape.costLog,
  };
}

function computeInsights(brands: BrandRow[], ourBrand: string): ReportInsight[] {
  const ours = brands.find((b) => b.isOurs);
  if (!ours || ours.keywordCount === 0) {
    return [
      {
        kind: "data_gap",
        title: `"${ourBrand}" 키워드가 카테고리 그래프에 없음`,
        body: "자사 브랜드명을 포함하는 검색 키워드가 이 카테고리 클러스터에서 확인되지 않았습니다. 브랜드 표기(한/영, 띄어쓰기)를 바꿔 다시 시도하거나, 카테고리 내 자사 검색 존재감 자체가 약하다는 신호일 수 있습니다(단정 아님 — 표기 확인 우선).",
      },
    ];
  }

  const insights: ReportInsight[] = [];
  const rank = brands.filter((b) => b.totalVolume.value > ours.totalVolume.value).length + 1;
  insights.push({
    kind: "our_position",
    title: `자사 검색 점유 · ${ours.sharePct.value}% (${rank}위)`,
    body: `감지된 브랜드 ${brands.length}개 볼륨 합 기준 (검색량 기준 근사 · 실제 판매/가입 점유율 아님)`,
  });

  const above = brands.filter((b) => !b.isOurs && b.totalVolume.value > ours.totalVolume.value);
  if (above.length) {
    const closest = above.reduce((a, b) => (b.totalVolume.value < a.totalVolume.value ? b : a));
    const gap = Math.round((closest.sharePct.value - ours.sharePct.value) * 10) / 10;
    insights.push({
      kind: "gap_up",
      title: `바로 위 경쟁 · ${closest.name} (+${gap}%p)`,
      body: `${closest.name}과의 점유 격차 ${gap}%p · 해당 브랜드 상위 키워드에서 자사 미커버 쿼리 검토`,
    });
  } else {
    insights.push({
      kind: "leader",
      title: "자사가 검색 점유 1위",
      body: "감지된 브랜드 중 자사 볼륨이 최상위 · 방어 관점에서 라이징 브랜드(트렌드 상위) 모니터링 권장",
    });
  }

  const trendGap = brands.filter((b) => !b.isOurs && b.weightedTrend.basis !== "missing" && b.weightedTrend.value > (ours.weightedTrend.value ?? 0));
  if (trendGap.length) {
    const fastest = trendGap.reduce((a, b) => (b.weightedTrend.value > a.weightedTrend.value ? b : a));
    insights.push({
      kind: "trend_watch",
      title: `트렌드 추월 주의 · ${fastest.name}`,
      body: `${fastest.name}의 볼륨 가중 트렌드(+${Math.round(fastest.weightedTrend.value * 1000) / 10}%)가 자사보다 높음 · 검색 관심 동향 기준(인과 단정 아님)`,
    });
  }

  return insights;
}
