import type { A2RatioRow, A2Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

function RatioBars({ rows }: { rows: A2RatioRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.ratioPct.value));
  return (
    <div className="segment-bar-group">
      {rows.map((r) => (
        <div key={r.key} className="segment-bar-row">
          <span className="segment-bar-label">{r.label}</span>
          <div className="segment-bar-track">
            <div className="segment-bar-fill" style={{ width: `${(r.ratioPct.value / max) * 100}%` }} />
          </div>
          <span className="segment-bar-value">
            {r.ratioPct.basis === "missing" ? "—" : `${r.ratioPct.value}%`} <LabelBadge basis={r.ratioPct.basis} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function A2ReportView({ report }: { report: A2Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.keyword} · {report.meta.gl.toUpperCase()} · 월평균 검색량 {report.volumeAvg.value.toLocaleString()}
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {!report.meta.demographyAvailable && (
        <div className="generate-form-error" style={{ marginBottom: 20 }}>
          <strong>이 키워드는 인구통계 데이터가 없습니다</strong> — {report.meta.gl.toUpperCase()} 시장에서 이
          키워드의 성별·연령 태깅이 비어 있습니다. 아래 값은 &ldquo;0%&rdquo;가 아니라 <strong>측정 불가</strong>
          입니다. ListeningMind DaaS의 인구통계 태깅은 KR 중심 커버리지입니다 — KR로 다시 시도해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">검색자 분포</div>
        <div className="method-grid">
          <div>
            <div className="segment-bar-kind">성별</div>
            <RatioBars rows={report.gender} />
          </div>
          <div>
            <div className="segment-bar-kind">연령</div>
            <RatioBars rows={report.age} />
          </div>
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
