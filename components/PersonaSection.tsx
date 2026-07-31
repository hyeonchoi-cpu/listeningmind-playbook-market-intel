import Link from "next/link";
import type { Persona } from "@/types";
import { cardBySlug } from "@/data/cards";
import { IconTile } from "./IconTile";

function PersonaTitle({ parts }: { parts: Persona["titleParts"] }) {
  // Render newlines as <br/> within each segment.
  const renderText = (s: string, key: string) =>
    s.split("\n").map((line, i, arr) => (
      <span key={`${key}-${i}`}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  return (
    <h1 className="persona-hero-title">
      <span className="quote-mark">&ldquo;</span>
      {renderText(parts.pre, "pre")}
      <span className="accent">{parts.accent}</span>
      {renderText(parts.post, "post")}
      <span className="quote-mark">&rdquo;</span>
    </h1>
  );
}

export function PersonaSection({ persona }: { persona: Persona }) {
  return (
    <section className="page" id={persona.slug}>
      <div className="page-header">
        <span className="page-counter">{persona.counter}</span>
        <div className="page-title-row">
          <span className={`persona-badge theme-${persona.color}`}>
            <span className="dot" />{persona.badgeText}
          </span>
        </div>
        <span className="page-meta">For Enterprise · v2.0</span>
      </div>

      <div className="persona-hero">
        <div>
          <div className="persona-hero-eyebrow">{persona.eyebrow}</div>
          <PersonaTitle parts={persona.titleParts} />
          <p className="persona-hero-sub">{persona.heroSub}</p>
        </div>
        <div className="profile-card">
          {persona.profile.map((row) => (
            <div className="profile-row" key={row.label}>
              <div className="profile-label">{row.label}</div>
              <div
                className="profile-value"
                dangerouslySetInnerHTML={{
                  __html: row.isPain ? `<span class="pain">${row.value}</span>` : row.value,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="questions">
        <div className="section-label">{persona.questionsLabel}</div>
        <div className="question-list">
          {persona.questions.map((q, i) => (
            <div className="question-item" key={i}>
              <span className="q-mark">Q{i + 1}</span>{q}
            </div>
          ))}
        </div>
      </div>

      <div className="solutions">
        <div className="solutions-header">
          <h2 className="solutions-title">{persona.solutionsTitle}</h2>
          <span className="solutions-meta">{persona.solutionsMeta}</span>
        </div>
        <div className="top3-grid">
          {persona.top3.map((t) => {
            const card = cardBySlug(t.cardSlug);
            if (!card) return null;
            return (
              <Link
                href={`/cards/${card.slug}`}
                scroll={false}
                key={card.slug}
                className={`top-card theme-${persona.color}`}
              >
                <div className="top-card-header">
                  <span className="top-rank">
                    <span className="rank-num">{card.number}</span>
                  </span>
                  <IconTile svg={card.iconSvg} large />
                </div>
                <h3 className="top-name">{card.title}</h3>
                <p className="top-why" dangerouslySetInnerHTML={{ __html: t.why }} />
                <div className="top-foot">
                  <span className="ep-label">Endpoint</span>
                  <span className="ep-name">{card.endpoint}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="secondary-strip">
        {persona.secondary.map((s) => {
          const card = cardBySlug(s.cardSlug);
          if (!card) return null;
          return (
            <Link
              href={`/cards/${card.slug}`}
              scroll={false}
              key={card.slug}
              className="sec-card"
            >
              <span className="sec-num">{card.number}</span>
              <div className="sec-content">
                <div className="sec-title">{card.title}</div>
                <div className="sec-desc">{s.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="usecase">
        <div className="usecase-header">
          <span className="usecase-eyebrow">{persona.useCaseEyebrow}</span>
        </div>
        <div className="usecase-title">{persona.useCaseTitle}</div>
        <div
          className="usecase-scenario"
          dangerouslySetInnerHTML={{ __html: persona.useCaseScenario }}
        />
        <div className="usecase-flow">
          {persona.flow.map((f) => (
            <div className="flow-step" key={f.num}>
              <div className="flow-num">{f.num}</div>
              <div className="flow-action">{f.action}</div>
              <div className="flow-tool">{f.tool}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-strip">
        <div className="cta-content">
          <div className="cta-title">
            {persona.ctaTitlePre}<span className="grad">{persona.ctaTitleGrad}</span>
          </div>
          <div className="cta-sub">{persona.ctaSub}</div>
        </div>
        <a href="#" className="cta-button">
          Talk to Sales
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
