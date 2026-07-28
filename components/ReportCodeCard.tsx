import Link from "next/link";
import type { IndustrySlug, ReportCode } from "@/types";
import { StatusBadge } from "./StatusBadge";

export function ReportCodeCard({ code, industry }: { code: ReportCode; industry: IndustrySlug }) {
  return (
    <Link href={`/industries/${industry}/${code.code}`} className="report-card" data-status={code.status}>
      <div className="report-card-top">
        <span className="report-card-code">{code.code}</span>
        <StatusBadge status={code.status} />
      </div>
      <h4 className="report-card-title">{code.title}</h4>
      <p className="report-card-data">{code.dataNeeds}</p>
    </Link>
  );
}
