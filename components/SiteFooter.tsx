"use client";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const PRODUCT = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const ACCOUNT = [
  { label: "Sign in", href: "/?signin=1" },
  { label: "Get started", href: "/?signin=1" },
];

const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function SiteFooter({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <footer className="sf">
      {/* Opaque wash from page bg → footer black (works on every page) */}
      <div className="sf-blend" aria-hidden />

      <div className="sf-inner">
        <div className="sf-brand">
          <Link href="/" className="sf-logo">
            <span className="sf-mark">
              <BrandLogo variant="app" size={40} />
            </span>
            ScholarBridge <em>AI</em>
          </Link>
          <p>
            AI-personalized professor outreach — find labs, draft research-aware emails, schedule, and send from your Gmail.
          </p>
        </div>

        <div className="sf-col">
          <h4>Product</h4>
          <ul>
            {PRODUCT.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="sf-col">
          <h4>Account</h4>
          <ul>
            {ACCOUNT.map((l) => (
              <li key={l.label}>
                {onGetStarted ? (
                  <button type="button" onClick={onGetStarted}>
                    {l.label}
                  </button>
                ) : (
                  <Link href={l.href}>{l.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="sf-col">
          <h4>Legal</h4>
          <ul>
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
            <li>
              <a href="mailto:alijaved.developer@gmail.com">alijaved.developer@gmail.com</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="sf-bottom">
        <span>© {new Date().getFullYear()} ScholarBridge AI. All rights reserved.</span>
        <span className="sf-bottom-links">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </div>

      <style jsx>{`
        .sf {
          border-top: none;
          background: #05070a;
          margin-top: 0;
          padding: 0 clamp(20px, 4vw, 48px) 28px;
          position: relative;
          z-index: 2;
          width: 100%;
        }
        .sf-blend {
          width: calc(100% + 2 * clamp(20px, 4vw, 48px));
          margin-left: calc(-1 * clamp(20px, 4vw, 48px));
          height: clamp(96px, 14vh, 140px);
          background: linear-gradient(
            to bottom,
            var(--bg) 0%,
            #101114 32%,
            #0a0b0e 64%,
            #05070a 100%
          );
          pointer-events: none;
        }
        .sf-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding-top: 8px;
          display: grid;
          gap: 32px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .sf-inner {
            grid-template-columns: 1.4fr 1fr 1fr 1fr;
            gap: 24px;
          }
        }
        :global(.sf-logo) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--ink);
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        :global(.sf-logo em) {
          font-style: normal;
          color: var(--acc);
        }
        .sf-mark {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sf-brand p {
          margin: 0;
          max-width: 280px;
          font-size: 14px;
          line-height: 1.55;
          color: var(--mut);
        }
        .sf-col h4 {
          margin: 0 0 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--mut);
        }
        .sf-col ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        :global(.sf-col a),
        :global(.sf-col button),
        .sf-col span {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          font-size: 14px;
          font-weight: 400;
          color: color-mix(in srgb, var(--ink) 82%, var(--mut));
          text-decoration: none;
          cursor: pointer;
          text-align: left;
        }
        :global(.sf-col a:hover),
        :global(.sf-col button:hover) {
          color: var(--acc);
        }
        .sf-col span {
          color: var(--mut);
          cursor: default;
          font-weight: 400;
        }
        .sf-bottom {
          max-width: 1400px;
          margin: 36px auto 0;
          padding-top: 20px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
          font-size: 13px;
          color: var(--mut);
        }
        :global(.sf-bottom-links) {
          display: inline-flex;
          gap: 16px;
        }
        :global(.sf-bottom-links a) {
          color: var(--mut);
          text-decoration: none;
          font-weight: 400;
        }
        :global(.sf-bottom-links a:hover) {
          color: var(--acc);
        }
      `}</style>
    </footer>
  );
}
