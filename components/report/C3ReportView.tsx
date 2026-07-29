import type { C3FlowRow, C3Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

function FlowTable({ rows, emptyText, exitColumn }: { rows: C3FlowRow[]; emptyText: string; exitColumn?: boolean }) {
  if (rows.length === 0) return <p className="estimate-box-note">{emptyText}</p>;
  return (
    <div className="cross-table-wrap">
      <table className="cross-table">
        <thead>
          <tr>
            <th>키워드</th>
            <th>전환 확률</th>
            {exitColumn && <th>구분</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.keyword}-${i}`}>
              <th>{r.keyword}</th>
              <td>
                {r.weight.value} <LabelBadge basis={r.weight.basis} />
              </td>
              {exitColumn && (
                <td>{r.containsSeed ? "브랜드 내 이동" : "이탈 방향 후보"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function C3ReportView({ report }: { report: C3Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  const stageTotal = report.stages.reduce((s, r) => s + r.nodeCount, 0) || 1;

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          시드 &ldquo;{report.meta.category}&rdquo; · {report.meta.gl.toUpperCase()} · 노드{" "}
          {report.meta.totalNodes.toLocaleString()}개 · 엣지 {report.meta.totalEdges.toLocaleString()}개
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
        <div className="detail-section-title">유입 흐름 (→ 자사 키워드)</div>
        <FlowTable rows={report.inflows} emptyText="시드 방향으로 들어오는 시퀀스가 확인되지 않았습니다." />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">유출 흐름 (자사 키워드 →)</div>
        <FlowTable
          rows={report.outflows}
          emptyText="자사 키워드에서 나가는 시퀀스가 확인되지 않았습니다."
          exitColumn
        />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          검색 여정은 집계 행동 그래프이며 개인 추적이 아닙니다. &ldquo;이탈 방향 후보&rdquo;는 검색 이동
          방향일 뿐 실제 이탈·전환을 뜻하지 않습니다.
        </p>
      </div>

      {report.stages.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">퍼널 단계 분포 (알고리즘 추정)</div>
          <div className="stat-grid">
            {report.stages.map((s) => (
              <div key={s.stage} className="stat-card">
                <div className="stat-label">{s.stage}</div>
                <div className="stat-value">{s.nodeCount}개</div>
                <div className="stat-basis">
                  {Math.round((s.nodeCount / stageTotal) * 100)}% <LabelBadge basis="derived" />
                </div>
              </div>
            ))}
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
