import type { A4FlowRow, A4Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

function EndpointTable({ rows, shareLabel }: { rows: A4FlowRow[]; shareLabel: string }) {
  if (rows.length === 0) return <p className="estimate-box-note">데이터가 없습니다.</p>;
  return (
    <div className="cross-table-wrap">
      <table className="cross-table">
        <thead>
          <tr>
            <th>키워드</th>
            <th>경로 수</th>
            <th>{shareLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.keyword}>
              <th>{r.keyword}</th>
              <td>{r.count}</td>
              <td>
                {r.sharePct.value}% <LabelBadge basis={r.sharePct.basis} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function A4ReportView({ report }: { report: A4Report }) {
  const generatedAt = new Date(report.meta.generatedAt);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 경로 {report.meta.totalPaths.toLocaleString()}개 ·
          평균 깊이 {report.meta.avgPathLength.value}
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
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
        <div className="detail-section-title">여정 시작 쿼리 (진입·인지 후보)</div>
        <EndpointTable rows={report.startKeywords} shareLabel="경로 비중" />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">여정 종착 쿼리 (결정·이탈 지점 후보)</div>
        <EndpointTable rows={report.endKeywords} shareLabel="경로 비중" />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          시작/종착은 경로 내 위치 기반 근사이며 퍼널 단계 분류가 아닙니다. 종착이 결정인지 이탈인지는 단정할
          수 없습니다.
        </p>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">최다 전이 (연속 쿼리 쌍)</div>
        <div className="cross-table-wrap">
          <table className="cross-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>등장 수</th>
                <th>전이 비중</th>
              </tr>
            </thead>
            <tbody>
              {report.topTransitions.map((t, i) => (
                <tr key={`${t.from}-${t.to}-${i}`}>
                  <th>{t.from}</th>
                  <td>{t.to}</td>
                  <td>{t.count}</td>
                  <td>
                    {t.sharePct.value}% <LabelBadge basis={t.sharePct.basis} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          검색 여정은 집계 행동 그래프이며 개인 추적이 아닙니다.
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
