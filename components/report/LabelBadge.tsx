import type { LabelBasis } from "@/types";

const LABEL: Record<LabelBasis, string> = {
  measured: "실측",
  derived: "파생",
  assumption: "가정",
  missing: "데이터없음",
};

export function LabelBadge({ basis }: { basis: LabelBasis }) {
  return <span className={`label-badge label-${basis}`}>{LABEL[basis]}</span>;
}
