import type { A1MonthPoint, A1Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { InsightCards } from "./InsightCards";
import { ComplianceFooter } from "./ComplianceFooter";

// 결정론적 인라인 SVG 라인 차트 — 외부 차트 라이브러리 금지 규율(설계 원칙 4) 준수
function TrendChart({ monthly }: { monthly: A1MonthPoint[] }) {
  const pts = monthly.slice(-24);
  if (pts.length < 2) return null;
  const w = 720;
  const h = 180;
  const pad = 10;
  const max = Math.max(1, ...pts.map((p) => p.total.value));
  const step = (w - pad * 2) / (pts.length - 1);
  const y = (v: number) => h - pad - ((h - pad * 2) * v) / max;
  const linePoints = pts.map((p, i) => `${(pad + i * step).toFixed(1)},${y(p.total.value).toFixed(1)}`).join(" ");
  const areaPoints = `${pad},${h - pad} ${linePoints} ${pad + (pts.length - 1) * step},${h - pad}`;
  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="trend-chart" role="img" aria-label="월별 검색량 추이">
        <polygon points={areaPoints} fill="var(--blue-soft)" />
        <polyline points={linePoints} fill="none" stroke="var(--blue)" strokeWidth="2" />
      </svg>
      <div className="trend-chart-axis">
        <span>{pts[0].month}</span>
        <span>최대 {max.toLocaleString()}</span>
        <span>{pts[pts.length - 1].month}</span>
      </div>
    </div>
  );
}

export function A1ReportView({ report }: { report: A1Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.keyword} · {report.meta.gl.toUpperCase()} · 시계열 {report.meta.monthsCovered}개월
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">핵심 지표</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">월평균 검색량</div>
            <div className="stat-value">{report.volumeAvg.value.toLocaleString()}</div>
            <div className="stat-basis">
              <LabelBadge basis={report.volumeAvg.basis} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">3개월 트렌드</div>
            <div className="stat-value">
              {report.volumeTrend.value >= 0 ? "+" : ""}
              {Math.round(report.volumeTrend.value * 1000) / 10}%
            </div>
            <div className="stat-basis">
              <LabelBadge basis={report.volumeTrend.basis} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">최근 YoY</div>
            <div className="stat-value">
              {report.yoy.length
                ? `${report.yoy[report.yoy.length - 1].deltaPct.value >= 0 ? "+" : ""}${report.yoy[report.yoy.length - 1].deltaPct.value}%`
                : "—"}
            </div>
            <div className="stat-basis">
              <LabelBadge basis={report.yoy.length ? "derived" : "missing"} />
            </div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">수요 트렌드·시즌성(Demand & Seasonality) — 최근 24개월</div>
        <TrendChart monthly={report.monthly} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <InsightCards insights={report.insights} meta={report.meta} />
      </div>

      {report.yoy.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">전년 동월 대비 (최근 12개월)</div>
          <div className="cross-table-wrap">
            <table className="cross-table">
              <thead>
                <tr>
                  <th>월</th>
                  <th>당월</th>
                  <th>전년 동월</th>
                  <th>증감</th>
                </tr>
              </thead>
              <tbody>
                {report.yoy.map((r) => (
                  <tr key={r.month}>
                    <th>{r.month}</th>
                    <td>{r.current.toLocaleString()}</td>
                    <td>{r.prevYear.toLocaleString()}</td>
                    <td>
                      {r.deltaPct.value >= 0 ? "+" : ""}
                      {r.deltaPct.value}% <LabelBadge basis={r.deltaPct.basis} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
