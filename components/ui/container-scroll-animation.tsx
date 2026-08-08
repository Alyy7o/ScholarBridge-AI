"use client";
/**
 * Container Scroll Animation — from 21st.dev (manuarora700),
 * adapted to `motion/react` (project uses Motion, not framer-motion).
 */
import React, { useRef } from "react";
import {
  useScroll,
  useTransform,
  useReducedMotion,
  motion,
  type MotionValue,
} from "motion/react";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = React.useState(false);
  const isMobileRef = useRef(false);
  const reduceRef = useRef(!!reduceMotion);

  React.useEffect(() => {
    const checkMobile = () => {
      const m = window.innerWidth <= 768;
      setIsMobile(m);
      isMobileRef.current = m;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  React.useEffect(() => {
    reduceRef.current = !!reduceMotion;
  }, [reduceMotion]);

  // Function transforms + refs so ranges stay correct when isMobile / reduceMotion flip.
  const rotate = useTransform(scrollYProgress, (v) => {
    if (isMobileRef.current || reduceRef.current) return 0;
    return 20 + (0 - 20) * v;
  });
  const scale = useTransform(scrollYProgress, (v) => {
    if (reduceRef.current) return 1;
    const from = isMobileRef.current ? 0.78 : 1.05;
    const to = isMobileRef.current ? 0.92 : 1;
    return from + (to - from) * v;
  });
  const translate = useTransform(scrollYProgress, (v) => {
    if (reduceRef.current) return 0;
    return 0 + (-100 - 0) * v;
  });

  if (reduceMotion) {
    return (
      <div className="relative flex min-h-[28rem] items-center justify-center p-4 sm:min-h-[36rem] md:p-20">
        <div className="relative w-full py-8">
          <div className="mx-auto max-w-5xl text-center">{titleComponent}</div>
          <div className="mx-auto mt-8 h-[22rem] w-full max-w-5xl rounded-[24px] border-4 border-[#3a3a3c] bg-[#161618] p-2 shadow-2xl sm:h-[28rem] md:h-[40rem] md:rounded-[30px] md:p-6">
            <div className="h-full w-full overflow-hidden rounded-2xl bg-[#0c0d10] md:p-4">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[38rem] items-center justify-center p-2 sm:h-[48rem] md:h-[80rem] md:p-20"
      ref={containerRef}
    >
      <div
        className="relative w-full py-8 md:py-40"
        style={{ perspective: isMobile ? "none" : "1000px" }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale} use3d={!isMobile}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: React.ReactNode;
}) => (
  <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
    {titleComponent}
  </motion.div>
);

export const Card = ({
  rotate,
  scale,
  children,
  use3d = true,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
  use3d?: boolean;
}) => (
  <motion.div
    style={{
      ...(use3d ? { rotateX: rotate } : {}),
      scale,
      boxShadow:
        "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
    }}
    className="mx-auto -mt-8 h-[22rem] w-full max-w-5xl rounded-[24px] border-4 border-[#3a3a3c] bg-[#161618] p-2 shadow-2xl sm:-mt-12 sm:h-[28rem] md:h-[40rem] md:rounded-[30px] md:p-6"
  >
    <div className="h-full w-full overflow-hidden rounded-2xl bg-[#0c0d10] md:rounded-2xl md:p-4">
      {children}
    </div>
  </motion.div>
);
