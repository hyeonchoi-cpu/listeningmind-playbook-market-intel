import type { ReportStatus } from "@/types";

const LABEL: Record<ReportStatus, string> = {
  implemented: "이용 가능",
  planned: "준비 중",
  unsupported: "미지원",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`status-badge status-${status}`}>{LABEL[status]}</span>;
}
