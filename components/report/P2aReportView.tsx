import type { P2aFlowRow, P2aReport } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { InsightCards } from "./InsightCards";
import { ComplianceFooter } from "./ComplianceFooter";

function FlowTable({ rows, emptyText }: { rows: P2aFlowRow[]; emptyText: string }) {
  if (rows.length === 0) return <p className="estimate-box-note">{emptyText}</p>;
  return (
    <div className="cross-table-wrap">
      <table className="cross-table">
        <thead>
          <tr>
            <th>키워드</th>
            <th>등장 수</th>
            <th>도착 경로 비중</th>
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

export function P2aReportView({ report }: { report: P2aReport }) {
  const generatedAt = new Date(report.meta.generatedAt);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          시드 &ldquo;{report.meta.category}&rdquo; · {report.meta.gl.toUpperCase()} · 경로{" "}
          {report.meta.totalPaths.toLocaleString()}개 (도착 경로 {report.meta.arrivalPaths.toLocaleString()}개)
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">진입 구성</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">직접 진입</div>
            <div className="stat-value">{report.meta.directEntrySharePct.value}%</div>
            <div className="stat-basis">
              시드에서 여정 시작 <LabelBadge basis={report.meta.directEntrySharePct.basis} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">유도 진입 (도착 경로)</div>
            <div className="stat-value">{report.meta.arrivalPaths}개</div>
            <div className="stat-basis">선행 검색 후 시드 도착</div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <InsightCards insights={report.insights} meta={report.meta} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">카테고리 진입 트리거(CEP) — 시드 등장 직전 쿼리</div>
        <FlowTable rows={report.triggers} emptyText="도착 경로가 없어 트리거를 집계할 수 없습니다." />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">진입 여정 출발점 (도착 경로의 첫 쿼리)</div>
        <FlowTable rows={report.origins} emptyText="도착 경로가 없어 출발점을 집계할 수 없습니다." />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          역방향 여정은 표준 path_finder 응답에서 시드가 처음 등장하기 이전 구간을 분석한 것입니다(전용
          REVERSE 모드 아님 — 방법 근사). 검색 여정은 집계 행동 그래프이며 개인 추적이 아닙니다.
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
