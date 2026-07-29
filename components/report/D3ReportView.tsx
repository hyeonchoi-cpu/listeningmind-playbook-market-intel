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
            <div className="stat-label">경쟁 브랜드 수요 상위</div>
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
        <div className="detail-section-title">강점 — 자사 브랜드 결합 상위 쿼리</div>
        <KeywordTable rows={report.strengths} showCoveredBy emptyText="자사 별칭이 붙은 결합 쿼리가 없습니다." />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          단독 자사명 쿼리(내비게이션 수요)는 커버리지 수치에는 포함되지만 목록에서는 제외했습니다.
        </p>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">경쟁 브랜드 수요 — 자사 미포함 결합 쿼리</div>
        <KeywordTable
          rows={report.competitorGaps}
          showCoveredBy
          emptyText="경쟁 브랜드가 붙은 결합 쿼리가 확인되지 않았습니다."
        />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          경쟁 브랜드명이 붙은 쿼리는 정의상 자사가 직접 커버할 수 없습니다 — 자사 콘텐츠 공백이 아니라
          비교 콘텐츠·SEM 컨퀘스트 검토 대상으로 읽으세요. 단독 기업명 쿼리(예: &ldquo;삼성&rdquo; 단독)는
          해당 브랜드의 내비게이션 수요로 보고 목록에서 제외했습니다.
        </p>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">열린 기회 — 어떤 브랜드도 없는 논브랜드 상위 키워드</div>
        <KeywordTable rows={report.unbrandedOpportunities} emptyText="논브랜드 키워드가 확인되지 않았습니다." />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          커버리지 분류는 브랜드 별칭 <strong>포함</strong> 기준 근사입니다(단독 기업명 쿼리도 브랜드 연관으로
          취급). 소비자 브랜드가 아닌 기업·기관·종목명이 붙은 키워드, 그리고 비소비 맥락(주식·취업 등) 토큰
          키워드 {report.meta.nonConsumerExcluded.toLocaleString()}개는 분류에서 제외했습니다(토큰 사전 기반
          가정). 실제 SERP 노출·콘텐츠 보유 여부와는 다릅니다.
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
