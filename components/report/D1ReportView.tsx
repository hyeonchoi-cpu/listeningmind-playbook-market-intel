import type { D1Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
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

export function D1ReportView({ report }: { report: D1Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {(report.meta.cepClassification === "partial" || report.meta.brandExtraction === "partial") && (
        <div className="mock-banner">
          <strong>일부 LLM 분류 실패</strong> —{" "}
          {report.meta.cepClassification === "partial" ? "CEP 해석" : ""}
          {report.meta.cepClassification === "partial" && report.meta.brandExtraction === "partial" ? "·" : ""}
          {report.meta.brandExtraction === "partial" ? "브랜드 추출" : ""}이 실패해 선점 점수가 불완전합니다.
          다시 생성해보세요.
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

      <div className="detail-section">
        <div className="detail-section-title">선점 기회 랭킹 (점수 = 정규화 볼륨 × 논브랜드 비중 · 가정)</div>
        <div className="cep-grid">
          {report.opportunities.map((o) => (
            <div key={o.id} className="insight-card">
              <div className="cep-card-top">
                <span className="persona-chip">{AXIS_LABEL[o.axis] ?? o.axis}</span>
                <span className="cep-card-volume">
                  점수 {o.opportunityScore.basis === "missing" ? "—" : o.opportunityScore.value}{" "}
                  <LabelBadge basis={o.opportunityScore.basis} />
                </span>
              </div>
              <div className="insight-card-title">{o.cepShort}</div>
              {o.situation && <div className="insight-card-body">{o.situation}</div>}
              <div className="stat-basis" style={{ marginTop: 8 }}>
                볼륨 {o.volume.value.toLocaleString()} <LabelBadge basis={o.volume.basis} /> · 논브랜드{" "}
                {o.unbrandedSharePct.basis === "missing" ? "—" : `${o.unbrandedSharePct.value}%`}{" "}
                <LabelBadge basis={o.unbrandedSharePct.basis} />
              </div>
              <div className="cep-card-keywords">
                {o.topKeywords.slice(0, 5).map((k) => (
                  <span
                    key={k.keyword}
                    className="persona-chip"
                    title={k.branded ? "브랜드 포함 키워드" : "논브랜드 키워드"}
                    style={k.branded ? { opacity: 0.55 } : undefined}
                  >
                    {k.keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          흐리게 표시된 키워드는 브랜드 포함 쿼리입니다. 논브랜드 비중이 높을수록 아직 특정 브랜드에 붙지 않은
          수요라는 가정이며, 점수는 우선순위 참고용입니다.
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
