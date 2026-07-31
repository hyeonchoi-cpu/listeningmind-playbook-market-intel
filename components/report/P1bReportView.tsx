import type { P1bReport } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { InsightCards } from "./InsightCards";
import { ComplianceFooter } from "./ComplianceFooter";

export function P1bReportView({ report }: { report: P1bReport }) {
  const generatedAt = new Date(report.meta.generatedAt);
  const maxIndex = Math.max(0.01, ...report.seasonalIndex.map((s) => s.index.value));

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.keyword} · {report.meta.gl.toUpperCase()} · {report.meta.monthsCovered}개월 (
          {report.meta.yearsCovered}개 연도)
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">시즌 구조</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">시즌 피크</div>
            <div className="stat-value">{report.persistence.peakMonth}월</div>
            <div className="stat-basis">
              다년 평균 기준 <LabelBadge basis="derived" />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">최저 월</div>
            <div className="stat-value">{report.persistence.troughMonth}월</div>
            <div className="stat-basis">
              <LabelBadge basis="derived" />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">비수기 지속성</div>
            <div className="stat-value">
              {report.persistence.offSeasonSharePct.basis === "missing"
                ? "—"
                : `${report.persistence.offSeasonSharePct.value}%`}
            </div>
            <div className="stat-basis">
              최저월/최고월 평균 <LabelBadge basis={report.persistence.offSeasonSharePct.basis} />
            </div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <InsightCards insights={report.insights} meta={report.meta} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">캘린더 월별 시즌 지수 (다년 평균 / 전체 평균)</div>
        <div className="segment-bar-group">
          {report.seasonalIndex.map((s) => (
            <div key={s.month} className="segment-bar-row">
              <span className="segment-bar-label">{s.month}월</span>
              <div className="segment-bar-track">
                <div className="segment-bar-fill" style={{ width: `${(s.index.value / maxIndex) * 100}%` }} />
              </div>
              <span className="segment-bar-value">
                {s.index.basis === "missing" ? "—" : s.index.value} <LabelBadge basis={s.index.basis} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">연도 × 월 검색량</div>
        <div className="cross-table-wrap">
          <table className="cross-table">
            <thead>
              <tr>
                <th />
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i}>{i + 1}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.yearRows.map((r) => (
                <tr key={r.year}>
                  <th>{r.year}</th>
                  {r.monthly.map((v, i) => (
                    <td key={i}>{v === null ? "—" : v.toLocaleString()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          월별 검색량은 실측, 시즌 지수·지속성은 파생값입니다. 시즌 반복의 원인은 인과 단정 없이 동향으로만
          서술하세요.
        </p>
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
