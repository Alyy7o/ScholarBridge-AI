"use client";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import SiteFooter from "@/components/SiteFooter";

const NAV = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function MarketingShell({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref?: string;
}) {
  return (
    <div className="ms">
      <header className="ms-nav">
        <div className="ms-nav-inner">
          <Link href="/" className="ms-brand">
            <BrandLogo variant="mark" size={44} priority />
            ScholarBridge <em>AI</em>
          </Link>
          <nav>
            {NAV.map((l) => (
              <Link key={l.href} href={l.href} className={activeHref === l.href ? "on" : undefined}>
                {l.label}
              </Link>
            ))}
            <Link href="/?signin=1" className="ms-cta">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="ms-main">
        <div className="ms-main-inner">{children}</div>
      </main>

      <SiteFooter />

      <style jsx>{`
        .ms {
          min-height: 100vh;
          width: 100%;
          background: var(--bg);
          color: var(--ink);
          font-family: "Atkinson Hyperlegible", system-ui, sans-serif;
        }
        .ms-nav {
          width: 100%;
          padding: 16px clamp(20px, 4vw, 48px);
          border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
        }
        .ms-nav-inner {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        :global(.ms-brand) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--ink);
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 18px;
          font-weight: 600;
        }
        :global(.ms-brand em) {
          font-style: normal;
          color: var(--acc);
        }
        .ms-nav nav {
          display: none;
          align-items: center;
          gap: 18px;
        }
        @media (min-width: 720px) {
          .ms-nav nav {
            display: flex;
          }
        }
        :global(.ms-nav a) {
          color: var(--mut);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }
        :global(.ms-nav a:hover),
        :global(.ms-nav a.on) {
          color: var(--ink);
        }
        :global(.ms-cta) {
          background: linear-gradient(135deg, var(--acc), var(--acc2)) !important;
          color: var(--on-acc) !important;
          border-radius: 999px;
          padding: 9px 16px !important;
        }
        .ms-main {
          width: 100%;
          padding: 36px clamp(20px, 4vw, 48px) 48px;
        }
        .ms-main-inner {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
