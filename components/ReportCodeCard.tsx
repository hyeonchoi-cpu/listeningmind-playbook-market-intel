import Link from "next/link";
import type { IndustrySlug, ReportCode } from "@/types";
import { caseExampleFor, CODE_TERMS } from "@/data/report-codes";
import { estimateForCode } from "@/lib/reports/estimate";
import { StatusBadge } from "./StatusBadge";

/** LM Material 리포트 카드 — [코드+용어+상태] → [질문 두괄] → [적용 예시] → [메타: 커넥터·예상 비용(가정)] */
export function ReportCodeCard({ code, industry }: { code: ReportCode; industry: IndustrySlug }) {
  const example = caseExampleFor(code, industry);
  const est = code.status === "implemented" ? estimateForCode(code.code) : null;
  return (
    <Link href={`/industries/${industry}/${code.code}`} className="report-card" data-status={code.status}>
      <div className="report-card-top">
        <span className="report-card-code">{code.code}</span>
        {CODE_TERMS[code.code] && <span className="lm-term">{CODE_TERMS[code.code]}</span>}
        <StatusBadge status={code.status} />
      </div>
      <h4 className="report-card-title">{code.title}</h4>
      {example && (
        <p className="report-card-example">
          예: {example.keyword} — {example.scenario}
        </p>
      )}
      <p className="report-card-data">{code.dataNeeds}</p>
      {est && (
        <div className="report-card-meta">
          <span>{code.connectors.length > 0 ? code.connectors.join(" + ") : "외부 소스"}</span>
          <span>
            예상 {est.daasCreditsRange[0].toLocaleString()}~{est.daasCreditsRange[1].toLocaleString()} 크레딧{" "}
            <em>가정</em>
          </span>
          <span>{est.secondsRange[0]}~{est.secondsRange[1]}초</span>
        </div>
      )}
    </Link>
  );
}
