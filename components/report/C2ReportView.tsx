import type { C2Report } from "@/types";
import { LabelBadge } from "./LabelBadge";
import { ComplianceFooter } from "./ComplianceFooter";
import { BrandTable } from "./BrandTable";

export function C2ReportView({ report }: { report: C2Report }) {
  const generatedAt = new Date(report.meta.generatedAt);
  const ours = report.brands.find((b) => b.isOurs);

  return (
    <div className="report-view">
      <div className="report-view-meta">
        <span>
          {report.meta.category} · {report.meta.gl.toUpperCase()} · 자사 &ldquo;{report.meta.ourBrand}&rdquo; · 브랜드{" "}
          {report.brands.length}개 감지
        </span>
        <span>{generatedAt.toLocaleString("ko-KR")} 생성</span>
      </div>

      {report.meta.brandExtraction === "partial" && (
        <div className="mock-banner">
          <strong>브랜드 추출 실패</strong> — 경쟁 브랜드 목록이 불완전할 수 있습니다. 다시 생성해보세요.
        </div>
      )}

      {ours && ours.keywordCount === 0 && (
        <div className="generate-form-error" style={{ marginBottom: 20 }}>
          <strong>자사 브랜드 키워드 미발견</strong> — &ldquo;{report.meta.ourBrand}&rdquo;를 포함하는 검색
          키워드가 이 카테고리 그래프에 없습니다. 브랜드 표기(한/영, 띄어쓰기)를 바꿔 다시 시도해보세요.
        </div>
      )}

      {ours && ours.keywordCount > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">자사 포지션</div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">검색 점유 (근사)</div>
              <div className="stat-value">{ours.sharePct.value}%</div>
              <div className="stat-basis">
                <LabelBadge basis={ours.sharePct.basis} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">순위</div>
              <div className="stat-value">
                {report.brands.filter((b) => b.totalVolume.value > ours.totalVolume.value).length + 1}위
              </div>
              <div className="stat-basis">감지 브랜드 {report.brands.length}개 중</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">자사 키워드</div>
              <div className="stat-value">{ours.keywordCount}개</div>
              <div className="stat-basis">
                볼륨 {ours.totalVolume.value.toLocaleString()} <LabelBadge basis={ours.totalVolume.basis} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">가중 트렌드</div>
              <div className="stat-value">
                {ours.weightedTrend.value >= 0 ? "+" : ""}
                {Math.round(ours.weightedTrend.value * 1000) / 10}%
              </div>
              <div className="stat-basis">
                <LabelBadge basis={ours.weightedTrend.basis} />
              </div>
            </div>
          </div>
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
        <div className="detail-section-title">자사 vs 경쟁 (볼륨순)</div>
        <BrandTable brands={report.brands} />
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
