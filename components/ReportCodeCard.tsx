import Link from "next/link";
import type { IndustrySlug, ReportCode } from "@/types";
import { caseExampleFor } from "@/data/report-codes";
import { StatusBadge } from "./StatusBadge";

export function ReportCodeCard({ code, industry }: { code: ReportCode; industry: IndustrySlug }) {
  // P 밴드는 제목을 제너럴하게 유지하고(카테고리/브랜드명 금지) 업권별 적용 예시를 별도 줄로 보여준다
  const example = caseExampleFor(code, industry);
  return (
    <Link href={`/industries/${industry}/${code.code}`} className="report-card" data-status={code.status}>
      <div className="report-card-top">
        <span className="report-card-code">{code.code}</span>
        <StatusBadge status={code.status} />
      </div>
      <h4 className="report-card-title">{code.title}</h4>
      {example && (
        <p className="report-card-example">
          예: {example.keyword} — {example.scenario}
        </p>
      )}
      <p className="report-card-data">{code.dataNeeds}</p>
    </Link>
  );
}
