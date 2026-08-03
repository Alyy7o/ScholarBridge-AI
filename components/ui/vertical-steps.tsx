"use client";
/**
 * Vertical process steps — numbered circles with a continuous centered connector line.
 */
import { motion } from "motion/react";

export type VerticalStep = {
  n: string;
  title: string;
  body: string;
};

const DEFAULT_STEPS: VerticalStep[] = [
  {
    n: "1",
    title: "Build your list",
    body: "Search professors or upload a spreadsheet, and sort them into buckets.",
  },
  {
    n: "2",
    title: "Draft with AI",
    body: "We research each professor's papers and write a personalized email + subject.",
  },
  {
    n: "3",
    title: "Schedule & send",
    body: "Pick your slots and send automatically from your Gmail — then track every one.",
  },
];

export default function VerticalSteps({
  steps = DEFAULT_STEPS,
  heading = "From list to inbox",
  subheading = "Three focused steps. Search, personalize, and send — without the spreadsheet scramble.",
}: {
  steps?: VerticalStep[];
  heading?: string;
  subheading?: string;
}) {
  return (
    <section id="how" className="vs">
      <motion.div
        className="vs-head"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="vs-heading">{heading}</h2>
        <p className="vs-sub">{subheading}</p>
      </motion.div>

      <div className="vs-list">
        {/* Continuous line through all step centers */}
        <div className="vs-rail" aria-hidden />

        {steps.map((s, i) => (
          <motion.article
            key={s.n}
            className="vs-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="vs-track" aria-hidden>
              <span className="vs-node">{s.n}</span>
            </div>
            <div className="vs-body">
              <span className="vs-kicker">Step {String(i + 1).padStart(2, "0")}</span>
              <h3 className="vs-title">{s.title}</h3>
              <p className="vs-text">{s.body}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <style jsx>{`
        .vs {
          max-width: 720px;
          margin: 0 auto;
          padding: 64px 24px 80px;
        }
        .vs-head {
          text-align: center;
          margin-bottom: 44px;
        }
        .vs-heading {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(28px, 4vw, 38px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .vs-sub {
          margin: 0 auto;
          max-width: 480px;
          color: var(--mut);
          font-size: 15px;
          line-height: 1.55;
        }
        .vs-list {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .vs-rail {
          position: absolute;
          left: 23px;
          top: 22px;
          bottom: 22px;
          width: 2px;
          border-radius: 2px;
          background: color-mix(in srgb, var(--acc) 40%, var(--line));
          z-index: 0;
          pointer-events: none;
        }
        :global(.vs-card) {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 20px;
          align-items: start;
        }
        :global(.vs-track) {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 48px;
        }
        :global(.vs-node) {
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
          color: var(--on-acc);
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--acc) 16%, transparent),
            0 10px 24px color-mix(in srgb, var(--acc) 32%, transparent);
          position: relative;
          z-index: 1;
        }
        :global(.vs-body) {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px 22px;
          margin-bottom: 18px;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
        }
        :global(.vs-card:last-child .vs-body) {
          margin-bottom: 0;
        }
        :global(.vs-card:hover .vs-body) {
          border-color: color-mix(in srgb, var(--acc) 45%, var(--line));
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
          transform: translateY(-2px);
        }
        :global(.vs-kicker) {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--acc);
          margin-bottom: 8px;
        }
        :global(.vs-title) {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(22px, 3vw, 28px);
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        :global(.vs-text) {
          margin: 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--mut);
        }
      `}</style>
    </section>
  );
}
