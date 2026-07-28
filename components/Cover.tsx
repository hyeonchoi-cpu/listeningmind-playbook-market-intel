import Link from "next/link";
import { cards, cardsByBand } from "@/data/cards";
import type { Card, Band } from "@/types";
import { IconTile } from "./IconTile";

const BANDS: { key: Band; num: string; title: string; tag: string }[] = [
  { key: "discovery", num: "01 / Discovery", title: "Find what's there before anyone else", tag: "시장 발견 · 의도 해석 · 여정 추적" },
  { key: "intelligence", num: "02 / Intelligence", title: "Read the signal, not the noise", tag: "트렌드 포착 · 점유율 측정 · 수요 분류" },
  { key: "action", num: "03 / Action", title: "Turn signal into decisions", tag: "경쟁 비교 · 가설 검증 · 글로벌 · Agent" },
];

function CoverCard({ card }: { card: Card }) {
  return (
    <Link
      href={`/cards/${card.slug}`}
      scroll={false}
      className="cover-card"
      data-color={card.color}
    >
      {card.isNew && <span className="new-badge">NEW</span>}
      <div className="cover-card-top">
        <span className="cover-card-num">{card.number}</span>
        <IconTile svg={card.iconSvg} />
      </div>
      <h3 className="cover-card-title">{card.title}</h3>
      <p className="cover-card-desc">{card.shortDesc}</p>
      <div className="cover-card-foot">
        <div className="cover-card-personas">
          {card.personas.map((p) => (
            <span key={p} className="persona-chip">{p}</span>
          ))}
        </div>
        <div className="cover-card-endpoint">
          <span className="arrow">→</span>
          <span className="ep">{card.endpoint}</span>
        </div>
      </div>
    </Link>
  );
}

export function Cover() {
  return (
    <section className="page" id="cover">
      <div className="cover-topbar">
        <div className="cover-brand">
          <div className="cover-brand-logo" />
          <div className="cover-brand-name">
            ListeningMind <span className="sep">/</span>
            <span className="pill-text">DaaS Platform</span>
          </div>
        </div>
        <div className="cover-actions">
          <Link href="/industries" className="pill">
            <span className="pill-dot" />업권별 마켓 인텔리전스 →
          </Link>
          <span className="pill"><span className="pill-dot" />MCP-Native</span>
          <span className="pill">v2.0 · 2026</span>
        </div>
      </div>

      <div className="cover-hero">
        <div>
          <div className="cover-eyebrow">For Enterprise</div>
          <h1 className="cover-title">
            <span className="num">12</span> Powerful Things<br />
            Your Enterprise Can Do<br />
            with <span className="grad">ListeningMind</span>
          </h1>
          <p className="cover-sub">
            Decode demand. Outpace competitors. Decide with the market&apos;s actual signal — not the lagging dashboards.
          </p>
        </div>
        <div>
          <div className="persona-board">
            <div className="persona-board-title">Built for 6 Personas · 클릭하여 상세보기</div>
            <div className="persona-grid">
              <a href="#cmo" className="persona-row" data-color="red"><span className="persona-tag">CMO</span><span className="persona-name">Brand Strategy</span></a>
              <a href="#mi" className="persona-row" data-color="blue"><span className="persona-tag">MI</span><span className="persona-name">Market Intel</span></a>
              <a href="#md" className="persona-row" data-color="yellow"><span className="persona-tag">MD</span><span className="persona-name">Merchandising</span></a>
              <a href="#pm" className="persona-row" data-color="green"><span className="persona-tag">PM</span><span className="persona-name">Product Mgmt</span></a>
              <a href="#gro" className="persona-row" data-color="purple"><span className="persona-tag">GRO</span><span className="persona-name">Growth Mktg</span></a>
              <a href="#dat" className="persona-row" data-color="teal"><span className="persona-tag">DAT</span><span className="persona-name">Data / AI Lead</span></a>
            </div>
          </div>
        </div>
      </div>

      {BANDS.map((b) => (
        <div key={b.key} className="cover-section">
          <div className="cover-section-header">
            <div className="cover-section-title-row">
              <span className="cover-section-num">{b.num}</span>
              <h2 className="cover-section-title">{b.title}</h2>
            </div>
            <span className="cover-section-tag">{b.tag}</span>
          </div>
          <div className="cover-grid">
            {cardsByBand(b.key).map((c) => (
              <CoverCard key={c.slug} card={c} />
            ))}
          </div>
        </div>
      ))}

      <div className="cta-strip large">
        <div className="cta-content">
          <div className="cta-eyebrow">Ready to start</div>
          <div className="cta-title">
            Smarter signals. <span className="grad">Sharper decisions.</span>
          </div>
          <div className="cta-sub">
            Built for intent-driven enterprises — and the AI agents working alongside them.
          </div>
        </div>
        <a href="#cmo" className="cta-button">
          페르소나별 자세히 보기
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="foot">
        <span>Inspired by Google AI Studio · Refactored for Enterprise Personas</span>
        <span>For 클로이 · Data Strategy · 2026 · Total {cards.length} cards</span>
      </div>
    </section>
  );
}
