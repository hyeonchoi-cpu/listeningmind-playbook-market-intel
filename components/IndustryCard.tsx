import Link from "next/link";
import type { Industry } from "@/types";

export function IndustryCard({ industry }: { industry: Industry }) {
  return (
    <Link href={`/industries/${industry.slug}`} className="industry-card" data-color={industry.color}>
      <div className="industry-card-top">
        <span className="industry-card-eyebrow">{industry.eyebrow}</span>
        {industry.complianceLevel === "finance" && (
          <span className="compliance-badge">금융 컴플라이언스</span>
        )}
      </div>
      <h3 className="industry-card-title">{industry.label}</h3>
      <p className="industry-card-tagline">{industry.tagline}</p>
      <ul className="industry-card-guardrails">
        {industry.guardrailSummary.slice(0, 2).map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <div className="industry-card-foot">
        <span className="industry-card-skill">{industry.skillRef}</span>
        <span className="arrow">→</span>
      </div>
    </Link>
  );
}
