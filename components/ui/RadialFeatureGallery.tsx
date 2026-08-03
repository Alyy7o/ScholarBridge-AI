"use client";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useEffect, useRef, useState } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export type RFGFeature = { title: string; body: string; icon: React.ReactNode };

function useResponsiveValue(base: number, mobile: number) {
  const [v, setV] = useState(base);
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
 * scroll to a progress that slides the focal card across. The centered card is
 * large and sharp; neighbours tilt back, shrink and fade to their edges.
 * Fully analytical (no per-frame DOM measuring) so it stays smooth and crisp.
 */
export default function RadialFeatureGallery({
  features,
  scrollDuration = 1500,
  baseRadius = 720,
  mobileRadius = 460,
  step = 0.52,
}: {
  features: RFGFeature[];
  scrollDuration?: number;
  baseRadius?: number;
  mobileRadius?: number;
  step?: number;
}) {
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const R = useResponsiveValue(baseRadius, mobileRadius);
  const cardW = useResponsiveValue(330, 260);
  const count = features.length;

  const layout = (p: number) => {
    const active = p * (count - 1);
    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const d = (i - active) * step;
      const ad = Math.abs(d);
      const x = Math.sin(d) * R;
      const y = (1 - Math.cos(d)) * R * 0.42;
      const scale = Math.max(0.6, 1.14 - ad * 0.72);
      const op = Math.max(0.12, 1 - ad * 1.0);
      const rotY = Math.max(-52, Math.min(52, -(d * 180) / Math.PI * 0.5));
      el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(Math.round(200 - ad * 100));
      el.style.filter = ad > 1.5 ? "blur(1px)" : "none";
    }
  };

  useGSAP(
    () => {
      if (!pinRef.current || count === 0) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        layout((count - 1) / 2 / (count - 1)); // center the middle card, static
        return;
      }
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: `+=${scrollDuration}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => layout(self.progress),
        onRefresh: (self) => layout(self.progress),
      });
      layout(0);
    },
    { scope: pinRef, dependencies: [scrollDuration, R, step, count] }
  );

  return (
    <div
      ref={pinRef}
      className="rfg"
      style={{ minHeight: "100vh", width: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
    >
      <div
        ref={stageRef}
        className="rfg-stage"
        style={{
          position: "relative",
          width: "100%",
          height: 560,
          perspective: "1500px",
          maskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
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
              top: "46%",
              width: cardW,
              transformOrigin: "center center",
              transition: "opacity .2s linear, filter .2s linear",
              willChange: "transform, opacity",
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

      <style jsx global>{`
        .rfg-card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 24px; box-shadow: 0 24px 55px rgba(0, 0, 0, 0.45); }
        .rfg-item:hover .rfg-card { border-color: color-mix(in srgb, var(--acc) 60%, var(--line)); }
        .rfg-ic { display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 14px; background: color-mix(in srgb, var(--acc) 16%, transparent); color: var(--acc); margin-bottom: 14px; }
        .rfg-t { font-size: 18px; font-weight: 700; color: var(--ink); margin-bottom: 7px; }
        .rfg-b { font-size: 14px; line-height: 1.55; color: var(--mut); }
      `}</style>
    </div>
  );
}
