import type { P1aReport } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { InsightCards } from "./InsightCards";
import { ComplianceFooter } from "./ComplianceFooter";

const AXIS_LABEL: Record<string, string> = {
  WHEN: "언제",
  WHERE: "어디서",
  WHILE: "~하다가",
  WITH_WHOM: "누구와",
  WITH_WHAT: "무엇과 함께",
  HOW_FEEL: "기분·우려",
  WHY: "왜",
  UNCLEAR: "불명",
};

export function P1aReportView({ report }: { report: P1aReport }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 현재 {report.meta.currNodes.toLocaleString()}노드
          vs 12m {report.meta.pastNodes.toLocaleString()}노드
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.cepClassification === "partial" && (
        <div className="mock-banner">
          <strong>맥락 해석 실패</strong> — 상황 라벨이 비어 있습니다. 신규/이탈 수치는 유효합니다. 필요하면
          다시 생성해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">시점 대조 (curr vs 12m)</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">신규 키워드</div>
            <div className="stat-value">{report.meta.newCount.toLocaleString()}개</div>
            <div className="stat-basis">
              현재 그래프에만 존재 <LabelBadge basis="derived" />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">이탈 키워드</div>
            <div className="stat-value">{report.meta.goneCount.toLocaleString()}개</div>
            <div className="stat-basis">
              12m 그래프에만 존재 <LabelBadge basis="derived" />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">떠오른 맥락 군집</div>
            <div className="stat-value">{report.emergingGroups.length}개</div>
            <div className="stat-basis">신규 비중 50%+ (가정)</div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <InsightCards insights={report.insights} meta={report.meta} />
      </div>

      {report.emergingGroups.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">떠오른 검색 맥락 (신규 키워드 비중 높은 군집)</div>
          <div className="cep-grid">
            {report.emergingGroups.map((g) => (
              <div key={g.id} className="insight-card">
                <div className="cep-card-top">
                  <span className="persona-chip">{AXIS_LABEL[g.axis] ?? g.axis}</span>
                  <span className="cep-card-volume">
                    신규 {g.newSharePct.value}% <LabelBadge basis={g.newSharePct.basis} />
                  </span>
                </div>
                <div className="insight-card-title">{g.cepShort}</div>
                {g.situation && <div className="insight-card-body">{g.situation}</div>}
                <div className="stat-basis" style={{ marginTop: 8 }}>
                  볼륨 {g.volume.value.toLocaleString()} <LabelBadge basis={g.volume.basis} />
                </div>
                <div className="cep-card-keywords">
                  {g.topKeywords.slice(0, 5).map((k) => (
                    <span key={k.keyword} className="persona-chip">
                      {k.keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.fadedKeywords.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">그래프에서 빠진 키워드 (현재 볼륨순)</div>
          <div className="cross-table-wrap">
            <table className="cross-table">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>현재 월평균 검색량</th>
                </tr>
              </thead>
              <tbody>
                {report.fadedKeywords.map((k) => (
                  <tr key={k.keyword}>
                    <th>{k.keyword}</th>
                    <td>
                      {k.volume.value.toLocaleString()} <LabelBadge basis={k.volume.basis} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="estimate-box-note" style={{ marginTop: 8 }}>
            볼륨이 여전히 있는데 그래프에서 빠졌다면 다른 맥락으로 이동했을 가능성이 있습니다 — 해석 후보일
            뿐이며, 시점 간 변화의 원인은 인과 단정 없이 상관·동향으로만 서술하세요.
          </p>
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
