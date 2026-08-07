"use client";
import Link from "next/link";
import { motion } from "motion/react";
import SiteFooter from "@/components/SiteFooter";
import BrandLogo from "@/components/BrandLogo";
import { HOW_IT_WORKS_STEPS } from "@/lib/how-it-works-steps";

export default function HowItWorksPage() {
  return (
    <div className="hiw">
      <header className="hiw-nav">
        <Link href="/" className="hiw-brand">
          <span className="hiw-mark">
            <BrandLogo variant="mark" size={44} priority />
          </span>
          ScholarBridge <em>AI</em>
        </Link>
        <nav>
          <Link href="/#features">Features</Link>
          <Link href="/how-it-works" className="on">
            How it works
          </Link>
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/?signin=1" className="hiw-cta">
            Get started
          </Link>
        </nav>
      </header>

      <main className="hiw-main">
        <motion.div
          className="hiw-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="hiw-eyebrow">How it works</span>
          <h1>From search to sent — in five clear steps</h1>
          <p>
            ScholarBridge AI is built for applicants and researchers who need to reach the right labs with personal, research-aware outreach — without drowning in spreadsheets.
          </p>
        </motion.div>

        <ol className="hiw-steps">
          {HOW_IT_WORKS_STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="hiw-n">{s.n}</span>
              <div>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <section className="hiw-cta-block">
          <h2>Ready to try it?</h2>
          <p>Sign in with Google and build your first personalized outreach list in minutes.</p>
          <Link href="/?signin=1" className="hiw-cta lg">
            Get started — it&apos;s free
          </Link>
        </section>
      </main>

      <SiteFooter />
      <style jsx>{`
        .hiw {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          font-family: "Atkinson Hyperlegible", system-ui, sans-serif;
        }
        .hiw-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px clamp(20px, 4vw, 48px);
          backdrop-filter: blur(12px);
          background: color-mix(in srgb, var(--bg) 82%, transparent);
          border-bottom: 1px solid var(--line);
          width: 100%;
        }
        :global(.hiw-brand) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--ink);
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 17px;
          font-weight: 600;
        }
        :global(.hiw-brand em) {
          font-style: normal;
          color: var(--acc);
        }
        .hiw-mark {
          width: 44px;
          height: 44px;
          border-radius: 0;
          display: grid;
          place-items: center;
          overflow: visible;
          flex-shrink: 0;
        }
        .hiw-nav nav {
          display: none;
          align-items: center;
          gap: 18px;
        }
        @media (min-width: 720px) {
          .hiw-nav nav {
            display: flex;
          }
        }
        :global(.hiw-nav a) {
          color: var(--mut);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }
        :global(.hiw-nav a:hover),
        :global(.hiw-nav a.on) {
          color: var(--ink);
        }
        :global(.hiw-cta) {
          background: linear-gradient(135deg, var(--acc), var(--acc2)) !important;
          color: var(--on-acc) !important;
          padding: 8px 14px;
          border-radius: 999px;
        }
        :global(.hiw-cta.lg) {
          display: inline-flex;
          padding: 13px 22px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
        }
        .hiw-main {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px clamp(20px, 4vw, 48px) 64px;
        }
        .hiw-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--acc);
          margin-bottom: 12px;
        }
        .hiw-hero h1 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          line-height: 1.15;
        }
        .hiw-hero p {
          margin: 0;
          font-size: 17px;
          line-height: 1.6;
          color: var(--mut);
        }
        .hiw-steps {
          list-style: none;
          margin: 48px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        :global(.hiw-steps li) {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 16px;
          padding: 22px;
          border-radius: 18px;
          background: var(--card);
          border: 1px solid var(--line);
        }
        .hiw-n {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 14px;
          color: var(--on-acc);
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          box-shadow: 0 10px 24px color-mix(in srgb, var(--acc) 30%, transparent);
        }
        :global(.hiw-steps h2) {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 22px;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        :global(.hiw-steps p) {
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
          color: var(--mut);
        }
        .hiw-cta-block {
          margin-top: 48px;
          text-align: center;
          padding: 40px 24px;
          border-radius: 20px;
          border: 1px solid color-mix(in srgb, var(--acc) 40%, var(--line));
          background: var(--card);
        }
        .hiw-cta-block h2 {
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 28px;
          margin: 0 0 8px;
        }
        .hiw-cta-block p {
          margin: 0 0 20px;
          color: var(--mut);
        }
      `}</style>
    </div>
  );
}
