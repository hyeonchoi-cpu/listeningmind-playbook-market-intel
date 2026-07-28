import type { ReportCode, ReportBand } from "@/types";

/**
 * 리포트 코드 카탈로그 — Phase 1 목업.
 *
 * 출처: lima-agents 스킬 `references/question-frame.md` (마케팅팀 표준 질문 프레임 A~D + 퍼블리시스 실전 케이스, 총 18개)를 그대로 이식.
 * status는 원본 표의 "상태" 컬럼을 그대로 반영 — 지금은 B-1만 구현(✅ MVP), 나머지는 "준비 중"/"미지원".
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
    status: "planned",
    connectors: ["keyword_info"],
  },
  {
    code: "A-2",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "메인 키워드 검색자 성별·연령 분포",
    dataNeeds: "keyword_info.demography",
    templateFolder: "a2-demography",
    status: "planned",
    connectors: ["keyword_info"],
  },
  {
    code: "A-3",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "소비자 검색 목적·인텐트",
    dataNeeds: "cluster_finder + CEP 7W",
    templateFolder: "a3-search-intent",
    status: "planned",
    connectors: ["cluster_finder"],
  },
  {
    code: "A-4",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "인지→구매 검색 경로",
    dataNeeds: "path_finder",
    templateFolder: "a4-search-path",
    status: "planned",
    connectors: ["path_finder"],
  },
  {
    code: "A-5",
    band: "A",
    bandTitle: BAND_TITLE.A,
    title: "브랜드 비보조 인지도 (검색 점유율)",
    dataNeeds: "cluster_finder + WebSearch",
    templateFolder: "a5-brand-awareness",
    status: "planned",
    connectors: ["cluster_finder"],
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
    status: "planned",
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "C-2",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "자사 vs 경쟁 검색 점유율",
    dataNeeds: "detected_entities · volume",
    templateFolder: "c2-share-of-search",
    status: "planned",
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "C-3",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "자사 검색 전환·이탈 구간",
    dataNeeds: "path_finder",
    templateFolder: "c3-conversion-path",
    status: "planned",
    connectors: ["path_finder"],
  },
  {
    code: "C-4",
    band: "C",
    bandTitle: BAND_TITLE.C,
    title: "자사·경쟁 페인포인트·부정 키워드",
    dataNeeds: "CEP HOW_FEEL 부작용·우려 서브그룹",
    templateFolder: "c4-painpoint",
    status: "planned",
    connectors: ["cluster_finder"],
  },

  // ─────────── D · 전략 제안 ───────────
  {
    code: "D-1",
    band: "D",
    bandTitle: BAND_TITLE.D,
    title: "카테고리 선점 CEP",
    dataNeeds: "cluster_finder + CEP 7W 전체",
    templateFolder: "d1-cep-preemption",
    status: "planned",
    connectors: ["cluster_finder"],
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
    status: "planned",
    connectors: ["cluster_finder", "keyword_info"],
  },
  {
    code: "D-4",
    band: "D",
    bandTitle: BAND_TITLE.D,
    title: "함께 검색되는 라이징 CEP·연관 아이템",
    dataNeeds: "CEP WITH_WHAT + rels",
    templateFolder: "d4-rising-cep",
    status: "planned",
    connectors: ["cluster_finder"],
  },

  // ─────────── P · 퍼블리시스 실전 케이스 ───────────
  {
    code: "P-1a",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "Theraflu · 감기약 소비 맥락 이동",
    dataNeeds: "CEP WHY·WHILE·WITH_WHAT · time_point 대조",
    templateFolder: null,
    status: "planned",
    connectors: ["cluster_finder"],
    caseBrand: "Theraflu",
  },
  {
    code: "P-1b",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "Theraflu · 여름 시즌 수요 지속성",
    dataNeeds: "monthly_volume 48개월",
    templateFolder: null,
    status: "planned",
    connectors: ["keyword_info"],
    caseBrand: "Theraflu",
  },
  {
    code: "P-2a",
    band: "P",
    bandTitle: BAND_TITLE.P,
    title: "Otrivin · 카테고리 진입 트리거",
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
    title: "Otrivin · 부작용·성분 우려",
    dataNeeds: "CEP HOW_FEEL + 특정 노드 이웃",
    templateFolder: null,
    status: "planned",
    connectors: ["cluster_finder"],
    caseBrand: "Otrivin",
  },
];

export const reportCodeByCode = (code: string) =>
  reportCodes.find((r) => r.code.toLowerCase() === code.toLowerCase());

export const reportCodesByBand = (band: ReportBand) => reportCodes.filter((r) => r.band === band);

export const BANDS: ReportBand[] = ["A", "B", "C", "D", "P"];
