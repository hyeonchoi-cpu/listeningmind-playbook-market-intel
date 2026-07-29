export type PersonaCode = "CMO" | "MI" | "MD" | "PM" | "GRO" | "DAT";
export type Band = "discovery" | "intelligence" | "action";
export type ColorTheme = "blue" | "green" | "yellow" | "red" | "purple" | "teal";

export type Card = {
  slug: string;
  number: string; // "01" ... "12"
  band: Band;
  color: ColorTheme;
  isNew?: boolean;
  title: string;
  shortDesc: string;
  personas: PersonaCode[];
  endpoint: string;
  /** SVG path data (inner content) for the icon tile */
  iconSvg: string;
  methodology: {
    dataSource: string;
    algorithm: string;
    fourLabel: string;
    limitations: string;
    sla: string;
  };
  pricing: {
    endpointCost: string;
    avgCallsPerUse: string;
    estMonthlyCost: string;
    plan: string;
    /** 단가 근거가 되는 실측 검증 리포트 출처 (예: "작업1 미국 스틱청소기 검증 리포트, 2026.03") */
    referenceCase?: string;
  };
  /** 샘플 데이터 다운로드 URL (예: /sample-data/map-your-market.csv 또는 외부 URL) */
  sampleDataUrl?: string;
  /** GitHub 스킬 다운로드 URL (repo, release zip, raw 파일 등) */
  githubSkillUrl?: string;
};

export type VerificationReport = {
  report_id: string;
  title: string;
  date: string;
  sample_json_url: string;
  example_md_url: string;
};

export type ProfileRow = { label: string; value: string; isPain?: boolean };

export type TopRanked = {
  cardSlug: string; // links to Card.slug
  why: string;     // persona-specific rationale
};

export type SecondaryRef = {
  cardSlug: string;
  desc: string;    // persona-specific short use
};

export type FlowStep = { num: string; action: string; tool: string };

// ─────────── Industry / Report Catalog (market-intelligence playbook, Phase 1 mockup) ───────────

export type IndustrySlug =
  | "universal"
  | "cosmetics"
  | "health-supplements"
  | "appliance"
  | "fin-bank"
  | "fin-card"
  | "fin-insurance"
  | "fin-securities";

export type ComplianceLevel = "standard" | "finance";

export type Industry = {
  slug: IndustrySlug;
  label: string; // "화장품·뷰티"
  shortLabel: string; // "Cosmetics"
  color: ColorTheme;
  eyebrow: string; // "For Cosmetics & Beauty"
  tagline: string;
  complianceLevel: ComplianceLevel;
  /** 브랜드/성분/기관 등 엔티티 사전에 대한 한 줄 설명 (Phase 2+에서 실제 사전 파일로 연결 예정) */
  entityDictionaryLabel: string;
  /** 이 업권 리포트에 항상 적용되는 컴플라이언스/정직성 가드레일 요약 (전문은 lima-agents 원본 스킬 참고) */
  guardrailSummary: string[];
  /** 이 설정의 출처가 되는 Claude Code 스킬 이름 */
  skillRef: string;
};

export type ReportBand = "A" | "B" | "C" | "D" | "P";
export type ReportStatus = "implemented" | "planned" | "unsupported";
export type DaasConnector = "keyword_info" | "intent_finder" | "cluster_finder" | "path_finder";

export type ReportCode = {
  code: string; // "B-1"
  band: ReportBand;
  bandTitle: string; // "시장 흐름"
  title: string; // 질문 텍스트
  dataNeeds: string; // 원본 표의 "필요 데이터" 컬럼 (그대로 인용)
  templateFolder: string | null; // lima-agents reports/<folder> — 없으면 null
  status: ReportStatus;
  connectors: DaasConnector[];
  /** P(퍼블리시스 실전 케이스) 코드에서만 사용 — 실제 분석 대상 브랜드 */
  caseBrand?: string;
};

// ─────────── Report generation (Phase 2 — B-1 실서비스화) ───────────
// 상세: docs/market-intelligence-webapp-design.md §3.3, §6

/** 실측/파생/가정/데이터없음 4라벨 규율을 타입 레벨에서 강제 (설계 원칙 3) */
export type LabelBasis = "measured" | "derived" | "assumption" | "missing";
export type LabeledValue<T> = { value: T; basis: LabelBasis };

export type ReportGl = "kr" | "us" | "jp";

export type ReportJobStatus = "done" | "failed";

export type ReportJobRecord = {
  jobId: string;
  industry: IndustrySlug;
  reportCode: string;
  category: string;
  gl: ReportGl;
  status: ReportJobStatus;
  createdAt: string;
  reportUrl?: string;
  error?: string;
};

export type ComplianceBlock = {
  level: ComplianceLevel;
  guardrails: string[];
};

export type CostLogEntry = { endpoint: string; calls: number; totalCost: number };

// ── B-1 · 연령별·성별 관심사·KBF 차이 ──
export type B1Segment = {
  key: string;
  label: string;
  kind: "gender" | "age";
  keywordCount: number;
  totalVolume: LabeledValue<number>;
  sharePct: LabeledValue<number>;
};

export type B1TopKeyword = { keyword: string; volume: LabeledValue<number>; trend: LabeledValue<number> };

export type B1KbfEntry = { label: string; volume: LabeledValue<number>; keywordCount: number };

export type B1CrossCell = {
  gender: string;
  age: string;
  volume: LabeledValue<number>;
  keywordCount: number;
  topKeywords: { keyword: string; volume: number }[];
};

export type B1Insight = { kind: string; title: string; body: string };
/** 모든 리포트 코드가 공유하는 인사이트 형태 — B-1이 먼저 정의한 것을 공통 별칭으로 승격 */
export type ReportInsight = B1Insight;

export type B1Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "B-1";
    category: string;
    gl: ReportGl;
    totalNodes: number;
    totalKeywordsWithDemo: number;
    /** totalKeywordsWithDemo / totalNodes * 100 — 인구통계 태깅 커버리지가 시장(gl)마다 크게 달라
     *  (예: US/JP는 거의 0%인 카테고리가 있음) 세그먼트 값을 "0%"가 아니라 "데이터없음"으로 구분하는 데 씀 */
    demographyCoveragePct: number;
    generatedAt: string;
    llmModel: string;
    /** §8 결정 7 — LLM 재시도까지 실패하면 partial로 표시, 리포트 전체는 죽이지 않음 */
    kbfClassification: "complete" | "partial";
  };
  segments: B1Segment[];
  topKeywordsBySegment: Record<string, B1TopKeyword[]>;
  kbfBySegment: Record<string, B1KbfEntry[]>;
  crossMatrix: B1CrossCell[];
  insights: B1Insight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── A-1 · 메인 키워드 월별 검색량 추이·전년 대비 증감 ──
export type A1MonthPoint = { month: string; total: LabeledValue<number> };
export type A1YoyRow = { month: string; current: number; prevYear: number; deltaPct: LabeledValue<number> };

export type A1Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "A-1";
    category: string;
    gl: ReportGl;
    monthsCovered: number;
    generatedAt: string;
  };
  keyword: string;
  volumeAvg: LabeledValue<number>;
  volumeTrend: LabeledValue<number>;
  monthly: A1MonthPoint[];
  yoy: A1YoyRow[];
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── A-2 · 메인 키워드 검색자 성별·연령 분포 ──
export type A2RatioRow = { key: string; label: string; ratioPct: LabeledValue<number> };

export type A2Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "A-2";
    category: string;
    gl: ReportGl;
    /** 이 키워드에 demography 필드 자체가 있는가 — false면 전 항목 missing (KR 외 시장에서 흔함) */
    demographyAvailable: boolean;
    generatedAt: string;
  };
  keyword: string;
  volumeAvg: LabeledValue<number>;
  gender: A2RatioRow[];
  age: A2RatioRow[];
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── A-3 · 소비자 검색 목적·인텐트 (cluster_finder + CEP 7W) ──
export type A3IntentRow = {
  key: "i" | "n" | "c" | "t";
  label: string;
  /** 해당 인텐트 플래그를 보유한 키워드 수 — 플래그는 실측 불리언, 집계는 파생 */
  keywordCount: number;
  volume: LabeledValue<number>;
};

export type A3CepGroup = {
  id: string;
  /** 7W 축 (WHEN/WHERE/WHILE/WITH_WHOM/WITH_WHAT/HOW_FEEL/WHY/UNCLEAR) — LLM 파생 */
  axis: string;
  cepShort: string;
  situation: string;
  keywordCount: number;
  volume: LabeledValue<number>;
  topKeywords: { keyword: string; volume: number }[];
};

export type A3Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "A-3";
    category: string;
    gl: ReportGl;
    totalNodes: number;
    llmModel: string;
    cepClassification: "complete" | "partial";
    generatedAt: string;
  };
  intentMix: A3IntentRow[];
  cepGroups: A3CepGroup[];
  topKeywords: { keyword: string; volume: LabeledValue<number>; flags: string[] }[];
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── C 밴드 공용 · 브랜드 집계 행 ──
export type BrandRow = {
  name: string;
  /** 매칭에 사용된 별칭 (한/영/축약 표기 — 검증 통과분). 투명성 확보용으로 뷰에 노출 */
  aliases: string[];
  /** 별칭을 포함하는 키워드 수 (부분 문자열 매칭 — 근사, 단독 기업명 쿼리는 의도 모호로 제외) */
  keywordCount: number;
  totalVolume: LabeledValue<number>;
  /** 감지된 브랜드 볼륨 합 대비 점유율 — 컴플라이언스 규율상 항상 "검색량 기준 근사"로 표기 */
  sharePct: LabeledValue<number>;
  /** 볼륨 가중 평균 volume_trend */
  weightedTrend: LabeledValue<number>;
  topKeywords: { keyword: string; volume: number; trend: number }[];
  isOurs?: boolean;
};

// ── C-1 · 라이징·경쟁 브랜드 ──
export type C1Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "C-1";
    category: string;
    gl: ReportGl;
    totalNodes: number;
    llmModel: string;
    brandExtraction: "complete" | "partial";
    generatedAt: string;
  };
  /** 볼륨순 정렬 — 라이징 정렬은 뷰에서 weightedTrend 기준 */
  brands: BrandRow[];
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── C-2 · 자사 vs 경쟁 검색 점유율 ──
export type C2Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "C-2";
    category: string;
    gl: ReportGl;
    ourBrand: string;
    totalNodes: number;
    llmModel: string;
    brandExtraction: "complete" | "partial";
    generatedAt: string;
  };
  brands: BrandRow[];
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── C-3 · 자사 검색 전환·이탈 구간 (path_finder) ──
export type C3FlowRow = {
  keyword: string;
  /** 전환 확률 (Markov weight) — path_finder 스펙상 실측 */
  weight: LabeledValue<number>;
  /** 시드(자사) 키워드를 포함하는가 — 이탈/브랜드 내 이동 구분용 근사 플래그 */
  containsSeed: boolean;
};

export type C3StageRow = {
  stage: string;
  nodeCount: number;
};

export type C3Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "C-3";
    category: string; // 시드(자사 브랜드·제품) 키워드
    gl: ReportGl;
    totalNodes: number;
    totalEdges: number;
    generatedAt: string;
  };
  /** 시드 방향으로 들어오는 상위 흐름 (유입 트리거) */
  inflows: C3FlowRow[];
  /** 시드에서 나가는 상위 흐름 — containsSeed=false면 이탈 방향 후보 */
  outflows: C3FlowRow[];
  /** 퍼널 단계 분포 — path_finder 스펙상 stage는 LLM 분류(추정) */
  stages: C3StageRow[];
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

// ── C-4 · 자사·경쟁 페인포인트·부정 키워드 ──
export type C4PainGroup = {
  label: string;
  keywordCount: number;
  volume: LabeledValue<number>;
  topKeywords: { keyword: string; volume: number }[];
  /** 입력한 브랜드명을 포함하는 페인 키워드 수 (브랜드 미입력 시 0) */
  brandKeywordCount: number;
};

export type C4Report = {
  meta: {
    industry: IndustrySlug;
    reportCode: "C-4";
    category: string;
    gl: ReportGl;
    brand: string | null;
    totalNodes: number;
    llmModel: string;
    painClassification: "complete" | "partial";
    generatedAt: string;
  };
  painGroups: C4PainGroup[];
  /** 전체 카테고리 볼륨 대비 페인 키워드 볼륨 비중 — 근사 */
  painSharePct: LabeledValue<number>;
  insights: ReportInsight[];
  compliance: ComplianceBlock;
  costLog: CostLogEntry[];
};

export type Persona = {
  slug: string;          // "cmo"
  code: PersonaCode;
  color: ColorTheme;
  badgeText: string;     // "CMO · BRAND STRATEGY"
  counter: string;       // "01 / 06"
  eyebrow: string;       // "For the Chief Marketing Officer"
  /** Title parts: plain, accent, plain */
  titleParts: { pre: string; accent: string; post: string };
  heroSub: string;
  profile: ProfileRow[];
  questionsLabel: string; // "Questions every quarter"
  questions: string[];
  solutionsTitle: string;
  solutionsMeta: string;
  top3: TopRanked[];
  secondary: SecondaryRef[];
  useCaseEyebrow: string;
  useCaseTitle: string;
  useCaseScenario: string;
  flow: FlowStep[];
  ctaTitlePre: string;
  ctaTitleGrad: string;
  ctaSub: string;
};
