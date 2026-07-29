import type { C4Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

export function C4ReportView({ report }: { report: C4Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  const maxVol = Math.max(1, ...report.painGroups.map((g) => g.volume.value));

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()}
          {report.meta.brand ? ` · 브랜드 "${report.meta.brand}"` : ""} · 노드{" "}
          {report.meta.totalNodes.toLocaleString()}개
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.painClassification === "partial" && (
        <div className="mock-banner">
          <strong>페인포인트 분류 실패</strong> — 실시간 LLM 분류가 재시도 후에도 실패했습니다. 다시
          생성해보세요.
        </div>
      )}

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

      {report.painGroups.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">페인포인트 그룹 (볼륨순)</div>
          <div className="segment-bar-group">
            {report.painGroups.map((g) => (
              <div key={g.label} className="segment-bar-row pain-bar-row">
                <span className="segment-bar-label">{g.label}</span>
                <div className="segment-bar-track">
                  <div className="segment-bar-fill" style={{ width: `${(g.volume.value / maxVol) * 100}%` }} />
                </div>
                <span className="segment-bar-value">
                  {g.volume.value.toLocaleString()} <LabelBadge basis={g.volume.basis} />
                </span>
              </div>
            ))}
          </div>
          <div className="kbf-grid" style={{ marginTop: 16 }}>
            {report.painGroups.map((g) => (
              <div key={g.label} className="kbf-card">
                <div className="kbf-card-title">
                  {g.label}
                  {report.meta.brand && g.brandKeywordCount > 0 && (
                    <span className="persona-chip" style={{ marginLeft: 6 }}>
                      브랜드 연관 {g.brandKeywordCount}
                    </span>
                  )}
                </div>
                <ul className="kbf-card-list">
                  {g.topKeywords.map((k) => (
                    <li key={k.keyword}>
                      <span>{k.keyword}</span>
                      <span className="cep-card-volume">{k.volume.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">페인 비중 (샘플 기준 근사)</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">페인 키워드 볼륨 비중</div>
            <div className="stat-value">
              {report.painSharePct.basis === "missing" ? "—" : `${report.painSharePct.value}%`}
            </div>
            <div className="stat-basis">
              분류 대상 상위 키워드 볼륨 기준 <LabelBadge basis={report.painSharePct.basis} />
            </div>
          </div>
        </div>
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
