// D-3 · 자사 강점·부족 검색 키워드 — 브랜드 지형 공용 파이프라인의 키워드 수준 확장.
//
// 3개 축으로 나눈다:
//  강점  = 자사 별칭을 포함하는 상위 키워드
//  부족  = 경쟁 브랜드는 커버하는데 자사는 미커버인 상위 키워드
//  기회  = 어떤 브랜드/기업 토큰도 붙지 않은 상위 논브랜드 키워드 (콘텐츠·SEO 열린 공간)
// 분류 판정은 containsBrandToken(부분 문자열 포함 — 단독 기업명 쿼리도 브랜드 연관으로 취급)을 쓴다.
// SoV용 matchesBrand(단독 쿼리 제외)를 여기 쓰면 단독 "삼성"이 논브랜드 기회로 새는 실사례가 있었음.
// 소비자 브랜드가 아닌 기업·기관·종목명(otherEntities — 예: 공급망·주식 맥락 기업)도 논브랜드에서 제외.
import type { Gl } from "@/lib/daas";
import { getComplianceBlock } from "@/lib/compliance";
import { buildBrandLandscape, containsBrandToken } from "./brands-shared";
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
  const { allKeywords, kw2vol, kw2trend } = landscape;

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

  const ourKws = allKeywords.filter((kw) => containsBrandToken(kw, ourAliases));
  const strengths = [...ourKws].sort(byVolume).slice(0, TOP_ROWS).map((kw) => row(kw, coveredByFor(kw)));

  const gaps = allKeywords
    .filter((kw) => !containsBrandToken(kw, ourAliases))
    .map((kw) => ({ kw, coveredBy: coveredByFor(kw) }))
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
      kind: "gap",
      title: `최대 부족 쿼리 · "${gaps[0].keyword}"`,
      body: `${gaps[0].coveredBy.join("·")}는 커버하는데 자사 별칭이 없는 최대 볼륨 쿼리 · 자사 연관 콘텐츠/캠페인 공백 후보 (검색 커버리지 기준 근사)`,
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
