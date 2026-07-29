// 리포트 코드 → 생성 함수 매핑. lima-agents scripts/run_analysis.py의 CODE_TO_FOLDER 이식.
// 새 코드를 붙일 때: 여기 한 줄 + data/report-codes.ts status 플립 + components/report/ReportGenerateForm.tsx의
// REPORT_VIEWS에 뷰 등록, 세 곳이면 끝.
import type { Gl } from "@/lib/daas";
import type { Industry } from "@/types";
import { generateA1Report } from "./a1-volume-trend";
import { generateA2Report } from "./a2-demography";
import { generateA3Report } from "./a3-search-intent";
import { generateB1Report } from "./b1-segment-intent";

export type ReportGenerator = (input: { industry: Industry; category: string; gl: Gl }) => Promise<unknown>;

export const REPORT_GENERATORS: Record<string, ReportGenerator> = {
  "A-1": generateA1Report,
  "A-2": generateA2Report,
  "A-3": generateA3Report,
  "B-1": generateB1Report,
};

export function getReportGenerator(code: string): ReportGenerator | null {
  return REPORT_GENERATORS[code] ?? null;
}
