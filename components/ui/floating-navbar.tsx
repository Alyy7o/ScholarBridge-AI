"use client";
/**
 * Edge-to-edge cinematic nav — Omi-style: no pill/dark bar, balanced layout.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "motion/react";
import BrandLogo from "@/components/BrandLogo";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "About", href: "/about" },
];

export default function FloatingNavbar({
  onSignIn,
  onGetStarted,
}: {
  onSignIn?: () => void;
  onGetStarted?: () => void;
}) {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [last, setLast] = useState(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const diff = y - last;
    setScrolled(y > 40);
    if (y < 60) setVisible(true);
    else if (diff > 8) setVisible(false);
    else if (diff < -8) setVisible(true);
    setLast(y);
  });

  useEffect(() => {
    setLast(scrollY.get());
  }, [scrollY]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={`fnav ${scrolled ? "scrolled" : ""}`}
        >
          <div className="fnav-inner">
            <a href="#" className="fnav-brand" onClick={(e) => e.preventDefault()}>
              <span className="fnav-logo">
                <BrandLogo variant="mark" size={44} />
              </span>
              ScholarBridge <em>AI</em>
            </a>

            <nav className="fnav-links" aria-label="Primary">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="fnav-link">
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="fnav-actions">
              <button type="button" className="fnav-ghost" onClick={onSignIn}>
                Sign in
              </button>
              <button type="button" className="fnav-cta" onClick={onGetStarted}>
                Get started <span aria-hidden>↗</span>
              </button>
            </div>
          </div>

          <style jsx>{`
            .fnav {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 50;
              padding: 18px 0;
              background: transparent;
              transition: background 0.25s ease, backdrop-filter 0.25s ease, border-color 0.25s ease;
              border-bottom: 1px solid transparent;
            }
            .fnav.scrolled {
              background: rgba(7, 9, 13, 0.55);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              border-bottom-color: rgba(255, 255, 255, 0.06);
            }
            .fnav-inner {
              max-width: 1180px;
              margin: 0 auto;
              padding: 0 28px;
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              align-items: center;
              gap: 16px;
            }
            .fnav-brand {
              justify-self: start;
              display: inline-flex;
              align-items: center;
              gap: 10px;
              text-decoration: none;
              color: #f2f3f5;
              font-family: "Crimson Pro", Georgia, serif;
              font-weight: 600;
              font-size: 18px;
              white-space: nowrap;
            }
            .fnav-brand em {
              font-style: normal;
              color: #22d3ee;
            }
            .fnav-logo {
              width: 44px;
              height: 44px;
              border-radius: 0;
              display: grid;
              place-items: center;
              overflow: visible;
              flex: 0 0 auto;
            }
            .fnav-links {
              justify-self: center;
              display: none;
              align-items: center;
              gap: 28px;
            }
            @media (min-width: 820px) {
              .fnav-links {
                display: flex;
              }
            }
            .fnav-link {
              color: rgba(235, 240, 245, 0.78);
              text-decoration: none;
              font-size: 14px;
              font-weight: 500;
              transition: color 0.2s;
            }
            .fnav-link:hover {
              color: #fff;
            }
            .fnav-actions {
              justify-self: end;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .fnav-ghost {
              background: none;
              border: none;
              color: rgba(235, 240, 245, 0.8);
              font-size: 14px;
              font-weight: 600;
              padding: 8px 10px;
              cursor: pointer;
            }
            .fnav-ghost:hover {
              color: #fff;
            }
            .fnav-cta {
              background: #f2f3f5;
              color: #0a0b0f;
              border: none;
              font-size: 13px;
              font-weight: 700;
              padding: 10px 16px;
              border-radius: 999px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              transition: transform 0.2s, background 0.2s;
            }
            .fnav-cta:hover {
              transform: translateY(-1px);
              background: #fff;
            }
            @media (max-width: 520px) {
              .fnav-inner {
                grid-template-columns: 1fr auto;
                padding: 0 18px;
              }
              .fnav-ghost {
                display: none;
              }
            }
          `}</style>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
