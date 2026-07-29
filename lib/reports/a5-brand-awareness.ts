// A-5 · 브랜드 비보조 인지도 (검색 점유율 프록시).
//
// 방법론 주의: 원 스펙(question-frame.md)은 cluster_finder + WebSearch 검증이지만, 서버 파이프라인에는
// WebSearch가 없어 브랜드 검증을 "LLM 추출 + 실제 키워드 부분 문자열 재검증"(brands-shared 공용)으로
// 대체했다 — 이 편차는 인사이트에 명시한다. 검색 점유는 설문 기반 비보조 인지도가 아니라 그 "검색
// 프록시"일 뿐이라는 가정도 항상 함께 서술한다.
import type { Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import { buildBrandLandscape } from "./brands-shared";
import type { A5Report, BrandRow, Industry, ReportInsight } from "@/types";

export async function generateA5Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
}): Promise<A5Report> {
  const { industry, category, gl } = input;
  const landscape = await buildBrandLandscape({ industry, category, gl });
  const brands = landscape.brands;

  const top1 = brands[0]?.sharePct.value ?? 0;
  const top3 = brands.slice(0, 3).reduce((s, b) => s + b.sharePct.value, 0);
  const basisOk = landscape.brandExtraction === "complete" && brands.length > 0;

  return {
    meta: {
      industry: industry.slug,
      reportCode: "A-5",
      category,
      gl,
      totalNodes: landscape.totalNodes,
      llmModel: landscape.llmModel,
      brandExtraction: landscape.brandExtraction,
      generatedAt: new Date().toISOString(),
    },
    brands,
    concentration: {
      top1SharePct: { value: Math.round(top1 * 10) / 10, basis: basisOk ? "derived" : "missing" },
      top3SharePct: { value: Math.round(top3 * 10) / 10, basis: basisOk ? "derived" : "missing" },
    },
    insights: computeInsights(brands, landscape.brandExtraction),
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
        body: "상위 키워드에서 브랜드·제조사명이 확인되지 않았습니다 · 브랜드 상기 자체가 약한 카테고리이거나 카테고리명 조정이 필요합니다.",
      },
    ];
  }

  const insights: ReportInsight[] = [];
  const top = brands[0];
  insights.push({
    kind: "awareness_leader",
    title: `상기 1순위 후보 · ${top.name} ${top.sharePct.value}%`,
    body: `카테고리 검색 시 브랜드가 함께 불리는 비중 최상위 — 검색 점유는 비보조 인지도의 프록시(가정)일 뿐 설문 기반 인지도가 아님`,
  });
  const top3 = brands.slice(0, 3).reduce((s, b) => s + b.sharePct.value, 0);
  insights.push({
    kind: "concentration",
    title: `상위 3개 브랜드 집중도 ${Math.round(top3 * 10) / 10}%`,
    body:
      top3 >= 70
        ? "브랜드 상기가 소수에 집중된 구도 — 후발 브랜드는 카테고리 진입점(CEP) 우회 전략 검토 (D-1 참고)"
        : "브랜드 상기가 분산된 구도 — 상기 경쟁이 열려 있다는 신호(단정 아님)",
  });
  insights.push({
    kind: "methodology",
    title: "방법론 주의 — 원 스펙과의 편차",
    body: "원 설계의 WebSearch 브랜드 검증 대신 LLM 추출+키워드 부분 문자열 재검증을 사용 · 별칭 누락 가능성이 있으니 표의 별칭을 확인하세요",
  });
  return insights;
}
