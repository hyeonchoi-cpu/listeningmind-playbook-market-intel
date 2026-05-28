import Link from "next/link";
import type { Card } from "@/types";
import { IconTile } from "./IconTile";

const BAND_LABEL: Record<Card["band"], string> = {
  discovery: "01 / Discovery",
  intelligence: "02 / Intelligence",
  action: "03 / Action",
};

function PricingValue({ value }: { value: string }) {
  // Highlight TBD markers with a yellow chip
  if (/TBD/i.test(value)) {
    return (
      <span>
        <span className="tbd">TBD</span>
        {value.replace(/TBD\s*/i, "")}
      </span>
    );
  }
  return <span>{value}</span>;
}

export function CardDetail({ card }: { card: Card }) {
  return (
    <div className="detail">
      <div className="detail-eyebrow">
        <span className="num">{card.number}</span>
        <span>{BAND_LABEL[card.band]}</span>
        {card.isNew && <span className="num" style={{ background: "var(--blue)" }}>NEW</span>}
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 14 }}>
        <div className={`theme-${card.color}`} style={{ flexShrink: 0 }}>
          <IconTile svg={card.iconSvg} large />
        </div>
        <h1 className="detail-title">{card.title}</h1>
      </div>

      <p className="detail-desc">{card.shortDesc}</p>

      <div className="detail-meta">
        <div className="detail-meta-item">
          <span className="detail-meta-label">Endpoint</span>
          <span className="detail-meta-value" style={{ fontFamily: '"Google Sans Code", monospace' }}>
            {card.endpoint}
          </span>
        </div>
        <div className="detail-meta-item">
          <span className="detail-meta-label">Personas</span>
          <span className="detail-meta-value">
            <span className="chip-row">
              {card.personas.map((p) => (
                <span key={p} className="persona-chip">{p}</span>
              ))}
            </span>
          </span>
        </div>
        <div className="detail-meta-item">
          <span className="detail-meta-label">Band</span>
          <span className="detail-meta-value">{BAND_LABEL[card.band]}</span>
        </div>
      </div>

      {/* === METHODOLOGY === */}
      <div className="detail-section">
        <h2 className="detail-section-title">Methodology</h2>
        <div className="method-grid">
          <div className="method-card">
            <div className="method-card-label">Data Source</div>
            <div className="method-card-value">{card.methodology.dataSource}</div>
          </div>
          <div className="method-card">
            <div className="method-card-label">Algorithm</div>
            <div className="method-card-value">{card.methodology.algorithm}</div>
          </div>
          <div className="method-card">
            <div className="method-card-label">4-Label Policy</div>
            <div className="method-card-value">{card.methodology.fourLabel}</div>
          </div>
          <div className="method-card">
            <div className="method-card-label">Limitations</div>
            <div className="method-card-value">{card.methodology.limitations}</div>
          </div>
          <div className="method-card" style={{ gridColumn: "1 / -1" }}>
            <div className="method-card-label">SLA</div>
            <div className="method-card-value">{card.methodology.sla}</div>
          </div>
        </div>
      </div>

      {/* === PRICING === */}
      <div className="detail-section">
        <h2 className="detail-section-title">Pricing</h2>
        <div className="pricing-table">
          <div className="pricing-row header">
            <div>Item</div>
            <div>Value</div>
          </div>
          <div className="pricing-row">
            <div className="pricing-label">Endpoint Cost</div>
            <div className="pricing-value">
              <PricingValue value={card.pricing.endpointCost} />
            </div>
          </div>
          <div className="pricing-row">
            <div className="pricing-label">Avg Calls / Use</div>
            <div className="pricing-value">
              <PricingValue value={card.pricing.avgCallsPerUse} />
            </div>
          </div>
          <div className="pricing-row">
            <div className="pricing-label">Est. Monthly Cost</div>
            <div className="pricing-value">
              <PricingValue value={card.pricing.estMonthlyCost} />
            </div>
          </div>
          <div className="pricing-row">
            <div className="pricing-label">Available Plan</div>
            <div className="pricing-value">
              <PricingValue value={card.pricing.plan} />
            </div>
          </div>
        </div>
        {card.pricing.referenceCase && (
          <p className="pricing-ref">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
            </svg>
            <span><strong>실측 근거:</strong> {card.pricing.referenceCase}</span>
          </p>
        )}
      </div>

      {/* === RESOURCES (Sample Data & GitHub Skill) === */}
      {(card.sampleDataUrl || card.githubSkillUrl) && (
        <div className="detail-section">
          <h2 className="detail-section-title">Resources</h2>
          <div className="resource-grid">
            {card.sampleDataUrl && (
              <a
                href={card.sampleDataUrl}
                download
                className="resource-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="resource-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <polyline points="9 15 12 18 15 15" />
                  </svg>
                </div>
                <div className="resource-body">
                  <div className="resource-title">샘플 데이터 다운로드</div>
                  <div className="resource-desc">실제 응답 스키마 · 4-Label 라벨링이 적용된 예시 데이터</div>
                </div>
                <svg className="resource-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            )}
            {card.githubSkillUrl && (
              <a
                href={card.githubSkillUrl}
                className="resource-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="resource-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
                  </svg>
                </div>
                <div className="resource-body">
                  <div className="resource-title">GitHub 스킬 다운로드</div>
                  <div className="resource-desc">Claude · Cursor에서 바로 사용 가능한 SKILL.md 패키지</div>
                </div>
                <svg className="resource-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      <div className="detail-cta">
        <a href="#" className="primary">
          Talk to Sales
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
        <Link href="/" scroll={false} className="secondary">
          ← 전체 12 Things 보기
        </Link>
      </div>
    </div>
  );
}
