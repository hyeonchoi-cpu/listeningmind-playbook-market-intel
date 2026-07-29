// D-3 · 자사 강점·부족 검색 키워드 — 브랜드 지형 공용 파이프라인의 키워드 수준 확장.
//
// 3개 축으로 나눈다:
//  강점        = 자사 별칭이 붙은 상위 결합 쿼리 (단독 자사명 쿼리는 내비게이션 수요라 목록에서 제외)
//  경쟁 수요   = 경쟁 브랜드가 붙은 결합 쿼리 중 자사 미포함 — "자사 콘텐츠 공백"이 아니라
//               비교 콘텐츠·SEM 컨퀘스트 검토 대상. 단독 기업명 쿼리(예: "삼성")는 정의상 그 브랜드의
//               내비게이션 수요일 뿐 자사가 커버할 수 있는 쿼리가 아니므로 여기서도 제외 (실사례 교정).
//  기회        = 어떤 브랜드/기업 토큰도 붙지 않은 상위 논브랜드 키워드 (콘텐츠·SEO 열린 공간)
// 판정 규칙 2종을 목적별로 나눠 쓴다:
//  containsBrandToken(포함만) → "브랜드와 무관한가"(논브랜드 판정, 단독 쿼리도 브랜드 연관으로 취급)
//  matchesBrand(포함+단독 쿼리 제외) → "실행 가능한 브랜드 결합 쿼리인가"(강점/경쟁 수요 목록 멤버십)
// 소비자 브랜드가 아닌 기업·기관·종목명(otherEntities)과 비소비 맥락(주식·취업) 키워드는 전 축에서 제외.
import type { Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import { buildBrandLandscape, containsBrandToken, matchesBrand } from "./brands-shared";
import { isNonConsumerKeyword } from "./consumer-filter";
import type { D3KeywordRow, D3Report, Industry, ReportInsight } from "@/types";

const TOP_ROWS = 10;

export async function generateD3Report(input: {
  industry: Industry;
  category: string;
  gl: Gl;
  brand?: string;
}): Promise<D3Report> {
  const { industry, category, gl } = input;
  const ourBrand = input.brand?.trim() ?? "";
  if (!ourBrand) {
    throw new Error("D-3는 자사 브랜드 입력이 필요합니다.");
  }

  const landscape = await buildBrandLandscape({ industry, category, gl, mustInclude: [ourBrand] });
  const { kw2vol, kw2trend } = landscape;

  // 비소비 맥락(주식·취업 등) 키워드는 강점/부족/기회 어느 축에도 넣지 않는다 —
  // "자사 주가"가 강점으로, "oled 관련주"가 열린 기회로 새는 것 모두 오분류이기 때문
  const allKeywords = landscape.allKeywords.filter((kw) => !isNonConsumerKeyword(kw, industry.slug));
  const nonConsumerExcluded = landscape.allKeywords.length - allKeywords.length;

  const ourLower = ourBrand.toLowerCase();
  const ours = landscape.brands.find(
    (b) => b.name.toLowerCase() === ourLower || b.aliases.includes(ourLower),
  );
  const ourAliases = ours?.aliases ?? [ourLower];
  const competitors = landscape.brands.filter((b) => b !== ours);

  const coveredByFor = (kw: string) =>
    competitors.filter((c) => containsBrandToken(kw, c.aliases)).map((c) => c.name);
  const touchesOtherEntity = (kw: string) => {
    const kl = kw.toLowerCase();
    return landscape.otherEntities.some((e) => kl.includes(e));
  };

  const row = (kw: string, coveredBy: string[]): D3KeywordRow => ({
    keyword: kw,
    volume: { value: kw2vol.get(kw) ?? 0, basis: "measured" },
    trend: { value: kw2trend.get(kw) ?? 0, basis: "measured" },
    coveredBy,
  });

  const byVolume = (a: string, b: string) => (kw2vol.get(b) ?? 0) - (kw2vol.get(a) ?? 0);

  // 커버리지 통계는 포함 기준(단독 자사명 쿼리도 자사 수요) — 목록은 실행 가능한 결합 쿼리만
  const ourKws = allKeywords.filter((kw) => containsBrandToken(kw, ourAliases));
  const strengths = allKeywords
    .filter((kw) => matchesBrand(kw, ourAliases))
    .sort(byVolume)
    .slice(0, TOP_ROWS)
    .map((kw) => row(kw, coveredByFor(kw)));

  // 경쟁 브랜드 수요 = 경쟁 별칭이 붙은 "결합" 쿼리(matchesBrand — 단독 기업명 쿼리 제외) 중 자사 미포함
  const gaps = allKeywords
    .filter((kw) => !containsBrandToken(kw, ourAliases))
    .map((kw) => ({
      kw,
      coveredBy: competitors.filter((c) => matchesBrand(kw, c.aliases)).map((c) => c.name),
    }))
    .filter((x) => x.coveredBy.length > 0)
    .sort((a, b) => byVolume(a.kw, b.kw))
    .slice(0, TOP_ROWS)
    .map((x) => row(x.kw, x.coveredBy));

  // 열린 기회 = 자사·경쟁 브랜드 토큰도, 기타 기업·기관명도 붙지 않은 키워드만
  const unbranded = allKeywords
    .filter(
      (kw) =>
        !containsBrandToken(kw, ourAliases) &&
        coveredByFor(kw).length === 0 &&
        !touchesOtherEntity(kw),
    )
    .sort(byVolume)
    .slice(0, TOP_ROWS)
    .map((kw) => row(kw, []));

  const ourVolume = ourKws.reduce((s, kw) => s + (kw2vol.get(kw) ?? 0), 0);

  return {
    meta: {
      industry: industry.slug,
      reportCode: "D-3",
      category,
      gl,
      ourBrand,
      totalNodes: landscape.totalNodes,
      nonConsumerExcluded,
      llmModel: landscape.llmModel,
      brandExtraction: landscape.brandExtraction,
      generatedAt: new Date().toISOString(),
    },
    ourCoverage: {
      keywordCount: ourKws.length,
      volume: { value: ourVolume, basis: "derived" },
    },
    strengths,
    competitorGaps: gaps,
    unbrandedOpportunities: unbranded,
    insights: computeInsights(ourBrand, ourKws.length, strengths, gaps, unbranded, landscape.brandExtraction),
    compliance: getComplianceBlock(industry),
    costLog: landscape.costLog,
  };
}

function computeInsights(
  ourBrand: string,
  ourKwCount: number,
  strengths: D3KeywordRow[],
  gaps: D3KeywordRow[],
  unbranded: D3KeywordRow[],
  extraction: "complete" | "partial",
): ReportInsight[] {
  if (extraction === "partial") {
    return [
      {
        kind: "data_gap",
        title: "브랜드 추출 실패 — 재생성 필요",
        body: "경쟁 브랜드 목록이 불완전해 부족 키워드 판정이 왜곡될 수 있습니다. 다시 생성해보세요.",
      },
    ];
  }
  if (ourKwCount === 0) {
    return [
      {
        kind: "data_gap",
        title: `"${ourBrand}" 커버 키워드 없음`,
        body: "자사 별칭이 매칭되는 키워드가 카테고리 그래프에 없습니다. 브랜드 표기를 바꿔 재시도하거나, 이 카테고리에서 자사 검색 존재감이 약하다는 신호일 수 있습니다(표기 확인 우선).",
      },
    ];
  }

  const insights: ReportInsight[] = [];
  if (strengths.length) {
    insights.push({
      kind: "strength",
      title: `자사 최대 강점 쿼리 · "${strengths[0].keyword}"`,
      body: `자사 커버 키워드 ${ourKwCount}개 중 최대 볼륨 · 전환 페이지·콘텐츠 방어 우선 대상`,
    });
  }
  if (gaps.length) {
    insights.push({
      kind: "competitor_demand",
      title: `최대 경쟁 브랜드 수요 · "${gaps[0].keyword}"`,
      body: `${gaps[0].coveredBy.join("·")} 브랜드가 붙은 결합 쿼리 중 최대 볼륨(자사 미포함) · 자사 일반 콘텐츠 공백이 아니라 비교 콘텐츠·SEM 컨퀘스트 검토 대상 (단독 기업명 쿼리는 내비게이션 수요로 보고 제외)`,
    });
  }
  if (unbranded.length) {
    insights.push({
      kind: "open_space",
      title: `열린 논브랜드 쿼리 · "${unbranded[0].keyword}"`,
      body: "어떤 브랜드도 붙지 않은 최대 볼륨 쿼리 · 브랜드 무관 정보 수요라 콘텐츠 선점 여지가 있다는 가정",
    });
  }
  return insights;
}
