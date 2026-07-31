import type { C3FlowRow, C3Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { InsightCards } from "./InsightCards";
import { ComplianceFooter } from "./ComplianceFooter";

function FlowTable({ rows, emptyText, exitColumn }: { rows: C3FlowRow[]; emptyText: string; exitColumn?: boolean }) {
  if (rows.length === 0) return <p className="estimate-box-note">{emptyText}</p>;
  return (
    <div className="cross-table-wrap">
      <table className="cross-table">
        <thead>
          <tr>
            <th>키워드</th>
            <th>등장 수</th>
            <th>비중</th>
            {exitColumn && <th>구분</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.keyword}-${i}`}>
              <th>{r.keyword}</th>
              <td>{r.count}</td>
              <td>
                {r.sharePct.value}% <LabelBadge basis={r.sharePct.basis} />
              </td>
              {exitColumn && <td>{r.containsSeed ? "브랜드 내 이동" : "이탈 방향 후보"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function C3ReportView({ report }: { report: C3Report }) {
  const generatedAt = new Date(report.meta.generatedAt);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          시드 &ldquo;{report.meta.category}&rdquo; · {report.meta.gl.toUpperCase()} · 경로{" "}
          {report.meta.totalPaths.toLocaleString()}개 (시드 등장 {report.meta.pathsWithSeed.toLocaleString()}개)
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">인사이트</div>
        <InsightCards insights={report.insights} meta={report.meta} />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">여정(CDJ) 유입 흐름 — 자사 키워드 직전 쿼리</div>
        <FlowTable rows={report.inflows} emptyText="시드 직전 쿼리가 확인되지 않았습니다." />
      </div>

      <div className="detail-section">
        <div className="detail-section-title">여정(CDJ) 유출 흐름 — 자사 키워드 직후 쿼리</div>
        <FlowTable
          rows={report.outflows}
          emptyText="자사 키워드 직후 쿼리가 확인되지 않았습니다."
          exitColumn
        />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          비중은 경로 등장 횟수 기반 파생값입니다. 검색 여정은 집계 행동 그래프이며 개인 추적이 아닙니다 —
          &ldquo;이탈 방향 후보&rdquo;는 검색 이동 방향일 뿐 실제 이탈·전환을 뜻하지 않습니다.
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
