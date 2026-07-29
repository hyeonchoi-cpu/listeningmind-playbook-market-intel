import type { IndustrySlug, ReportCode, ReportBand } from "@/types";

/**
 * 리포트 코드 카탈로그 — Phase 1 목업.
 *
 * 출처: lima-agents 스킬 `references/question-frame.md` (마케팅팀 표준 질문 프레임 A~D + 퍼블리시스 실전 케이스, 총 18개)를 그대로 이식.
 * status: implemented = lib/reports/registry.ts에 생성기 존재 (현재 16/18 — D-2·P-2a만 미지원), 나머지는 "준비 중"/"미지원".
 * connectors는 "필요 데이터" 컬럼에서 명시적으로 언급된 DaaS 커넥터만 매핑한 것으로, WebSearch·외부 SERP 스킬처럼
 * DaaS 4커넥터 밖의 소스는 connectors에 넣지 않고 dataNeeds 원문으로만 표시한다(추측 표기 금지).
 *
 * 모든 업권이 동일한 18개 코드 카탈로그를 공유한다 — 업권이 달라지는 것은 페르소나/엔티티사전/컴플라이언스이지
 * "어떤 질문 코드가 존재하는가"가 아니기 때문 (docs/market-intelligence-webapp-design.md §3.1 참고).
 */

const BAND_TITLE: Record<ReportBand, string> = {
  A: "시장 흐름",
  B: "타겟 심층",
  C: "브랜드 맵",
  D: "전략 제안",
  P: "퍼블리시스 실전 케이스",
};

export const reportCodes: ReportCode[] = [
  // ─────────── A · 시장 흐름 ───────────
  {
    code: "A-1",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "메인 키워드 월별 검색량 추이·전년 대비 증감",
    dataNeeds: "keyword_info.monthly_volume",
    templateFolder: "a1-volume-trend",
    status: "implemented",
    connectors: ["keyword_info"],
  },
  {
    code: "A-2",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "메인 키워드 검색자 성별·연령 분포",
    dataNeeds: "keyword_info.demography",
    templateFolder: "a2-demography",
    status: "implemented",
    connectors: ["keyword_info"],
  },
  {
    code: "A-3",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "소비자 검색 목적·인텐트",
    dataNeeds: "cluster_finder + CEP 7W",
    templateFolder: "a3-search-intent",
    status: "implemented",
    // 구현이 볼륨·인텐트 플래그 확보를 위해 keyword_info도 호출 — 원문 표(cluster_finder + CEP 7W)에 실제 사용 커넥터를 추가
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "A-4",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "인지→구매 검색 경로",
    dataNeeds: "path_finder",
    templateFolder: "a4-search-path",
    status: "implemented",
    connectors: ["path_finder"],
  },
  {
    code: "A-5",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "브랜드 비보조 인지도 (검색 점유율)",
    dataNeeds: "cluster_finder + WebSearch",
    templateFolder: "a5-brand-awareness",
    status: "implemented",
    // 구현이 볼륨 확보를 위해 keyword_info도 호출. WebSearch 검증은 LLM 추출+키워드 재검증으로 대체(방법론 편차 — 리포트에 명시)
    connectors: ["cluster_finder", "keyword_info"],
  },

  // ─────────── B · 타겟 심층 ───────────
  {
    code: "B-1",
    band: "B",
    bandTitle: BAND_TITLE.B,
    title: "연령별·성별 관심사·KBF 차이",
    dataNeeds: "cluster_finder + keyword_info.demography + CEP HOW_FEEL",
    templateFolder: "b1-segment-intent",
    status: "implemented",
    connectors: ["cluster_finder", "keyword_info"],
  },

  // ─────────── C · 브랜드 맵 ───────────
  {
    code: "C-1",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "라이징·경쟁 브랜드",
    dataNeeds: "detected_entities.brands · volume_trend",
    templateFolder: "c1-rising-brand",
    status: "implemented",
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "C-2",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "자사 vs 경쟁 검색 점유율",
    dataNeeds: "detected_entities · volume",
    templateFolder: "c2-share-of-search",
    status: "implemented",
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "C-3",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "자사 검색 전환·이탈 구간",
    dataNeeds: "path_finder",
    templateFolder: "c3-conversion-path",
    status: "implemented",
    connectors: ["path_finder"],
  },
  {
    code: "C-4",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "자사·경쟁 페인포인트·부정 키워드",
    dataNeeds: "CEP HOW_FEEL 부작용·우려 서브그룹",
    templateFolder: "c4-painpoint",
    status: "implemented",
    // 구현이 볼륨 확보를 위해 keyword_info도 호출
    connectors: ["cluster_finder", "keyword_info"],
  },

  // ─────────── D · 전략 제안 ───────────
  {
    code: "D-1",
    band: "D",
    bandTitle: BAND_TITLE.D,
    title: "카테고리 선점 CEP",
    dataNeeds: "cluster_finder + CEP 7W 전체",
    templateFolder: "d1-cep-preemption",
    status: "implemented",
    // 구현이 볼륨 확보를 위해 keyword_info도 호출
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "D-2",
    band: "D",
    bandTitle: BAND_TITLE.D,
    title: "검색 여정 노출 점유율 도메인",
    dataNeeds: "SERP·serp-analyzer 스킬",
    templateFolder: "d2-serp-share",
    status: "unsupported",
    connectors: [],
  },
  {
    code: "D-3",
    band: "D",
    bandTitle: BAND_TITLE.D,
    title: "자사 강점·부족 검색 키워드",
    dataNeeds: "detected_entities + volume",
    templateFolder: "d3-strength-gap",
    status: "implemented",
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "D-4",
    band: "D",
    bandTitle: BAND_TITLE.D,
    title: "함께 검색되는 라이징 CEP·연관 아이템",
    dataNeeds: "CEP WITH_WHAT + rels",
    templateFolder: "d4-rising-cep",
    status: "implemented",
    // 구현이 볼륨·트렌드 확보를 위해 keyword_info도 호출
    connectors: ["cluster_finder", "keyword_info"],
  },

  // ─────────── P · 퍼블리시스 실전 케이스 (일반 템플릿으로 승격 — 원 케이스는 caseBrand로 출처 표기) ───────────
  {
    code: "P-1a",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "소비 맥락 이동",
    dataNeeds: "CEP WHY·WHILE·WITH_WHAT · time_point 대조",
    templateFolder: "p1a-context-shift",
    status: "implemented",
    // 구현이 볼륨 확보를 위해 keyword_info도 호출 (curr·12m 두 시점 — 크레딧 약 2배)
    connectors: ["cluster_finder", "keyword_info"],
    caseBrand: "Theraflu",
    industryExamples: {
      universal: { keyword: "감기약", scenario: "원 케이스(Theraflu) — 소비 맥락이 어떤 상황으로 이동했는지 시점 대조" },
      cosmetics: { keyword: "선크림", scenario: "여름 자외선 차단 → 사계절 데일리 케어로의 맥락 이동" },
      "health-supplements": { keyword: "유산균", scenario: "장 건강 → 면역·다이어트 등 인접 맥락으로의 확장" },
      appliance: { keyword: "에어컨", scenario: "여름 냉방 → 제습·공기청정 등 사계절 공조 맥락 이동" },
      "fin-bank": { keyword: "파킹통장", scenario: "금리 국면 변화 전후 수요 맥락 이동 (상관·동향 서술)" },
      "fin-card": { keyword: "간편결제", scenario: "온라인 결제 → 오프라인·해외 결제 맥락 확장" },
      "fin-insurance": { keyword: "실손보험", scenario: "제도 개편 전후 인식 맥락 이동 (상관·동향 서술)" },
      "fin-securities": { keyword: "ISA", scenario: "세제 이슈 전후 관심 맥락 이동 (상관·동향 서술)" },
    },
  },
  {
    code: "P-1b",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "시즌 지속성",
    dataNeeds: "monthly_volume 48개월",
    templateFolder: "p1b-season-persistence",
    status: "implemented",
    connectors: ["keyword_info"],
    caseBrand: "Theraflu",
    industryExamples: {
      universal: { keyword: "테라플루", scenario: "원 케이스 — 겨울 시즌 수요가 여름에도 지속되는지" },
      cosmetics: { keyword: "선크림", scenario: "여름 피크 수요의 비수기 지속성" },
      "health-supplements": { keyword: "홍삼", scenario: "명절 시즌 수요의 평시 지속성" },
      appliance: { keyword: "제습기", scenario: "장마 피크 수요의 비수기 지속성" },
      "fin-bank": { keyword: "전세대출", scenario: "이사철 수요의 비수기 지속성" },
      "fin-card": { keyword: "트래블카드", scenario: "휴가 시즌 수요의 연중 지속성" },
      "fin-insurance": { keyword: "자동차보험", scenario: "갱신 시즌 반복성과 비수기 수요" },
      "fin-securities": { keyword: "IRP", scenario: "연말정산 시즌 수요의 연중 지속성" },
    },
  },
  {
    code: "P-2a",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "카테고리 진입 트리거",
    dataNeeds: "path_finder REVERSE",
    templateFolder: null,
    status: "unsupported",
    connectors: ["path_finder"],
    caseBrand: "Otrivin",
  },
  {
    code: "P-2b",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "Pain point 분석",
    dataNeeds: "CEP HOW_FEEL + 특정 노드 이웃",
    templateFolder: "p2b-brand-concern",
    status: "implemented",
    // C-4 페인포인트 파이프라인의 브랜드 시드 변형 — keyword_info도 호출
    connectors: ["cluster_finder", "keyword_info"],
    caseBrand: "Otrivin",
    industryExamples: {
      universal: { keyword: "오트리빈", scenario: "원 케이스 — 부작용·성분 우려 구조 분해" },
      cosmetics: { keyword: "레티놀", scenario: "자극·트러블 우려 구조 분해" },
      "health-supplements": { keyword: "다이어트 보조제", scenario: "부작용·안전성 우려 구조 분해" },
      appliance: { keyword: "로봇청소기", scenario: "소음·고장·A/S 우려 구조 분해" },
      "fin-bank": { keyword: "인터넷은행", scenario: "안정성·보안 우려 구조 분해" },
      "fin-card": { keyword: "리볼빙", scenario: "수수료·신용영향 우려 구조 분해" },
      "fin-insurance": { keyword: "실손보험", scenario: "갱신료·지급 우려 구조 분해" },
      "fin-securities": { keyword: "레버리지 ETF", scenario: "원금 손실·변동성 우려 구조 분해" },
    },
  },
];

/** P 코드의 업권별 예시 조회 — 해당 업권 항목이 없으면 universal 폴백 */
export const caseExampleFor = (code: ReportCode, slug: IndustrySlug) =>
  code.industryExamples?.[slug] ?? code.industryExamples?.universal;

export const reportCodeByCode = (code: string) =>
  reportCodes.find((r) => r.code.toLowerCase() === code.toLowerCase());

export const reportCodesByBand = (band: ReportBand) => reportCodes.filter((r) => r.band === band);

export const BANDS: ReportBand[] = ["A", "B", "C", "D", "P"];
