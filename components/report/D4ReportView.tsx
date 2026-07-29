import type { D4Report } from "@/types";
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

export function D4ReportView({ report }: { report: D4Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개 ·
          엣지 {report.meta.totalEdges.toLocaleString()}개
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.cepClassification === "partial" && (
        <div className="mock-banner">
          <strong>함께 검색 상황 해석 실패</strong> — 상황 라벨이 비어 있습니다. 아이템·트렌드 수치는
          실측이므로 유효합니다. 필요하면 다시 생성해보세요.
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
        <div className="detail-section-title">라이징 연관 아이템 (트렌드순)</div>
        <div className="cep-grid">
          {report.risingItems.map((item) => (
            <div key={item.keyword} className="insight-card">
              <div className="cep-card-top">
                <span className="persona-chip">{AXIS_LABEL[item.axis] ?? item.axis}</span>
                <span className="cep-card-volume">
                  {item.trend.value >= 0 ? "+" : ""}
                  {Math.round(item.trend.value * 1000) / 10}% <LabelBadge basis={item.trend.basis} />
                </span>
              </div>
              <div className="insight-card-title">{item.keyword}</div>
              {item.situation && <div className="insight-card-body">{item.situation}</div>}
              <div className="stat-basis" style={{ marginTop: 8 }}>
                볼륨 {item.volume.value.toLocaleString()} <LabelBadge basis={item.volume.basis} />
                {item.neighborOfSeed && (
                  <span className="persona-chip" style={{ marginLeft: 6 }}>
                    시드 직접 연결
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          후보는 카테고리명을 포함하지 않는 클러스터 키워드 중 볼륨 100 이상만(노이즈 컷, 가정) 트렌드순으로
          집계했습니다. 급등의 원인(시즌·이슈·광고 등)은 별도 검증이 필요합니다.
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
