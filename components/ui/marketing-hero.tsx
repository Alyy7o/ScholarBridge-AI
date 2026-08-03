"use client";
/**
 * Cinematic hero — Earth limb outline + MagicUI-style word rotate.
 * Layout inspired by Omi-style space landings; themed for ScholarBridge.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const WORDS = ["professors", "labs", "advisors", "collaborators"];

function WordRotate({ words, interval = 2600 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  // Reserve width of the longest word to avoid layout jump
  const widest = words.reduce((a, b) => (b.length > a.length ? b : a), words[0]);

  return (
    <span className="wr">
      <span className="wr-sizer" aria-hidden>
        {widest}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          className="wr-word"
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
      <style jsx>{`
        .wr {
          position: relative;
          display: inline-block;
          vertical-align: bottom;
          overflow: hidden;
          height: 1.1em;
        }
        .wr-sizer {
          visibility: hidden;
          white-space: nowrap;
        }
        :global(.wr-word) {
          position: absolute;
          left: 0;
          top: 0;
          white-space: nowrap;
          background: linear-gradient(120deg, #7dd3fc, #22d3ee 50%, #a5f3fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>
    </span>
  );
}

export default function MarketingHero({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section className="mh">
      <div className="mh-bg" aria-hidden>
        <div className="mh-stars" />
        {/* Earth atmospheric limb — large circle outline with cyan glow */}
        <div className="mh-earth">
          <svg className="mh-earth-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
            <defs>
              <radialGradient id="earthFill" cx="50%" cy="100%" r="70%">
                <stop offset="0%" stopColor="rgba(14, 116, 144, 0.35)" />
                <stop offset="45%" stopColor="rgba(8, 47, 73, 0.18)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
              <linearGradient id="earthStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
                <stop offset="25%" stopColor="rgba(56, 189, 248, 0.85)" />
                <stop offset="50%" stopColor="rgba(165, 243, 252, 0.95)" />
                <stop offset="75%" stopColor="rgba(34, 211, 238, 0.75)" />
                <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
              </linearGradient>
              <filter id="earthGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle cx="600" cy="980" r="620" fill="url(#earthFill)" />
            <circle
              cx="600"
              cy="980"
              r="620"
              fill="none"
              stroke="url(#earthStroke)"
              strokeWidth="3"
              filter="url(#earthGlow)"
            />
            <circle cx="600" cy="980" r="608" fill="none" stroke="rgba(125, 211, 252, 0.15)" strokeWidth="10" />
          </svg>
        </div>
      </div>

      <div className="mh-inner">
        <motion.div
          className="mh-copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="mh-badge">
            <span className="mh-new">New</span>
            Research-aware professor search
          </span>

          <h1 className="mh-title">
            Reach the right
            <br />
            <WordRotate words={WORDS} />
            <br />
            across the globe
          </h1>

          <p className="mh-sub">
            Find labs by field and university, personalize every email with their research, and send from your Gmail — outreach that feels human at scale.
          </p>

          <div className="mh-cta">
            <button type="button" className="mh-btn" onClick={onGetStarted}>
              Get started <span aria-hidden>→</span>
            </button>
            <a href="#features" className="mh-link">
              <span className="mh-play" aria-hidden />
              See how it works
            </a>
          </div>

          <p className="mh-partners">Trusted by applicants bridging academia worldwide</p>
        </motion.div>
      </div>

      <style jsx>{`
        .mh {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 110px 24px 140px;
          background: #05070a;
          color: #f2f3f5;
        }
        .mh-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .mh-stars {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(1.2px 1.2px at 10% 20%, rgba(255, 255, 255, 0.55), transparent),
            radial-gradient(1.2px 1.2px at 30% 60%, rgba(180, 230, 255, 0.4), transparent),
            radial-gradient(1px 1px at 55% 15%, rgba(255, 255, 255, 0.45), transparent),
            radial-gradient(1.4px 1.4px at 72% 45%, rgba(180, 230, 255, 0.4), transparent),
            radial-gradient(1px 1px at 88% 70%, rgba(255, 255, 255, 0.35), transparent),
            radial-gradient(1.2px 1.2px at 42% 85%, rgba(180, 230, 255, 0.3), transparent),
            radial-gradient(1px 1px at 18% 40%, rgba(255, 255, 255, 0.4), transparent);
          opacity: 0.85;
        }
        .mh-earth {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -8%;
          height: 72%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .mh-earth-svg {
          width: 140%;
          max-width: none;
          height: 100%;
          animation: mhPulse 10s ease-in-out infinite;
        }
        .mh-inner {
          position: relative;
          z-index: 1;
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }
        .mh-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(230, 238, 245, 0.85);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          padding: 6px 14px 6px 6px;
          margin-bottom: 28px;
        }
        .mh-new {
          background: #f2f3f5;
          color: #0a0b0f;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 5px 9px;
          border-radius: 999px;
        }
        .mh-title {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(40px, 8vw, 72px);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin: 0 0 22px;
        }
        .mh-sub {
          margin: 0 auto 30px;
          max-width: 540px;
          font-size: clamp(15px, 2vw, 18px);
          line-height: 1.6;
          color: rgba(210, 220, 230, 0.78);
        }
        .mh-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          justify-content: center;
          align-items: center;
          margin-bottom: 36px;
        }
        .mh-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 22px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(12, 14, 18, 0.65);
          color: #fff;
          transition: background 0.2s, transform 0.2s, border-color 0.2s;
        }
        .mh-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(34, 211, 238, 0.45);
          transform: translateY(-1px);
        }
        .mh-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: rgba(235, 240, 245, 0.88);
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
        }
        .mh-link:hover {
          color: #fff;
        }
        .mh-play {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          display: inline-block;
          position: relative;
        }
        .mh-play::after {
          content: "";
          position: absolute;
          left: 10px;
          top: 8px;
          border-style: solid;
          border-width: 5px 0 5px 8px;
          border-color: transparent transparent transparent #e2e8f0;
        }
        .mh-partners {
          margin: 0;
          font-size: 12px;
          color: rgba(160, 175, 190, 0.55);
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        @keyframes mhPulse {
          0%,
          100% {
            opacity: 0.92;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-6px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mh-earth-svg {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
