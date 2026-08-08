"use client";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useEffect, useRef, useState } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export type RFGFeature = { title: string; body: string; icon: React.ReactNode };

function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = () => setMobile(window.innerWidth < bp);
    f();
    let t: ReturnType<typeof setTimeout>;
    const d = () => {
      clearTimeout(t);
      t = setTimeout(f, 100);
    };
    window.addEventListener("resize", d);
    return () => {
      window.removeEventListener("resize", d);
      clearTimeout(t);
    };
  }, [bp]);
  return mobile;
}

function useResponsiveValue(base: number, mobile: number) {
  const [v, setV] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? mobile : base
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = () => setV(window.innerWidth < 768 ? mobile : base);
    f();
    let t: ReturnType<typeof setTimeout>;
    const d = () => {
      clearTimeout(t);
      t = setTimeout(f, 100);
    };
    window.addEventListener("resize", d);
    return () => {
      window.removeEventListener("resize", d);
      clearTimeout(t);
    };
  }, [base, mobile]);
  return v;
}

/**
 * Scroll-driven coverflow. Cards ride a shallow arc; the pinned section maps
 * scroll to a progress that slides the focal card across.
 * Overflow is clipped with an isolated stacking context so cards cannot paint
 * over later sections (esp. mobile 3D/perspective).
 */
export default function RadialFeatureGallery({
  features,
  scrollDuration = 1500,
  mobileScrollDuration = 900,
  baseRadius = 720,
  mobileRadius = 320,
  step = 0.52,
}: {
  features: RFGFeature[];
  scrollDuration?: number;
  mobileScrollDuration?: number;
  baseRadius?: number;
  mobileRadius?: number;
  step?: number;
}) {
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useIsMobile();

  const R = useResponsiveValue(baseRadius, mobileRadius);
  const cardW = useResponsiveValue(330, 260);
  const stageH = useResponsiveValue(560, 380);
  const pinEnd = isMobile ? mobileScrollDuration : scrollDuration;
  const count = features.length;
  const allowBlur = !isMobile;
  const yFactor = isMobile ? 0.14 : 0.42;
  // Mobile: hug the stage so we don't leave huge empty bands above/below (100vh pin).
  const sectionMinH = isMobile ? stageH + 24 : undefined;

  const layout = (p: number) => {
    const active = p * (count - 1);
    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const d = (i - active) * step;
      const ad = Math.abs(d);
      const x = Math.sin(d) * R;
      const y = (1 - Math.cos(d)) * R * yFactor;
      const scale = Math.max(0.65, 1.1 - ad * 0.65);
      const op = ad > 1.6 ? 0 : Math.max(0.15, 1 - ad * 0.95);
      const rotY = isMobile
        ? 0
        : Math.max(-52, Math.min(52, -((d * 180) / Math.PI) * 0.5));
      const hide = ad > 1.65;
      el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.style.visibility = hide ? "hidden" : "visible";
      el.style.pointerEvents = hide || op < 0.2 ? "none" : "auto";
      el.style.zIndex = String(Math.round(20 - ad * 10));
      el.style.filter = allowBlur && ad > 1.5 ? "blur(1px)" : "none";
    }
  };

  useGSAP(
    () => {
      if (!pinRef.current || count === 0) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        layout(count > 1 ? 0.5 : 0);
        return;
      }
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: `+=${pinEnd}`,
        pin: true,
        scrub: isMobile ? 0.6 : 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => layout(self.progress),
        onRefresh: (self) => layout(self.progress),
      });
      layout(0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    { scope: pinRef, dependencies: [pinEnd, R, step, count, isMobile, allowBlur, yFactor, sectionMinH, stageH] }
  );

  useEffect(() => {
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      ref={pinRef}
      className="rfg"
      style={{
        minHeight: sectionMinH ?? "100vh",
        height: isMobile ? sectionMinH : undefined,
        width: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "clip",
        isolation: "isolate",
        zIndex: 0,
        contain: "paint",
        padding: isMobile ? "12px 0" : undefined,
      }}
    >
      {/* Clip layer without perspective — 3D lives inside so overflow actually clips */}
      <div
        ref={stageRef}
        className="rfg-stage"
        style={{
          position: "relative",
          width: "100%",
          height: stageH,
          overflow: "hidden",
          contain: "paint",
          maskImage: "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
        }}
      >
        <div
          className="rfg-persp"
          style={{
            position: "absolute",
            inset: 0,
            perspective: isMobile ? undefined : "1500px",
            transformStyle: isMobile ? undefined : "preserve-3d",
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="rfg-item"
              style={{
                position: "absolute",
                left: "50%",
                top: "48%",
                width: cardW,
                transformOrigin: "center center",
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
              }}
            >
              <div className="rfg-card">
                <span className="rfg-ic">{f.icon}</span>
                <div className="rfg-t">{f.title}</div>
                <div className="rfg-b">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .rfg-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 24px 55px rgba(0, 0, 0, 0.45);
        }
        .rfg-item:hover .rfg-card {
          border-color: color-mix(in srgb, var(--acc) 60%, var(--line));
        }
        .rfg-ic {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--acc) 16%, transparent);
          color: var(--acc);
          margin-bottom: 14px;
        }
        .rfg-t {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 7px;
        }
        .rfg-b {
          font-size: 14px;
          line-height: 1.55;
          color: var(--mut);
        }
        @media (max-width: 640px) {
          .rfg-card {
            padding: 18px;
            border-radius: 14px;
          }
          .rfg-t {
            font-size: 16px;
          }
          .rfg-b {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
