// 비소비 맥락(주식·취업 등) 키워드 필터 — 결정론적 토큰 사전 방식.
//
// hop=2 클러스터에는 카테고리 주변의 주식(관련주·주가)·취업(채용·면접) 맥락 키워드가 섞여 들어와
// "논브랜드 기회"나 "라이징 아이템"으로 오인되는 실사례가 있었다 (예: oled tv 클러스터의 "oled 관련주").
// LLM 호출 없이 토큰 포함 여부로만 판정한다 — 빠르고 무료이며 결과가 결정론적이라 방법론 주석에
// 그대로 공개할 수 있다. 단, 부분 문자열 매칭 기반 근사이므로 각 리포트는 이 필터를 "가정"으로 명시한다.
//
// 업권 인지형: 증권 업권에서는 주식 토큰이 곧 소비자 카테고리이므로 제외하면 안 되고,
// 금융 4업권에서는 연봉·실수령 류가 소비자 검색(대출·카드 한도 등)과 붙어 다니므로 면제한다.
// 토큰 선정 원칙: 오탐(소비 키워드를 잘못 제외)이 의심되는 짧고 중의적인 토큰은 넣지 않는다
// — 예: "주식"(主食과 중의), "매수"("구매수요"에 부분 매칭), "저평가"(제품 리뷰 표현 가능).
import type { IndustrySlug } from "@/types";

const STOCK_TOKENS = [
  "주가",
  "관련주",
  "종목",
  "배당",
  "상장",
  "공모주",
  "시가총액",
  "목표주가",
  "테마주",
  "수혜주",
  "코스피",
  "코스닥",
];

const JOB_TOKENS = ["채용", "취업", "면접", "자소서", "자기소개서", "인턴"];

const SALARY_TOKENS = ["연봉", "월급", "실수령"];

export function nonConsumerTokensFor(industry: IndustrySlug): string[] {
  const tokens = [...JOB_TOKENS];
  // 증권 업권은 주식 토큰이 소비자 카테고리 그 자체 — 제외하지 않는다
  if (industry !== "fin-securities") tokens.push(...STOCK_TOKENS);
  // 금융 업권은 연봉·실수령 류가 소비자 검색(대출 한도, 카드 발급 요건 등)과 붙어 다닌다
  if (!industry.startsWith("fin-")) tokens.push(...SALARY_TOKENS);
  return tokens;
}

/** 키워드가 비소비 맥락(주식·취업 등) 토큰을 포함하는가 — 부분 문자열 기준 근사(가정) */
export function isNonConsumerKeyword(keyword: string, industry: IndustrySlug): boolean {
  const kl = keyword.toLowerCase();
  return nonConsumerTokensFor(industry).some((t) => kl.includes(t));
}
