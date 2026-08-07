"use client";
/**
 * Why ScholarBridge — asymmetric bento with generated feature visuals.
 */
import { motion } from "motion/react";

const FEATURES = [
  {
    title: "Find professors worldwide",
    body: "Search 30,000+ professor emails across 100+ countries by university and field — then add matches to buckets.",
    tag: "Discover",
    span: "wide",
    image: "/brand/features/feature-discover.png",
  },
  {
    title: "AI personalization",
    body: "Every draft is tailored to a professor’s recent papers — tone and length you choose.",
    tag: "Compose",
    span: "tall",
    image: "/brand/features/feature-ai-draft.png",
  },
  {
    title: "Schedule from Gmail",
    body: "Queue campaigns across dates and times, then send automatically from your inbox.",
    tag: "Send",
    span: "normal",
    image: "/brand/features/feature-schedule.png",
  },
  {
    title: "Research-aware matching",
    body: "Match your outreach to each professor’s work so every note feels specific, not mass-mailed.",
    tag: "Match",
    span: "normal",
    image: "/brand/features/feature-match.png",
  },
  {
    title: "Track every send",
    body: "Delivery status and opens in one live dashboard for your whole outreach campaign.",
    tag: "Insights",
    span: "normal",
    image: "/brand/features/feature-analytics.png",
  },
  {
    title: "Private by default",
    body: "Campaigns run from your Gmail. Your drafts and lists stay in your account — not a shared inbox.",
    tag: "Trust",
    span: "normal",
    image: "/brand/features/feature-privacy.png",
  },
];

const STATS = [
  { n: "30,000+", l: "professor emails available" },
  { n: "100+", l: "countries covered" },
  { n: "100%", l: "sent from your Gmail" },
];

export default function FeatureGrid({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="features" className="fg">
      <div className="fg-inner">
        <motion.div
          className="fg-head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="fg-eyebrow">Why ScholarBridge</span>
          <h2 className="fg-h2">Outreach that reads as research-aware</h2>
          <p className="fg-lead">
            One workspace to find the right labs, personalize messages, and ship campaigns without spreadsheet chaos.
          </p>
        </motion.div>

        <div className="fg-bento">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              className={`fg-card ${f.span}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="fg-media"
                style={{ backgroundImage: `url(${f.image})` }}
                aria-hidden
              />
              <div className="fg-shade" aria-hidden />
              <div className="fg-card-top">
                <span className="fg-tag">{f.tag}</span>
              </div>
              <h3 className="fg-title">{f.title}</h3>
              <p className="fg-body">{f.body}</p>
            </motion.article>
          ))}

          <motion.div
            className="fg-stats"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="fg-stats-grid">
              {STATS.map((s) => (
                <div key={s.l} className="fg-stat">
                  <strong>{s.n}</strong>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
            <button type="button" className="fg-cta" onClick={onGetStarted}>
              Start free
              <span aria-hidden>→</span>
            </button>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .fg {
          position: relative;
          z-index: 1;
          margin-top: -180px;
          padding: 200px 24px 64px;
          /* Same continuous page wash — no solid plate that creates a seam */
          background: transparent;
        }
        .fg::before {
          content: none;
        }
        .fg::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse 50% 40% at 70% 28%, color-mix(in srgb, var(--acc) 10%, transparent), transparent 70%);
        }
        .fg-inner {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
        }
        .fg-head {
          text-align: center;
          max-width: 640px;
          margin: 0 auto 40px;
        }
        .fg-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--acc);
          margin-bottom: 12px;
        }
        .fg-h2 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
          color: var(--ink);
        }
        .fg-lead {
          margin: 0;
          color: var(--mut);
          font-size: 16px;
          line-height: 1.55;
        }
        .fg-bento {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 768px) {
          .fg-bento {
            grid-template-columns: repeat(6, 1fr);
            grid-auto-rows: minmax(160px, auto);
          }
        }
        :global(.fg-card) {
          position: relative;
          overflow: hidden;
          padding: 24px;
          border-radius: 22px;
          background: var(--card);
          border: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          min-height: 200px;
          transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        @media (min-width: 768px) {
          :global(.fg-card.wide) {
            grid-column: span 4;
            grid-row: span 1;
            min-height: 220px;
          }
          :global(.fg-card.tall) {
            grid-column: span 2;
            grid-row: span 2;
            min-height: 100%;
          }
          :global(.fg-card.normal) {
            grid-column: span 2;
            min-height: 210px;
          }
        }
        :global(.fg-card:hover) {
          border-color: color-mix(in srgb, var(--acc) 50%, var(--line));
          transform: translateY(-3px);
          box-shadow: 0 22px 50px rgba(0, 0, 0, 0.28);
        }
        :global(.fg-media) {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.55;
          transform: scale(1.02);
          transition: opacity 0.35s ease, transform 0.45s ease;
        }
        :global(.fg-card:hover .fg-media) {
          opacity: 0.7;
          transform: scale(1.06);
        }
        :global(.fg-shade) {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--card) 35%, transparent) 0%,
            color-mix(in srgb, var(--card) 88%, transparent) 45%,
            var(--card) 100%
          );
          pointer-events: none;
        }
        :global(.fg-card-top) {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: auto;
          padding-bottom: 20px;
        }
        :global(.fg-tag) {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--acc);
          border: 1px solid color-mix(in srgb, var(--acc) 30%, var(--line));
          background: color-mix(in srgb, var(--card) 70%, transparent);
          backdrop-filter: blur(8px);
          border-radius: 999px;
          padding: 5px 10px;
        }
        :global(.fg-title) {
          position: relative;
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(20px, 2.4vw, 26px);
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        :global(.fg-body) {
          position: relative;
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: var(--mut);
          max-width: 36ch;
        }
        :global(.fg-card.tall .fg-body) {
          max-width: none;
        }
        :global(.fg-stats) {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 22px 24px;
          border-radius: 22px;
          background: linear-gradient(120deg, color-mix(in srgb, var(--acc) 12%, var(--card)), var(--card));
          border: 1px solid color-mix(in srgb, var(--acc) 28%, var(--line));
        }
        @media (min-width: 720px) {
          :global(.fg-stats) {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        :global(.fg-stats-grid) {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          flex: 1;
        }
        @media (max-width: 560px) {
          :global(.fg-stats-grid) {
            grid-template-columns: 1fr;
          }
        }
        :global(.fg-stat) {
          text-align: center;
        }
        @media (min-width: 720px) {
          :global(.fg-stat) {
            text-align: left;
            padding: 0 12px;
            border-right: 1px solid color-mix(in srgb, var(--acc) 20%, var(--line));
          }
          :global(.fg-stat:last-child) {
            border-right: none;
          }
        }
        :global(.fg-stat strong) {
          display: block;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 800;
          background: linear-gradient(120deg, var(--acc), var(--acc2));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          line-height: 1.15;
        }
        :global(.fg-stat span) {
          font-size: 12px;
          color: var(--mut);
          font-weight: 600;
        }
        .fg-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          align-self: center;
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          color: var(--on-acc);
          border: none;
          border-radius: 999px;
          padding: 12px 20px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 12px 28px color-mix(in srgb, var(--acc) 30%, transparent);
          transition: transform 0.2s;
        }
        @media (min-width: 720px) {
          .fg-cta {
            align-self: auto;
          }
        }
        .fg-cta:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  );
}
