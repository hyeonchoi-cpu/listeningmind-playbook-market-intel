import type { IndustrySlug, ReportCode, ReportBand } from "@/types";

/**
 * 리포트 코드 카탈로그 — Phase 1 목업.
 *
 * 출처: lima-agents 스킬 `references/question-frame.md` (마케팅팀 표준 질문 프레임 A~D + 퍼블리시스 실전 케이스, 총 18개)를 그대로 이식.
 * status: implemented = lib/reports/registry.ts에 생성기 존재 (현재 17/18 — D-2만 미지원), 나머지는 "준비 중"/"미지원".
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
  P: "시점·트리거 심층",
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
    industryExamples: {
      appliance: { keyword: "에어컨", scenario: "여름 냉방 → 제습·공기청정 등 사계절 공조 맥락 이동" },
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
    industryExamples: {
      appliance: { keyword: "제습기", scenario: "장마 피크 수요의 비수기 지속성" },
    },
  },
  {
    code: "P-2a",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "카테고리 진입 트리거",
    dataNeeds: "path_finder REVERSE",
    // 전용 REVERSE 모드는 API에 없지만, 표준 응답의 경로에 시드로 "도착"하는 시퀀스가 포함됨을
    // 실측으로 확인(2026-07-29) — 시드 이전 구간 분석으로 구현
    templateFolder: "p2a-entry-trigger",
    status: "implemented",
    connectors: ["path_finder"],
    industryExamples: {
      appliance: { keyword: "제습기", scenario: "어떤 생활 문제 검색(곰팡이·결로 등)이 제습기 탐색으로 이어지나" },
    },
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
    industryExamples: {
      appliance: { keyword: "로봇청소기", scenario: "소음·고장·A/S 우려 구조 분해" },
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


// ═══ LM Material — 표준 용어 배지 (헤딩 어휘 원칙: 친화 한국어 + 비즈니스 용어 병기) ═══
export const CODE_TERMS: Record<string, string> = {
  "A-1": "Demand", "A-2": "Demography", "A-3": "CEP·Intent", "A-4": "CDJ", "A-5": "SoV proxy",
  "B-1": "KBF", "C-1": "SoV·Rising", "C-2": "SoV", "C-3": "CDJ", "C-4": "Pain Point",
  "D-1": "CEP·Opportunity", "D-2": "Positioning", "D-3": "Gap", "D-4": "Rising CEP",
  "P-1a": "Context Shift", "P-1b": "Seasonality", "P-2a": "CEP·Trigger", "P-2b": "Pain Point",
};

// ═══ 연관 분석 제안 — 유저 플로우 4단계: 리포트 생성 후 "다음으로 볼 분석" ═══
// reason은 "왜 이 분석이 다음인가"를 실무 언어로. implemented 코드만 노출된다.
export const CODE_RELATED: Record<string, { code: string; reason: string }[]> = {
  "A-1": [
    { code: "A-3", reason: "수요의 크기를 봤다면, 그 검색이 '어떤 상황·의도'에서 나오는지가 다음 질문" },
    { code: "P-1b", reason: "피크가 반복 시즌인지 일회성인지 — 다년 캘린더로 지속성 검증" },
    { code: "C-2", reason: "이 수요에서 우리 브랜드가 몇 %를 가져가는지 점유율 확인" },
  ],
  "A-2": [
    { code: "B-1", reason: "성·연령 분포를 봤다면, 세그먼트별로 '무엇을 사게 하는가(KBF)'로 심화" },
    { code: "A-3", reason: "인구 축 다음은 의도 축 — 검색 목적·상황(CEP) 구성" },
  ],
  "A-3": [
    { code: "B-1", reason: "전체 인텐트 구성을 세그먼트별로 갈라 타겟 심층으로" },
    { code: "D-1", reason: "발견한 CEP 중 어떤 브랜드도 선점하지 않은 기회 랭킹" },
    { code: "A-4", reason: "의도가 실제 검색 여정에서 어떤 경로로 이어지는지 확인" },
  ],
  "A-4": [
    { code: "C-3", reason: "카테고리 여정을 봤다면, 자사 키워드 기준 유입·유출 구간으로" },
    { code: "P-2a", reason: "여정의 첫 진입 — 어떤 생활 문제가 카테고리를 부르는지" },
  ],
  "A-5": [
    { code: "C-2", reason: "인지 집중도 다음은 점유율 — 자사 vs 경쟁 SoV 정량 비교" },
    { code: "C-1", reason: "지금 인지가 상승 중인 라이징 브랜드 감지" },
  ],
  "B-1": [
    { code: "C-4", reason: "세그먼트가 원하는 것 다음은 막는 것 — 페인포인트 구조" },
    { code: "D-3", reason: "세그먼트 니즈 대비 자사 강점·공백 매핑" },
  ],
  "C-1": [
    { code: "C-2", reason: "라이징 브랜드를 봤다면 자사 포함 전체 점유 구도로" },
    { code: "D-4", reason: "브랜드가 뜨는 배경 — 떠오르는 검색 맥락(CEP) 확인" },
  ],
  "C-2": [
    { code: "C-1", reason: "현재 점유 다음은 변화 — 볼륨 가중 트렌드 상위 라이징 브랜드" },
    { code: "C-4", reason: "점유를 깎는 요인 — 카테고리 페인포인트·부정 키워드" },
    { code: "C-3", reason: "자사 키워드로 들어오고 나가는 여정 — 전환·이탈 구간" },
  ],
  "C-3": [
    { code: "C-4", reason: "이탈 구간의 원인 후보 — 페인포인트 구조로 심화" },
    { code: "A-4", reason: "자사 여정을 카테고리 전체 여정 맥락에 놓고 비교" },
  ],
  "C-4": [
    { code: "P-2b", reason: "카테고리 페인 다음은 자사·특정 브랜드 시드의 우려 심층" },
    { code: "D-3", reason: "페인포인트를 자사 강점·공백 매핑으로 전환" },
  ],
  "D-1": [
    { code: "D-4", reason: "지금의 선점 기회 다음은 커지는 기회 — 라이징 CEP" },
    { code: "D-3", reason: "기회 CEP에서 자사가 가진 강점·비어 있는 공백 확인" },
  ],
  "D-3": [
    { code: "D-1", reason: "공백을 확인했다면 논브랜드 선점 기회 랭킹으로" },
    { code: "C-2", reason: "강점·공백 판단의 기준선 — 현재 점유 구도 재확인" },
  ],
  "D-4": [
    { code: "D-1", reason: "떠오르는 맥락 중 선점 가능한 것의 우선순위화" },
    { code: "C-1", reason: "같은 상승 구간의 라이징 브랜드 — 누가 먼저 움직이나" },
  ],
  "P-1a": [
    { code: "P-1b", reason: "맥락 이동이 시즌 구조의 변화인지 캘린더로 검증" },
    { code: "D-4", reason: "이동한 맥락에서 새로 떠오르는 CEP 확인" },
  ],
  "P-1b": [
    { code: "A-1", reason: "시즌 구조를 봤다면 절대 수요 규모·YoY로 되돌아 확인" },
    { code: "P-1a", reason: "시즌 반복 너머 — 소비 맥락 자체가 이동 중인지 대조" },
  ],
  "P-2a": [
    { code: "A-4", reason: "진입 트리거 이후의 전체 여정 경로 확인" },
    { code: "D-1", reason: "트리거가 된 생활 문제 중 논브랜드 선점 기회 랭킹" },
  ],
  "P-2b": [
    { code: "C-4", reason: "브랜드 우려를 카테고리 공통 페인 구조와 비교" },
    { code: "C-2", reason: "우려가 점유에 미치는 영향 — 현재 SoV 구도 확인" },
  ],
};

export function relatedFor(code: string): { code: ReportCode; reason: string }[] {
  return (CODE_RELATED[code] ?? [])
    .map((r) => ({ code: reportCodeByCode(r.code), reason: r.reason }))
    .filter((r): r is { code: ReportCode; reason: string } => !!r.code && r.code.status === "implemented");
}
