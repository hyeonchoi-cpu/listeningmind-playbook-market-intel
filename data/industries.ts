import type { Industry } from "@/types";

/**
 * 인더스트리 카탈로그 — Phase 1 목업.
 *
 * lima-agents(범용) + 7개 버티컬 오버레이 스킬(cosmetics·health-supplements·appliance·fin-bank/card/insurance/securities)의
 * 페르소나·엔티티사전·컴플라이언스 가드레일을 코드가 아니라 설정 데이터로 옮긴 것.
 * 상세: docs/market-intelligence-webapp-design.md §3.1, §5
 *
 * guardrailSummary는 원본 스킬의 컴플라이언스 규칙 요약이며, 전문은 각 스킬의
 * `_shared-core.md` / `overlay-finance.md` / `overlay-*.md` 원본을 참고할 것.
 */
export const industries: Industry[] = [
  {
    slug: "universal",
    label: "범용 · 업권 무관",
    shortLabel: "Universal",
    color: "teal",
    eyebrow: "For Any Category",
    tagline:
      "업권이 특정되지 않았을 때의 기본 표준 — 7 표준잡과 4개 커넥터(keyword_info·intent_finder·cluster_finder·path_finder)를 그대로 적용합니다.",
    complianceLevel: "standard",
    entityDictionaryLabel: "카테고리별 자유 엔티티 (고정 사전 없음)",
    guardrailSummary: [
      "실측/파생/가정/데이터없음 4라벨 규율 준수",
      "알고리즘이 제공하지 않은 등급·순위 표현 생성 금지",
      "검색량 ≠ 실제 판매/시장점유율",
    ],
    skillRef: "listeningmind-universal",
  },
  {
    slug: "cosmetics",
    label: "화장품 · 뷰티",
    shortLabel: "Cosmetics",
    color: "purple",
    eyebrow: "For Cosmetics & Beauty",
    tagline: "성분·효능 검색 수요와 CEP(소비 상황) 인식 군집을 근거 기반으로 분석합니다.",
    complianceLevel: "standard",
    entityDictionaryLabel: "브랜드·성분 엔티티 사전",
    guardrailSummary: [
      "효능·효과 단정 표현 금지 — 검색 관심도로만 서술",
      "화장품법 표시광고 가이드라인 저촉 소지 문구 회피",
      "성분 안전성 관련 수치는 공인 자료만 인용",
    ],
    skillRef: "listeningmind-cosmetics",
  },
  {
    slug: "health-supplements",
    label: "건강기능식품",
    shortLabel: "Health Supplements",
    color: "green",
    eyebrow: "For Health & Functional Food",
    tagline: "기능성 원료·건강 고민 검색 행동을 규제 맥락과 함께 해석합니다.",
    complianceLevel: "standard",
    entityDictionaryLabel: "원료·기능성 엔티티 사전",
    guardrailSummary: [
      "질병 예방·치료 효능 단정 금지 (건강기능식품법 준수)",
      "인정받지 않은 기능성 표현 회피",
      "검색 관심 ≠ 실제 섭취/구매",
    ],
    skillRef: "listeningmind-health-supplements",
  },
  {
    slug: "appliance",
    label: "가전",
    shortLabel: "Appliance",
    color: "green",
    eyebrow: "For Home Appliances",
    tagline:
      "이사·혼수·고장교체·시즌 진입(냉방·제습) 등 생활 이벤트 트리거와 스펙·안전 근거를 바탕으로 가전 시장을 분석합니다.",
    complianceLevel: "standard",
    entityDictionaryLabel: "브랜드·카테고리·스펙 엔티티 사전 (에너지효율·소음·용량 등)",
    guardrailSummary: [
      "스펙 수치(에너지효율등급·소비전력·용량·소음 dB)는 제조사 공시/공식 출처만 인용",
      "안전인증(KC)·리콜 이력은 공식 출처만 인용",
      "위생·건강 표현(살균·초미세먼지 제거 등)은 근거 유형(제조사 주장/공인시험/시험조건/근거불명)으로 라벨링 — 의학적 효능 전환 금지",
    ],
    skillRef: "listeningmind-appliance",
  },
  {
    slug: "fin-bank",
    label: "은행",
    shortLabel: "Bank",
    color: "blue",
    eyebrow: "For Retail Banking",
    tagline: "수신·여신·디지털뱅킹 상품에 대한 검색 수요·여정·경쟁 구도를 분석합니다.",
    complianceLevel: "finance",
    entityDictionaryLabel: "은행·상품 브랜드 사전",
    guardrailSummary: [
      "권유·단정 표현 금지, 금리·수익률·원금 수치는 공시값만 인용",
      "생성 카피는 '심의+준법검토 전 초안'으로 명시",
      "개인정보·마이데이터 미사용 — 집계 검색 데이터만 사용",
      "SoV는 '검색량 기준 근사'로 표기",
    ],
    skillRef: "fin-bank",
  },
  {
    slug: "fin-card",
    label: "카드",
    shortLabel: "Card",
    color: "yellow",
    eyebrow: "For Card Issuers",
    tagline: "연회비·혜택·간편결제 비교 검색과 발급 여정 이탈 구간을 분석합니다.",
    complianceLevel: "finance",
    entityDictionaryLabel: "카드사·페이 브랜드 사전",
    guardrailSummary: [
      "혜택·연회비·한도 수치는 공시/약관값만 인용",
      "생성 카피는 '여신금융협회 심의+준법검토 전 초안' 명시",
      "검색 ≠ 실제 발급/이용",
    ],
    skillRef: "fin-card",
  },
  {
    slug: "fin-insurance",
    label: "보험",
    shortLabel: "Insurance",
    color: "red",
    eyebrow: "For Insurance",
    tagline: "다이렉트 비교 여정, 갱신·해지, 실손·연금 등 상품별 검색 니즈를 분석합니다.",
    complianceLevel: "finance",
    entityDictionaryLabel: "보험사·상품 브랜드 사전",
    guardrailSummary: [
      "가입 권유·단정 금지, 보장·보험료 수치는 공시/약관값만 인용",
      "생성 카피는 '생명/손해보험협회 심의+준법검토 전 초안' 명시",
      "규제·시즌 임팩트는 인과 단정 대신 상관·동향으로 서술",
    ],
    skillRef: "fin-insurance",
  },
  {
    slug: "fin-securities",
    label: "증권",
    shortLabel: "Securities",
    color: "blue",
    eyebrow: "For Retail Brokerage",
    tagline: "계좌개설·ISA·연금·ETF 관심과 MTS 브랜드 비교 여정을 분석합니다.",
    complianceLevel: "finance",
    entityDictionaryLabel: "증권사·MTS 브랜드 사전",
    guardrailSummary: [
      "수익률/원금 보장 표현 금지 — 과거 수익률이 미래를 보장하지 않음 병기",
      "생성 카피는 '금융투자협회 심의+준법검토 전 초안' 명시",
      "검색은 관심 신호일 뿐 실제 계좌개설·거래가 아님",
    ],
    skillRef: "fin-securities",
  },
];

export const industryBySlug = (slug: string) => industries.find((i) => i.slug === slug);
