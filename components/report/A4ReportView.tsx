import type { A4Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

export function A4ReportView({ report }: { report: A4Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  const totalNodes = Math.max(1, report.meta.totalNodes);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개 ·
          엣지 {report.meta.totalEdges.toLocaleString()}개
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
        <div className="detail-section-title">퍼널 단계 분포 (단계 분류는 알고리즘 추정)</div>
        <div className="stat-grid">
          {report.stages.map((s) => (
            <div key={s.stage} className="stat-card">
              <div className="stat-label">{s.stage}</div>
              <div className="stat-value">{s.nodeCount}개</div>
              <div className="stat-basis">
                {Math.round((s.nodeCount / totalNodes) * 100)}% <LabelBadge basis="derived" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">단계별 상위 키워드 (세션 수 기준)</div>
        <div className="kbf-grid">
          {report.stages.map((s) => (
            <div key={s.stage} className="kbf-card">
              <div className="kbf-card-title">{s.stage}</div>
              {s.topNodes.length === 0 ? (
                <div className="kbf-card-empty">노드 없음</div>
              ) : (
                <ul className="kbf-card-list">
                  {s.topNodes.map((n) => (
                    <li key={n.keyword}>
                      <span>{n.keyword}</span>
                      <span className="cep-card-volume">
                        {n.sessionCount.value.toLocaleString()} <LabelBadge basis={n.sessionCount.basis} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">상위 이동 흐름</div>
        <div className="cross-table-wrap">
          <table className="cross-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>전환 확률</th>
              </tr>
            </thead>
            <tbody>
              {report.topTransitions.map((t, i) => (
                <tr key={`${t.from}-${t.to}-${i}`}>
                  <th>{t.from}</th>
                  <td>{t.to}</td>
                  <td>
                    {t.weight.value} <LabelBadge basis={t.weight.basis} />
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
