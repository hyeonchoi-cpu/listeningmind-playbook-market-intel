// 리포트 코드 → 생성 함수 매핑. lima-agents scripts/run_analysis.py의 CODE_TO_FOLDER 이식.
// Phase 3에서 새 코드를 붙일 때 여기 한 줄만 추가하면 된다 (라우트/UI는 data/report-codes.ts의
// status만 "implemented"로 바꾸면 자동으로 연결됨).
import type { Gl } from "@/lib/daas";
import type { Industry } from "@/types";
import { generateB1Report } from "./b1-segment-intent";

export type ReportGenerator = (input: { industry: Industry; category: string; gl: Gl }) => Promise<unknown>;

export const REPORT_GENERATORS: Record<string, ReportGenerator> = {
  "B-1": generateB1Report,
};

export function getReportGenerator(code: string): ReportGenerator | null {
  return REPORT_GENERATORS[code] ?? null;
}
