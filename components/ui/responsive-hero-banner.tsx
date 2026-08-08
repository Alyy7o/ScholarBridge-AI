"use client";
/**
 * ResponsiveHeroBanner — ScholarBridge-themed cinematic hero.
 * Limb glow recolored toward cyan; nav CTAs match site accents.
 */
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export interface NavLink {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface ResponsiveHeroBannerProps {
  backgroundImageUrl?: string;
  navLinks?: NavLink[];
  ctaButtonText?: string;
  onCtaClick?: () => void;
  badgeText?: string;
  badgeLabel?: string;
  title?: string;
  rotatingWords?: string[];
  titleLine2Suffix?: string;
  description?: string;
  primaryButtonText?: string;
  onPrimaryClick?: () => void;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}

const DEFAULT_BG =
  "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/0e2dbea0-c0a9-413f-a57b-af279633c0df_3840w.jpg";

/** Same length (10 chars) — keeps title width stable while rotating */
const DEFAULT_WORDS = ["professors", "scientists", "colleagues"];

function WordRotate({ words, interval = 4200 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <span className="rhb-wr">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[i]}
          className="rhb-wr-word"
          initial={{ y: "0.4em", opacity: 0 }}
          animate={{ y: "0em", opacity: 1 }}
          exit={{ y: "-0.4em", opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
  backgroundImageUrl = DEFAULT_BG,
  navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "/how-it-works" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  ctaButtonText = "Get started",
  onCtaClick,
  badgeLabel = "New",
  badgeText = "Research-aware professor search",
  title = "Reach the right",
  rotatingWords = DEFAULT_WORDS,
  titleLine2Suffix = "worldwide",
  description = "Find labs by field and university, personalize every email with their research, and send from your email — outreach that feels human at scale.",
  primaryButtonText = "Get started",
  onPrimaryClick,
  secondaryButtonText = "See how it works",
  secondaryButtonHref = "/how-it-works",
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavItem = ({ link }: { link: NavLink }) => {
    const external = link.href.startsWith("/");
    const cls = `rhb-link ${link.isActive ? "active" : ""}`;
    if (external) {
      return (
        <Link href={link.href} className={cls}>
          {link.label}
        </Link>
      );
    }
    return (
      <a href={link.href} className={cls}>
        {link.label}
      </a>
    );
  };

  return (
    <section className="rhb">
      <img
        src={backgroundImageUrl}
        alt="Academic research network illustrating ScholarBridge AI professor outreach worldwide"
        className="rhb-bg"
      />
      <div className="rhb-tint" aria-hidden />
      <div className="rhb-veil" aria-hidden />
      <div className="rhb-fade" aria-hidden />

      <header className="rhb-header">
        <div className="rhb-header-row">
          <a href="/" className="rhb-brand">
            <span className="rhb-logo">
              <BrandLogo variant="mark" size={44} priority />
            </span>
            ScholarBridge <em>AI</em>
          </a>

          <nav className="rhb-nav desktop">
            <div className="rhb-pill">
              {navLinks.map((link) => (
                <NavItem key={link.href + link.label} link={link} />
              ))}
            </div>
            <div className="rhb-nav-actions">
              <button type="button" className="rhb-btn ghost" onClick={onCtaClick}>
                Sign in
              </button>
              <button type="button" className="rhb-btn solid" onClick={onCtaClick}>
                {ctaButtonText}
              </button>
            </div>
          </nav>

          <button
            type="button"
            className="rhb-burger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16" />
              <path d="M4 12h16" />
              <path d="M4 19h16" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="rhb-mobile">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </a>
              )
            )}
            <button type="button" className="rhb-btn ghost full" onClick={onCtaClick}>
              Sign in
            </button>
            <button type="button" className="rhb-btn solid full" onClick={onCtaClick}>
              {ctaButtonText}
            </button>
          </div>
        )}
      </header>

      <div className="rhb-body">
        <div className="rhb-center">
          <div className="rhb-badge animate-fade-slide-in-1">
            <span className="rhb-badge-new">{badgeLabel}</span>
            <span>{badgeText}</span>
          </div>

          <h1 className="rhb-title animate-fade-slide-in-2">
            {title}
            <br />
            <WordRotate words={rotatingWords} interval={4200} /> {titleLine2Suffix}
          </h1>

          <p className="rhb-desc animate-fade-slide-in-3">{description}</p>

          <div className="rhb-actions animate-fade-slide-in-4">
            <button type="button" className="rhb-btn solid lg" onClick={onPrimaryClick}>
              {primaryButtonText}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
            <Link href={secondaryButtonHref} className="rhb-btn ghost lg">
              {secondaryButtonText}
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rhb {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          overflow: hidden;
          width: 100%;
          /* Transparent so .lp --bg shows through as the hero image fades out */
          background: transparent;
          color: #f2f3f5;
        }
        .rhb-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: left top;
          pointer-events: none;
          filter: hue-rotate(165deg) saturate(1.2) brightness(0.92) contrast(1.05);
          -webkit-mask-image: linear-gradient(
            to bottom,
            #000 0%,
            #000 42%,
            rgba(0, 0, 0, 0.85) 62%,
            rgba(0, 0, 0, 0.4) 80%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to bottom,
            #000 0%,
            #000 42%,
            rgba(0, 0, 0, 0.85) 62%,
            rgba(0, 0, 0, 0.4) 80%,
            transparent 100%
          );
        }
        .rhb-tint {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(8, 145, 178, 0.22), transparent 45%, rgba(6, 182, 212, 0.12));
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%);
        }
        .rhb-veil {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse 80% 60% at 50% 35%, transparent 15%, rgba(5, 7, 10, 0.55) 100%);
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
        }
        .rhb-fade {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: clamp(200px, 48vh, 420px);
          pointer-events: none;
          z-index: 3;
          /* Soft veil into page bg — never an opaque hard stop color */
          background: linear-gradient(
            to bottom,
            transparent 0%,
            color-mix(in srgb, var(--bg) 18%, transparent) 40%,
            color-mix(in srgb, var(--bg) 55%, transparent) 70%,
            color-mix(in srgb, var(--bg) 88%, transparent) 90%,
            var(--bg) 100%
          );
        }
        .rhb-header {
          position: relative;
          z-index: 10;
          padding-top: 16px;
        }
        .rhb-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 24px;
          padding-top: 8px;
          gap: 16px;
        }
        .rhb-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #fff;
          font-family: "Crimson Pro", Georgia, serif;
          font-size: 18px;
          font-weight: 600;
        }
        .rhb-brand em {
          font-style: normal;
          color: #22d3ee;
        }
        .rhb-logo {
          width: 44px;
          height: 44px;
          border-radius: 0;
          display: grid;
          place-items: center;
          overflow: visible;
          flex-shrink: 0;
        }
        .rhb-nav.desktop {
          display: none;
          align-items: center;
          gap: 12px;
        }
        @media (min-width: 860px) {
          .rhb-nav.desktop {
            display: flex;
          }
        }
        .rhb-pill {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px;
          border-radius: 999px;
          background: rgba(8, 20, 28, 0.45);
          border: 1px solid rgba(34, 211, 238, 0.18);
          backdrop-filter: blur(10px);
        }
        :global(.rhb-link) {
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 600;
          color: rgba(230, 240, 245, 0.78);
          text-decoration: none;
          border-radius: 999px;
          transition: color 0.2s, background 0.2s;
        }
        :global(.rhb-link:hover),
        :global(.rhb-link.active) {
          color: #fff;
          background: rgba(34, 211, 238, 0.1);
        }
        .rhb-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        :global(.rhb-btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s, background 0.2s, border-color 0.2s, color 0.2s;
        }
        :global(.rhb-btn.ghost) {
          background: transparent;
          border: 1px solid rgba(34, 211, 238, 0.35);
          color: #a5f3fc;
          padding: 9px 16px;
        }
        :global(.rhb-btn.ghost:hover) {
          background: rgba(34, 211, 238, 0.1);
          border-color: rgba(34, 211, 238, 0.55);
          color: #fff;
        }
        :global(.rhb-btn.solid) {
          border: none;
          background: linear-gradient(135deg, #22d3ee, #38bdf8);
          color: #052a33;
          padding: 9px 16px;
          box-shadow: 0 8px 24px rgba(34, 211, 238, 0.28);
        }
        :global(.rhb-btn.solid:hover) {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(34, 211, 238, 0.38);
        }
        :global(.rhb-btn.lg) {
          padding: 13px 22px;
          font-size: 15px;
        }
        :global(.rhb-btn.full) {
          width: 100%;
        }
        .rhb-burger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(34, 211, 238, 0.25);
          background: rgba(8, 20, 28, 0.5);
          color: #a5f3fc;
          cursor: pointer;
        }
        @media (min-width: 860px) {
          .rhb-burger {
            display: none;
          }
        }
        .rhb-mobile {
          margin: 12px 24px 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(5, 7, 10, 0.92);
          border: 1px solid rgba(34, 211, 238, 0.2);
          backdrop-filter: blur(12px);
        }
        .rhb-mobile a {
          color: rgba(255, 255, 255, 0.88);
          text-decoration: none;
          padding: 12px 14px;
          min-height: 44px;
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
        }
        @media (min-width: 860px) {
          .rhb-mobile {
            display: none;
          }
        }
        .rhb-body {
          position: relative;
          z-index: 10;
          max-width: 80rem;
          margin: 0 auto;
          padding: 120px 24px clamp(160px, 28vh, 280px);
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
        }
        .rhb-center {
          max-width: 48rem;
          margin: 0 auto;
          text-align: center;
          width: 100%;
        }
        .rhb-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.1);
          border: 1px solid rgba(34, 211, 238, 0.28);
          backdrop-filter: blur(8px);
          font-size: 14px;
          font-weight: 500;
          color: rgba(220, 245, 255, 0.92);
        }
        .rhb-badge-new {
          background: linear-gradient(135deg, #22d3ee, #38bdf8);
          color: #052a33;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .rhb-title {
          font-family: "Crimson Pro", Georgia, serif;
          font-weight: 600;
          font-size: clamp(2.25rem, 6vw, 4.25rem);
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: #fff;
          margin: 0;
        }
        :global(.rhb-wr) {
          display: inline-grid;
          vertical-align: baseline;
          overflow: hidden;
          line-height: 1.15;
        }
        :global(.rhb-wr-word) {
          display: inline-block;
          grid-area: 1 / 1;
          white-space: nowrap;
          background: linear-gradient(120deg, #67e8f9, #22d3ee 55%, #a5f3fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .rhb-desc {
          margin: 24px auto 0;
          max-width: 42rem;
          font-size: clamp(1rem, 2vw, 1.125rem);
          line-height: 1.6;
          color: rgba(210, 230, 240, 0.82);
        }
        .rhb-actions {
          margin-top: 40px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
      `}</style>
    </section>
  );
};

export default ResponsiveHeroBanner;
