// 리포트 코드 → 생성 함수 매핑. lima-agents scripts/run_analysis.py의 CODE_TO_FOLDER 이식.
// 새 코드를 붙일 때: 여기 한 줄 + data/report-codes.ts status 플립 + components/report/ReportGenerateForm.tsx의
// REPORT_VIEWS에 뷰 등록, 세 곳이면 끝.
import type { Gl } from "@/lib/daas";
import type { Industry } from "@/types";
import { generateA1Report } from "./a1-volume-trend";
import { generateA2Report } from "./a2-demography";
import { generateA3Report } from "./a3-search-intent";
import { generateB1Report } from "./b1-segment-intent";
import { generateC1Report } from "./c1-rising-brand";
import { generateC2Report } from "./c2-share-of-search";
import { generateC3Report } from "./c3-conversion-path";
import { generateC4Report } from "./c4-painpoint";
import { generateD1Report } from "./d1-cep-preemption";
import { generateD3Report } from "./d3-strength-gap";
import { generateD4Report } from "./d4-rising-cep";

export type ReportGenerator = (input: {
  industry: Industry;
  category: string;
  gl: Gl;
  /** C-2(자사 브랜드, 필수)·C-4(선택)에서 사용 — 나머지 코드는 무시 */
  brand?: string;
}) => Promise<unknown>;

export const REPORT_GENERATORS: Record<string, ReportGenerator> = {
  "A-1": generateA1Report,
  "A-2": generateA2Report,
  "A-3": generateA3Report,
  "B-1": generateB1Report,
  "C-1": generateC1Report,
  "C-2": generateC2Report,
  "C-3": generateC3Report,
  "C-4": generateC4Report,
  "D-1": generateD1Report,
  "D-3": generateD3Report,
  "D-4": generateD4Report,
};

export function getReportGenerator(code: string): ReportGenerator | null {
  return REPORT_GENERATORS[code] ?? null;
}
