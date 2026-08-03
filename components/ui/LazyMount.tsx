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
}: {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  className?: string;
  id?: string;
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

  return (
    <div ref={ref} id={id} className={className} style={!show ? { minHeight } : undefined}>
      {show ? children : null}
    </div>
  );
}
