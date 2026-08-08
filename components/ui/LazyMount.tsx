"use client";
/**
 * Mount children only when near the viewport — keeps sections without
 * paying their JS/GPU cost on first paint.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function LazyMount({
  children,
  rootMargin = "280px 0px",
  minHeight = 420,
  className,
  id,
  onMount,
  refreshScrollTrigger = true,
}: {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  className?: string;
  id?: string;
  onMount?: () => void;
  /** After children mount, refresh GSAP ScrollTrigger so pin lengths match DOM. */
  refreshScrollTrigger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (!show) return;
    onMount?.();
    if (!refreshScrollTrigger) return;
    let cancelled = false;
    const run = async () => {
      try {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });
      } catch {
        /* gsap optional if section has no ST */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [show, onMount, refreshScrollTrigger]);

  return (
    <div ref={ref} id={id} className={className} style={!show ? { minHeight } : undefined}>
      {show ? children : null}
    </div>
  );
}
