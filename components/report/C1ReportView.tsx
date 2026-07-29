import type { C1Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";
import { BrandTable } from "./BrandTable";

export function C1ReportView({ report }: { report: C1Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  const rising = [...report.brands]
    .filter((b) => b.weightedTrend.basis !== "missing")
    .sort((a, b) => b.weightedTrend.value - a.weightedTrend.value)
    .slice(0, 4);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개 ·
          브랜드 {report.brands.length}개 감지
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.brandExtraction === "partial" && (
        <div className="mock-banner">
          <strong>브랜드 추출 실패</strong> — 실시간 LLM 추출이 재시도 후에도 실패했습니다. 다시 생성해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">라이징 브랜드 (볼륨 가중 트렌드 상위)</div>
        <div className="stat-grid">
          {rising.map((b) => (
            <div key={b.name} className="stat-card">
              <div className="stat-label">{b.name}</div>
              <div className="stat-value">
                {b.weightedTrend.value >= 0 ? "+" : ""}
                {Math.round(b.weightedTrend.value * 1000) / 10}%
              </div>
              <div className="stat-basis">
                점유 {b.sharePct.value}% <LabelBadge basis={b.weightedTrend.basis} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <div className="insight-grid">
          {report.insights.map((ins, i) => (
            <div key={i} className="insight-card">
              <div className="insight-card-title">{ins.title}</div>
              <div className="insight-card-body">{ins.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">브랜드 지형 (볼륨순)</div>
        <BrandTable brands={report.brands} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">비용 로그 (소비량 · 잔액 아님)</div>
        <div className="pricing-table">
          <div className="pricing-row header">
            <span>엔드포인트</span>
            <span>호출 수 · 소비 크레딧</span>
          </div>
          {report.costLog.map((c) => (
            <div key={c.endpoint} className="pricing-row">
              <span className="pricing-label">
                <span className="ep-name">{c.endpoint}</span>
              </span>
              <span className="pricing-value">
                {c.calls}회 · {c.totalCost.toLocaleString()} credits <LabelBadge basis="measured" />
              </span>
            </div>
          ))}
        </div>
      </div>

      <ComplianceFooter compliance={report.compliance} />
    </div>
  );
}
