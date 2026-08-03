"use client";
/**
 * Feature showcase — redesigned from bento into a clean vertical feature stack
 * with scroll reveal (replaces empty-image bento cards).
 */
import { motion } from "motion/react";

const FEATURES = [
  {
    title: "Find professors worldwide",
    body: "Search by country, university, and field of research. Add whole groups to buckets you can target later.",
    tag: "Discover",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    ),
  },
  {
    title: "AI personalization",
    body: "Every email is tailored to a professor's recent papers — tone and length you choose.",
    tag: "Compose",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" />
      </svg>
    ),
  },
  {
    title: "Schedule from your Gmail",
    body: "Queue your campaign across dates and times, then send automatically — and track every delivery.",
    tag: "Outreach",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
];

const STATS = [
  { n: "250M+", l: "research papers indexed" },
  { n: "< 30s", l: "to a personalized draft" },
  { n: "100%", l: "sent from your Gmail" },
];

export function FeatureBento({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="features" className="fx">
      <div className="fx-inner">
        <motion.div
          className="fx-head"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="fx-h2">Built for academic outreach</h2>
          <p className="fx-lead">From discovery to inbox — without the spreadsheet chaos.</p>
        </motion.div>

        <div className="fx-rows">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              className={`fx-row ${i % 2 ? "rev" : ""}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="fx-visual" aria-hidden>
                <div className="fx-orb" />
                <span className="fx-ic">{f.icon}</span>
              </div>
              <div className="fx-copy">
                <span className="fx-tag">{f.tag}</span>
                <h3 className="fx-title">{f.title}</h3>
                <p className="fx-body">{f.body}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="fx-stats"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {STATS.map((s) => (
            <div key={s.l} className="fx-stat">
              <strong>{s.n}</strong>
              <span>{s.l}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="fx-cta"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <button type="button" className="btn" onClick={() => onGetStarted?.()}>
            Start free
          </button>
        </motion.div>
      </div>

      <style jsx>{`
        .fx {
          padding: 56px 24px 24px;
          background: var(--bg);
        }
        .fx-inner {
          max-width: 900px;
          margin: 0 auto;
        }
        .fx-head {
          text-align: center;
          margin-bottom: 48px;
        }
        .fx-h2 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .fx-lead {
          margin: 0;
          color: var(--mut);
          font-size: 16px;
        }
        .fx-rows {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        :global(.fx-row) {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: center;
          padding: 8px 0;
        }
        @media (min-width: 720px) {
          :global(.fx-row) {
            grid-template-columns: 200px 1fr;
            gap: 36px;
          }
          :global(.fx-row.rev) {
            grid-template-columns: 1fr 200px;
          }
          :global(.fx-row.rev .fx-visual) {
            order: 2;
          }
        }
        :global(.fx-visual) {
          position: relative;
          aspect-ratio: 1;
          max-width: 200px;
          margin: 0 auto;
          border-radius: 24px;
          background: linear-gradient(145deg, color-mix(in srgb, var(--acc) 18%, var(--card)), var(--card));
          border: 1px solid color-mix(in srgb, var(--acc) 28%, var(--line));
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        :global(.fx-orb) {
          position: absolute;
          width: 70%;
          height: 70%;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--acc) 35%, transparent), transparent 70%);
          filter: blur(12px);
          animation: fxFloat 6s ease-in-out infinite;
        }
        :global(.fx-ic) {
          position: relative;
          z-index: 1;
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: var(--on-acc);
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          box-shadow: 0 14px 32px color-mix(in srgb, var(--acc) 40%, transparent);
        }
        :global(.fx-tag) {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--acc);
          margin-bottom: 10px;
        }
        :global(.fx-title) {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 700;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        :global(.fx-body) {
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
          color: var(--mut);
          max-width: 420px;
        }
        .fx-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 48px;
          padding: 28px 20px;
          border-radius: 20px;
          background: var(--card);
          border: 1px solid var(--line);
        }
        @media (max-width: 640px) {
          .fx-stats {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        :global(.fx-stat) {
          text-align: center;
        }
        :global(.fx-stat strong) {
          display: block;
          font-size: clamp(26px, 4vw, 34px);
          font-weight: 800;
          background: linear-gradient(120deg, var(--acc), var(--acc2));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          line-height: 1.1;
        }
        :global(.fx-stat span) {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--mut);
          font-weight: 600;
        }
        .fx-cta {
          text-align: center;
          margin-top: 28px;
        }
        @keyframes fxFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.fx-orb) {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

export default FeatureBento;
