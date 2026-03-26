"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

type LandingRevealProps = {
  children: React.ReactNode;
  className?: string;
};

export function LandingReveal({ children, className = "" }: LandingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.set(el, { opacity: 0, y: 24 });
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" });
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
