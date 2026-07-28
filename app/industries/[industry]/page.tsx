import { notFound } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ReportCodeCard } from "@/components/ReportCodeCard";
import { industries, industryBySlug } from "@/data/industries";
import { BANDS, reportCodesByBand } from "@/data/report-codes";

export function generateStaticParams() {
  return industries.map((i) => ({ industry: i.slug }));
}

export function generateMetadata({ params }: { params: { industry: string } }) {
  const industry = industryBySlug(params.industry);
  if (!industry) return {};
  return {
    title: `${industry.label} · 리포트 카탈로그 · ListeningMind Playbook`,
    description: industry.tagline,
  };
}

export default function IndustryPage({ params }: { params: { industry: string } }) {
  const industry = industryBySlug(params.industry);
  if (!industry) notFound();

  return (
    <>
      <TopNav />
      <main className="page" style={{ marginTop: 0 }}>
        <Breadcrumb
          items={[
            { label: "Industries", href: "/industries" },
            { label: industry.label },
          ]}
        />

        <div className="detail-eyebrow">
          <span className="num">{industry.shortLabel}</span>
          {industry.eyebrow}
        </div>
        <h1 className="detail-title">{industry.label} 리포트 카탈로그</h1>
        <p className="detail-desc">{industry.tagline}</p>

        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Skill Ref</span>
            <span className="detail-meta-value">{industry.skillRef}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Entity Dictionary</span>
            <span className="detail-meta-value">{industry.entityDictionaryLabel}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Compliance Level</span>
            <span className="detail-meta-value">
              {industry.complianceLevel === "finance" ? "금융 (강화)" : "표준"}
            </span>
          </div>
        </div>

        <div className={`compliance-block${industry.complianceLevel === "finance" ? " finance" : ""}`}>
          <strong>이 업권 리포트에 항상 적용되는 가드레일</strong>
          <ul>
            {industry.guardrailSummary.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>

        <div style={{ height: 40 }} />

        {BANDS.map((band) => {
          const codes = reportCodesByBand(band);
          if (codes.length === 0) return null;
          return (
            <div key={band} className="band-section">
              <div className="band-header">
                <span className="band-tag">{band}</span>
                <span className="band-title">{codes[0].bandTitle}</span>
              </div>
              <div className="report-grid">
                {codes.map((c) => (
                  <ReportCodeCard key={c.code} code={c} industry={industry.slug} />
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}
