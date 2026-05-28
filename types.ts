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
