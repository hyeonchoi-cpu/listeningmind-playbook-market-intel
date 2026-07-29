import type { D3KeywordRow, D3Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";

function KeywordTable({ rows, showCoveredBy, emptyText }: { rows: D3KeywordRow[]; showCoveredBy?: boolean; emptyText: string }) {
  if (rows.length === 0) return <p className="estimate-box-note">{emptyText}</p>;
  return (
    <div className="cross-table-wrap">
      <table className="cross-table">
        <thead>
          <tr>
            <th>키워드</th>
            <th>월평균 검색량</th>
            <th>트렌드</th>
            {showCoveredBy && <th>커버 브랜드</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.keyword}>
              <th>{r.keyword}</th>
              <td>
                {r.volume.value.toLocaleString()} <LabelBadge basis={r.volume.basis} />
              </td>
              <td>
                {r.trend.value >= 0 ? "+" : ""}
                {Math.round(r.trend.value * 1000) / 10}% <LabelBadge basis={r.trend.basis} />
              </td>
              {showCoveredBy && <td>{r.coveredBy.join(" · ") || "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function D3ReportView({ report }: { report: D3Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 자사 &ldquo;{report.meta.ourBrand}&rdquo; ·
          노드 {report.meta.totalNodes.toLocaleString()}개
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.brandExtraction === "partial" && (
        <div className="mock-banner">
          <strong>브랜드 추출 실패</strong> — 경쟁 커버리지 판정이 불완전할 수 있습니다. 다시 생성해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">자사 커버리지</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">자사 커버 키워드</div>
            <div className="stat-value">{report.ourCoverage.keywordCount}개</div>
            <div className="stat-basis">
              볼륨 {report.ourCoverage.volume.value.toLocaleString()}{" "}
              <LabelBadge basis={report.ourCoverage.volume.basis} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">부족(경쟁 커버) 상위</div>
            <div className="stat-value">{report.competitorGaps.length}개</div>
            <div className="stat-basis">표시 상한 10개</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">열린 논브랜드 상위</div>
            <div className="stat-value">{report.unbrandedOpportunities.length}개</div>
            <div className="stat-basis">표시 상한 10개</div>
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
        <div className="detail-section-title">강점 — 자사 커버 상위 키워드</div>
        <KeywordTable rows={report.strengths} showCoveredBy emptyText="자사 별칭이 매칭되는 키워드가 없습니다." />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">부족 — 경쟁은 커버, 자사는 미커버</div>
        <KeywordTable
          rows={report.competitorGaps}
          showCoveredBy
          emptyText="경쟁 브랜드만 커버하는 키워드가 확인되지 않았습니다."
        />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">열린 기회 — 어떤 브랜드도 없는 논브랜드 상위 키워드</div>
        <KeywordTable rows={report.unbrandedOpportunities} emptyText="논브랜드 키워드가 확인되지 않았습니다." />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          커버리지는 브랜드 별칭 부분 문자열 매칭 기준 근사이며(단독 기업명 쿼리 제외), 실제 SERP 노출·콘텐츠
          보유 여부와는 다릅니다.
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
