"use client";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import ResponsiveHeroBanner from "@/components/ui/responsive-hero-banner";
import FeatureGrid from "@/components/ui/feature-grid";
import VerticalSteps from "@/components/ui/vertical-steps";
import LazyMount from "@/components/ui/LazyMount";
import SiteFooter from "@/components/SiteFooter";
import BrandLogo from "@/components/BrandLogo";

const RadialFeatureGallery = dynamic(() => import("@/components/ui/RadialFeatureGallery"), {
  ssr: false,
});

const ContainerScroll = dynamic(
  () => import("@/components/ui/container-scroll-animation").then((m) => m.ContainerScroll),
  { ssr: false }
);

const ic = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const FEATURES = [
  {
    title: "Find the right professors",
    body: "Search by country, university and field of research. Add whole groups to buckets you can target later.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...ic}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: "AI personalization",
    body: "Every email is tailored to a professor's own recent papers, with a per-professor subject line — in the tone and length you choose.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...ic}>
        <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" />
      </svg>
    ),
  },
  {
    title: "Schedule & send",
    body: "Queue your whole outreach campaign across dates and times, then let it send automatically from your own Gmail.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...ic}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: "Email mining",
    body: "A shared, growing cache of professor emails harvested from open-access papers — searchable by country, university and field.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...ic}>
        <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="m3 8 9 6 9-6" />
      </svg>
    ),
  },
  {
    title: "Track every send",
    body: "See delivery status and opens for each email, with a live dashboard of your entire outreach campaign.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...ic}>
        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Buckets & bulk import",
    body: "Organize targets into buckets, or upload a spreadsheet of professors to start a campaign in seconds.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...ic}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
};
const ease = [0.16, 1, 0.3, 1] as const;

export default function Landing({ onGetStarted }: { onGetStarted?: () => void }) {
  const start = () => onGetStarted?.();

  return (
    <div className="lp">
      <ResponsiveHeroBanner
        onCtaClick={start}
        onPrimaryClick={start}
        badgeLabel="New"
        badgeText="Research-aware professor search"
        title="Reach the right"
        rotatingWords={["professors", "scientists", "colleagues"]}
        titleLine2Suffix="worldwide"
        description="Find labs by field and university, personalize every email with their research, and send from your Gmail — outreach that feels human at scale."
        primaryButtonText="Get started"
        secondaryButtonText="See how it works"
        secondaryButtonHref="/how-it-works"
        ctaButtonText="Get started"
        navLinks={[
          { label: "Features", href: "#features" },
          { label: "How it works", href: "/how-it-works" },
          { label: "About", href: "/about" },
        ]}
      />

      {/* Hero fade already lands on --bg; FeatureGrid overlaps for a continuous wash */}
      <FeatureGrid onGetStarted={start} />

      <section className="lp-sec" style={{ paddingBottom: 8 }}>
        <motion.h2 className="lp-h2" {...reveal} transition={{ duration: 0.6, ease }}>
          Everything your outreach needs
        </motion.h2>
        <motion.p className="lp-sec-sub" {...reveal} transition={{ duration: 0.6, ease, delay: 0.05 }}>
          From finding professors to landing in their inbox — scroll to spin the wheel.
        </motion.p>
        <div className="lp-scrollhint" aria-hidden="true">
          ↓ scroll
        </div>
      </section>
      <LazyMount minHeight={720} rootMargin="320px 0px">
        <RadialFeatureGallery features={FEATURES} />
      </LazyMount>

      <LazyMount minHeight={900} rootMargin="360px 0px" className="lp-scroll-demo" id="product">
        <ContainerScroll
          titleComponent={
            <>
              <h2 className="lp-scroll-kicker">Your campaign command center</h2>
              <span className="lp-scroll-display">
                One dashboard.
                <br />
                Every professor.
              </span>
            </>
          }
        >
          <div className="lp-dash-mock">
            <div className="lp-dash-bar">
              <span />
              <span />
              <span />
              <b className="lp-dash-brand">
                <BrandLogo variant="app" size={18} />
                ScholarBridge AI
              </b>
            </div>
            <div className="lp-dash-grid">
              <div className="lp-dash-stat">
                <strong>128</strong>
                <em>in buckets</em>
              </div>
              <div className="lp-dash-stat">
                <strong>42</strong>
                <em>scheduled</em>
              </div>
              <div className="lp-dash-stat">
                <strong>19</strong>
                <em>sent today</em>
              </div>
              <div className="lp-dash-list">
                {["Prof. Chen — ML systems", "Dr. Okonkwo — genomics", "Prof. Silva — HCI"].map((row) => (
                  <div key={row} className="lp-dash-row">
                    <i />
                    {row}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ContainerScroll>
      </LazyMount>

      <VerticalSteps />

      <section className="lp-sec lp-cta-sec">
        <motion.div className="lp-ctacard" {...reveal} transition={{ duration: 0.6, ease }}>
          <div className="lp-ctacard-glow" aria-hidden="true" />
          <h2 className="lp-h2" style={{ margin: "0 0 10px" }}>
            Ready to start reaching out?
          </h2>
          <p className="lp-sec-sub" style={{ margin: "0 0 22px" }}>
            Sign in with Google and send your first personalized email in minutes.
          </p>
          <button className="btn lp-cta" onClick={start}>
            Get started
          </button>
        </motion.div>
      </section>

      <SiteFooter onGetStarted={start} />

      <style jsx global>{`
        .lp-acc {
          color: var(--acc);
        }
        .lp-scrollhint {
          text-align: center;
          color: var(--mut);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 6px;
          animation: floatY 1.8s ease-in-out infinite;
        }
        .lp {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          overflow-x: hidden;
          font-family: "Atkinson Hyperlegible", system-ui, sans-serif;
        }
        .lp-h2,
        .lp-scroll-display,
        .lp-brand {
          font-family: "Crimson Pro", Georgia, serif;
        }
        .lp-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 17px;
        }
        .lp-brand.sm {
          font-size: 14px;
        }
        .lp-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          color: var(--on-acc);
        }
        .lp-logo.sm {
          width: 26px;
          height: 26px;
          border-radius: 7px;
        }
        .lp-sec {
          max-width: 1040px;
          margin: 0 auto;
          padding: 46px 24px;
        }
        .lp-h2 {
          text-align: center;
          font-size: clamp(26px, 3.5vw, 34px);
          margin: 0 0 8px;
          letter-spacing: -0.4px;
          font-weight: 700;
        }
        .lp-sec-sub {
          text-align: center;
          color: var(--mut);
          margin: 0 auto 30px;
          max-width: 560px;
        }
        .lp-scroll-demo {
          position: relative;
          overflow: hidden;
          background: #05070a;
        }
        .lp-scroll-demo::before,
        .lp-scroll-demo::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: clamp(100px, 16vh, 160px);
          z-index: 6;
          pointer-events: none;
        }
        .lp-scroll-demo::before {
          top: 0;
          background: linear-gradient(to bottom, var(--bg), transparent);
        }
        .lp-scroll-demo::after {
          bottom: 0;
          background: linear-gradient(to top, var(--bg), transparent);
        }
        .lp-cta-sec {
          position: relative;
          z-index: 1;
          padding-top: 56px;
          padding-bottom: 48px;
          /* Stay on page bg — footer owns the blend into #05070a */
          background: transparent;
        }
        .lp-ctacard {
          position: relative;
          overflow: hidden;
          text-align: center;
          background: linear-gradient(
            165deg,
            color-mix(in srgb, var(--card) 92%, var(--acc)),
            var(--card)
          );
          border: 1px solid color-mix(in srgb, var(--acc) 28%, var(--line));
          border-radius: 24px;
          padding: 48px 28px;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--acc) 8%, transparent),
            0 24px 60px rgba(0, 0, 0, 0.28);
        }
        .lp-ctacard-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(
            ellipse 55% 50% at 50% 40%,
            color-mix(in srgb, var(--acc) 22%, transparent),
            transparent 68%
          );
          pointer-events: none;
        }
        .lp-scroll-kicker {
          font-size: clamp(18px, 2.5vw, 24px);
          font-weight: 600;
          color: rgba(242, 243, 245, 0.7);
          margin: 0 0 8px;
        }
        .lp-scroll-display {
          display: block;
          font-size: clamp(36px, 7vw, 72px);
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: #fff;
          margin-top: 4px;
        }
        .lp-dash-mock {
          height: 100%;
          background: linear-gradient(160deg, #12141a, #0a0b0f);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .lp-dash-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .lp-dash-bar span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3a3a3c;
        }
        .lp-dash-bar span:nth-child(1) {
          background: #ef4444;
        }
        .lp-dash-bar span:nth-child(2) {
          background: #eab308;
        }
        .lp-dash-bar span:nth-child(3) {
          background: #22c55e;
        }
        .lp-dash-bar b {
          margin-left: 10px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
        }
        .lp-dash-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .lp-dash-grid {
          padding: 22px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          flex: 1;
        }
        .lp-dash-stat {
          background: rgba(34, 211, 238, 0.08);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: 14px;
          padding: 16px;
          color: #fff;
        }
        .lp-dash-stat strong {
          display: block;
          font-size: 28px;
          font-weight: 800;
          color: #22d3ee;
        }
        .lp-dash-stat em {
          font-style: normal;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lp-dash-list {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lp-dash-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.85);
          font-size: 14px;
          font-weight: 600;
        }
        .lp-dash-row i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22d3ee, #38bdf8);
          flex: 0 0 auto;
        }
        .lp-cta {
          padding: 13px 26px;
          font-size: 15px;
        }
        @keyframes floatY {
          0%,
          100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -14px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-scrollhint {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
