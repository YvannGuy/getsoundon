"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { HeroSearchBar } from "@/components/home/hero-search-bar";
import { LANDING_HERO_IMAGE_URL } from "@/lib/landing-assets";

/** Mot après « matériel » dans le titre — boucle puis revient à « événementiel ». */
const HERO_MATERIAL_ROTATION_MS = 3200;
const HERO_MATERIAL_WORDS = [
  "événementiel",
  "DJ",
  "sono",
  "lumière",
  "DJ gear",
  "microphones",
] as const;

export function LandingHero() {
  const root = useRef<HTMLElement>(null);
  const bgWrap = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const search = useRef<HTMLDivElement>(null);
  const [materialWordIndex, setMaterialWordIndex] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setMaterialWordIndex((i) => (i + 1) % HERO_MATERIAL_WORDS.length);
    }, HERO_MATERIAL_ROTATION_MS);
    return () => window.clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (bgWrap.current) {
        gsap.from(bgWrap.current, { scale: 1.05, duration: 1, ease: "power2.out" });
      }
      gsap.from([title.current, sub.current].filter(Boolean), {
        opacity: 0,
        y: 28,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
      });
      if (search.current) {
        gsap.from(search.current, {
          opacity: 0,
          y: 28,
          duration: 0.8,
          delay: 0.4,
          ease: "power2.out",
        });
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative min-h-[560px] md:min-h-[640px] lg:min-h-[min(720px,90vh)]"
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div ref={bgWrap} className="absolute inset-0 origin-center">
          <Image
            src={LANDING_HERO_IMAGE_URL}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      </div>
      <div className="landing-hero-overlay absolute inset-0" aria-hidden />

      <div className="landing-container relative z-10 flex min-h-[560px] flex-col justify-center py-14 pb-24 pt-14 md:min-h-[640px] md:py-16 md:pb-28 md:pt-16 lg:min-h-[min(720px,90vh)] lg:pb-32">
        <h1 ref={title} className="font-landing-hero-title max-w-[920px] text-left text-balance">
          Trouve du matériel{" "}
          <span className="text-gs-orange inline-block min-h-[1.15em]" aria-live="polite" aria-atomic="true">
            {HERO_MATERIAL_WORDS[materialWordIndex]}
          </span>{" "}
          près de chez toi simplement.
        </h1>
        <p ref={sub} className="font-landing-body mt-5 max-w-[640px] text-white/95 md:text-lg md:leading-relaxed">
          Économisez jusqu&apos;à 40&nbsp;% en louant auprès de professionnels et passionnés, communauté
          sécurisée et vérifiée partout en France. Trouvez le matériel idéal près de chez vous pour des
          événements inoubliables.
        </p>

        <div ref={search} className="mt-10 w-full min-w-0 max-w-[min(100%,880px)]">
          <HeroSearchBar />
        </div>
      </div>
    </section>
  );
}
