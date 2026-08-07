"use client";
/**
 * Scholar Bridge AI — premium hero section.
 * Left: heading, copy, CTAs, trust badges (Tailwind + Framer Motion).
 * Right: lazy-loaded React Three Fiber scene (ssr:false) wrapped in an error
 * boundary so a WebGL/model failure degrades to a soft glow instead of breaking.
 */
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import React from "react";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <SceneFallback />,
});

function SceneFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-56 w-56 animate-pulse rounded-full bg-cyan-400/20 blur-[80px]" />
      <div className="absolute h-40 w-40 rounded-full border border-cyan-400/20" />
    </div>
  );
}

class SceneBoundary extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: false };
  }
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? <SceneFallback /> : this.props.children;
  }
}

const badges = ["Research-aware search", "Sends from your email", "AI-personalized", "Free to start"];

export default function Hero({ onGetStarted }: { onGetStarted?: () => void }) {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const f = () => setMobile(window.innerWidth < 768);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-[#0a0b0f] text-white">
      {/* ambient background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-24 h-[540px] w-[540px] rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute right-0 top-40 h-[480px] w-[480px] rounded-full bg-indigo-500/20 blur-[130px]" />
      </div>

      <div className="relative mx-auto grid min-h-[92vh] max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-[45%_55%]">
        {/* Left — copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            AI-powered academic networking &amp; automated outreach
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Find Professors.
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
              Automate Outreach.
            </span>
            <br />
            Build Research Collaborations.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Scholar Bridge AI finds the right professors worldwide, matches them to your CV and research
            interests, writes personalized emails, and schedules the whole campaign across days and time slots —
            so you land research collaborations and grad-school offers faster.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => onGetStarted?.()}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-7 py-3.5 text-sm font-bold text-[#052a33] shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98]"
            >
              Start Free
            </button>
            <a
              href="#features"
              className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10"
            >
              Explore Professors
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
            {badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {b}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right — 3D scene */}
        <div className="relative h-[380px] w-full sm:h-[460px] lg:h-[660px]">
          <SceneBoundary>
            <HeroScene mobile={mobile} />
          </SceneBoundary>
          {/* fade scene into the section edges */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 70% at 55% 45%, transparent 55%, rgba(10,11,15,0.85) 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
