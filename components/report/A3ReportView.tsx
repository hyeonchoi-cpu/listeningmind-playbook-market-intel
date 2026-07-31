import type { A3Report } from "@/types";
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

export function A3ReportView({ report }: { report: A3Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.cepClassification === "partial" && (
        <div className="mock-banner">
          <strong>CEP 해석 실패</strong> — 실시간 LLM 분류가 재시도 후에도 실패해 아래 7W 상황 라벨이 비어
          있습니다. 인텐트 믹스·키워드 데이터는 정상입니다. 필요하면 다시 생성해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">검색 의도 구성(Intent Mix) — 플래그 보유 키워드 수 · 볼륨 합</div>
        <div className="stat-grid">
          {report.intentMix.map((row) => (
            <div key={row.key} className="stat-card">
              <div className="stat-label">
                {row.key.toUpperCase()} · {row.label}
              </div>
              <div className="stat-value">{row.keywordCount.toLocaleString()}개</div>
              <div className="stat-basis">
                볼륨 {row.volume.value.toLocaleString()} <LabelBadge basis={row.volume.basis} />
              </div>
            </div>
          ))}
        </div>
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          인텐트 플래그(i/n/c/t)는 보유/미보유 실측 플래그입니다 — 비율이 아니라 플래그를 가진 키워드 수와 그
          볼륨 합으로만 집계했습니다.
        </p>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <InsightCards insights={report.insights} meta={report.meta} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">검색 상황 (CEP 7W · 볼륨 상위 군집)</div>
        <div className="cep-grid">
          {report.cepGroups.map((g) => (
            <div key={g.id} className="insight-card">
              <div className="cep-card-top">
                <span className="persona-chip">{AXIS_LABEL[g.axis] ?? g.axis}</span>
                <span className="cep-card-volume">
                  볼륨 {g.volume.value.toLocaleString()} <LabelBadge basis={g.volume.basis} />
                </span>
              </div>
              <div className="insight-card-title">{g.cepShort}</div>
              {g.situation && <div className="insight-card-body">{g.situation}</div>}
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

      <div className="detail-section">
        <div className="detail-section-title">전체 상위 키워드</div>
        <div className="cross-table-wrap">
          <table className="cross-table">
            <thead>
              <tr>
                <th>키워드</th>
                <th>월평균 검색량</th>
                <th>인텐트 플래그</th>
              </tr>
            </thead>
            <tbody>
              {report.topKeywords.map((k) => (
                <tr key={k.keyword}>
                  <th>{k.keyword}</th>
                  <td>
                    {k.volume.value.toLocaleString()} <LabelBadge basis={k.volume.basis} />
                  </td>
                  <td>{k.flags.length ? k.flags.map((f) => f.toUpperCase()).join(" · ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
