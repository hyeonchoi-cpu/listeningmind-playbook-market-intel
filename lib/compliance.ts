// 업권별 컴플라이언스 가드레일 — 단일 소스.
//
// fin-bank/card/insurance/securities 4개 스킬에 바이트 단위로 복제돼 있던 overlay-finance.md 문제
// (docs/market-intelligence-webapp-design.md §5)를 웹앱에서는 여기 하나로 모은다.
// 가드레일 문구 자체는 data/industries.ts의 Industry.guardrailSummary에 이미 업권별로 정리돼 있으므로,
// 이 파일은 그것을 리포트의 ComplianceBlock 형태로 조립하는 얇은 어댑터 역할만 한다 — 문구를 중복 관리하지 않는다.
import type { ComplianceBlock, Industry } from "@/types";

export function getComplianceBlock(industry: Industry): ComplianceBlock {
  return {
    level: industry.complianceLevel,
    guardrails: industry.guardrailSummary,
  };
}
