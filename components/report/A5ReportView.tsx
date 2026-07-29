import type { A5Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";
import { BrandTable } from "./BrandTable";

export function A5ReportView({ report }: { report: A5Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 노드 {report.meta.totalNodes.toLocaleString()}개 ·
          브랜드 {report.brands.length}개 감지
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.brandExtraction === "partial" && (
        <div className="mock-banner">
          <strong>브랜드 추출 실패</strong> — 실시간 LLM 추출이 재시도 후에도 실패했습니다. 다시 생성해보세요.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">검색 집중도 (비보조 인지도의 검색 프록시 · 가정)</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">1위 브랜드 점유</div>
            <div className="stat-value">
              {report.concentration.top1SharePct.basis === "missing"
                ? "—"
                : `${report.concentration.top1SharePct.value}%`}
            </div>
            <div className="stat-basis">
              <LabelBadge basis={report.concentration.top1SharePct.basis} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">상위 3개 집중도</div>
            <div className="stat-value">
              {report.concentration.top3SharePct.basis === "missing"
                ? "—"
                : `${report.concentration.top3SharePct.value}%`}
            </div>
            <div className="stat-basis">
              <LabelBadge basis={report.concentration.top3SharePct.basis} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">감지 브랜드</div>
            <div className="stat-value">{report.brands.length}개</div>
            <div className="stat-basis">LLM 추출 + 키워드 재검증</div>
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
        <div className="detail-section-title">브랜드 검색 점유 (볼륨순)</div>
        <BrandTable brands={report.brands} />
        <p className="estimate-box-note" style={{ marginTop: 8 }}>
          검색 점유는 설문 기반 비보조 인지도가 아니라 그 검색 프록시(가정)입니다 — 인지도 지표로 인용할 때는
          이 한계를 함께 명시하세요.
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
