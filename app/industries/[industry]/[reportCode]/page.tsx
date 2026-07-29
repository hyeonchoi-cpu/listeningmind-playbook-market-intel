import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportGenerateForm } from "@/components/report/ReportGenerateForm";
import { industries, industryBySlug } from "@/data/industries";
import { reportCodes, reportCodeByCode, caseExampleFor } from "@/data/report-codes";

export function generateStaticParams() {
  return industries.flatMap((i) =>
    reportCodes.map((r) => ({ industry: i.slug, reportCode: r.code }))
  );
}

export function generateMetadata({
  params,
}: {
  params: { industry: string; reportCode: string };
}) {
  const industry = industryBySlug(params.industry);
  const code = reportCodeByCode(params.reportCode);
  if (!industry || !code) return {};
  return {
    title: `${code.code} · ${code.title} · ${industry.label} · ListeningMind Playbook`,
    description: code.title,
  };
}

export default function ReportCodePage({
  params,
}: {
  params: { industry: string; reportCode: string };
}) {
  const industry = industryBySlug(params.industry);
  const code = reportCodeByCode(params.reportCode);
  if (!industry || !code) notFound();

  const isImplemented = code.status === "implemented";
  const fallbackCode = reportCodeByCode("B-1");
  const example = caseExampleFor(code, industry.slug);

  return (
    <>
      <TopNav />
      <main className="page" style={{ marginTop: 0 }}>
        <Breadcrumb
          items={[
            { label: "Industries", href: "/industries" },
            { label: industry.label, href: `/industries/${industry.slug}` },
            { label: code.code },
          ]}
        />

        <div className="detail-eyebrow">
          <span className="num">{code.code}</span>
          {code.bandTitle} · {industry.label}
        </div>
        <h1 className="detail-title">{code.title}</h1>
        {code.caseBrand && (
          <p className="detail-desc" style={{ marginBottom: 8 }}>
            퍼블리시스 원 케이스 출처: <strong>{code.caseBrand}</strong>
            {example && (
              <>
                {" "}
                · {industry.label} 적용 예시: <strong>{example.keyword}</strong> — {example.scenario}
              </>
            )}
          </p>
        )}

        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Status</span>
            <span className="detail-meta-value">
              <StatusBadge status={code.status} />
            </span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">필요 데이터</span>
            <span className="detail-meta-value">{code.dataNeeds}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Connectors</span>
            <span className="detail-meta-value">
              <span className="chip-row">
                {code.connectors.length > 0 ? (
                  code.connectors.map((c) => (
                    <span key={c} className="persona-chip">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="persona-chip">DaaS 외부 소스</span>
                )}
              </span>
            </span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Template Folder</span>
            <span className="detail-meta-value">
              {code.templateFolder ? `reports/${code.templateFolder}` : "미정"}
            </span>
          </div>
        </div>

        {isImplemented ? (
          <div className="detail-section">
            <div className="detail-section-title">리포트 생성</div>
            <ReportGenerateForm industry={industry} code={code} />
          </div>
        ) : (
          <div className="detail-section">
            <div className="mock-banner">
              <strong>이 질문은 곧 준비 예정입니다.</strong>{" "}
              {code.status === "unsupported"
                ? "현재 DaaS 4커넥터 밖의 데이터가 필요해 지원 계획이 없습니다."
                : "대신 지금 이용 가능한 B-1(연령별·성별 세그먼트 인텐트)을 확인해보세요."}
              {code.status !== "unsupported" && fallbackCode && (
                <>
                  {" "}
                  <Link href={`/industries/${industry.slug}/${fallbackCode.code}`} style={{ fontWeight: 600 }}>
                    B-1 보러가기 →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <div className={`compliance-block${industry.complianceLevel === "finance" ? " finance" : ""}`}>
          <strong>{industry.label} 리포트에 항상 적용되는 가드레일</strong>
          <ul>
            {industry.guardrailSummary.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>

        <div className="detail-cta">
          <Link href={`/industries/${industry.slug}`} className="secondary">
            ← {industry.label} 카탈로그로
          </Link>
        </div>
      </main>
    </>
  );
}
