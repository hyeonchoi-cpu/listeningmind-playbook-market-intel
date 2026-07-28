import type { B1Report, B1Segment } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

// 차트는 결정론적으로 — Chart.js/D3 CDN 대신 순수 CSS width% 바 (설계 원칙 4의 정신을 그대로 따름:
// 외부 스크립트 없이 항상 같은 결과로 렌더링됨).
function SegmentBars({ segments }: { segments: B1Segment[] }) {
  const max = Math.max(1, ...segments.map((s) => s.totalVolume.value));
  return (
    <div className="segment-bar-group">
      {segments.map((s) => (
        <div key={s.key} className="segment-bar-row">
          <span className="segment-bar-label">{s.label}</span>
          <div className="segment-bar-track">
            <div className="segment-bar-fill" style={{ width: `${(s.totalVolume.value / max) * 100}%` }} />
          </div>
          <span className="segment-bar-value">
            {s.sharePct.value}% <LabelBadge basis={s.sharePct.basis} />
          </span>
        </div>
      ))}
    </div>
  );
}

const AGE_ORDER = ["a13", "a20", "a25", "a30", "a40", "a50"];
const AGE_LABEL: Record<string, string> = {
  a13: "10대",
  a20: "20대",
  a25: "25~",
  a30: "30대",
  a40: "40대",
  a50: "50대+",
};

export function B1ReportView({ report }: { report: B1Report }) {
  const genderSegs = report.segments.filter((s) => s.kind === "gender");
  const ageSegs = report.segments.filter((s) => s.kind === "age");
  const generatedAt = new Date(report.meta.generatedAt);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.kbfClassification === "partial" && (
        <div className="mock-banner">
          <strong>일부 KBF 분류 실패</strong> — 재시도 후에도 분류하지 못한 키워드가 있어 아래 KBF 라벨이
          비어있는 세그먼트가 있을 수 있습니다. 필요하면 다시 생성해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">세그먼트 볼륨</div>
        <div className="method-grid">
          <div>
            <div className="segment-bar-kind">성별</div>
            <SegmentBars segments={genderSegs} />
          </div>
          <div>
            <div className="segment-bar-kind">연령</div>
            <SegmentBars segments={ageSegs} />
          </div>
        </div>
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
        <div className="detail-section-title">세그먼트별 KBF (핵심 구매요인)</div>
        <div className="kbf-grid">
          {report.segments.map((seg) => {
            const entries = report.kbfBySegment[seg.key] ?? [];
            return (
              <div key={seg.key} className="kbf-card">
                <div className="kbf-card-title">{seg.label}</div>
                {entries.length === 0 ? (
                  <div className="kbf-card-empty">분류된 KBF 없음</div>
                ) : (
                  <ul className="kbf-card-list">
                    {entries.slice(0, 4).map((e) => (
                      <li key={e.label}>
                        <span>{e.label}</span>
                        <LabelBadge basis={e.volume.basis} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">성별 × 연령 교차 (검색량 상위 키워드 수)</div>
        <div className="cross-table-wrap">
          <table className="cross-table">
            <thead>
              <tr>
                <th />
                {AGE_ORDER.map((a) => (
                  <th key={a}>{AGE_LABEL[a]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["female", "male"].map((g) => (
                <tr key={g}>
                  <th>{g === "female" ? "여성" : "남성"}</th>
                  {AGE_ORDER.map((a) => {
                    const cell = report.crossMatrix.find((c) => c.gender === g && c.age === a);
                    return <td key={a}>{cell?.keywordCount ?? 0}</td>;
                  })}
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
