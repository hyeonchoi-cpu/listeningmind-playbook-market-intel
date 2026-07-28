import type { ComplianceBlock } from "@/types";

export function ComplianceFooter({ compliance }: { compliance: ComplianceBlock }) {
  return (
    <div className={`compliance-block${compliance.level === "finance" ? " finance" : ""}`}>
      <strong>이 리포트에 적용된 가드레일</strong>
      <ul>
        {compliance.guardrails.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
    </div>
  );
}
