"use client";

import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { LANDING_HERO_IMAGE_URL } from "@/lib/landing-assets";

/** Options affichées comme « type » matériel / usage — valeur = filtre `type` rechercher */
const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Sono & DJ", value: "concert" },
  { label: "Lumières & scène", value: "conference" },
  { label: "Tous les usages", value: "" },
];

export function LandingHero() {
  const root = useRef<HTMLElement>(null);
  const bgWrap = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const search = useRef<HTMLDivElement>(null);

  const [dateDebut, setDateDebut] = useState("");

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
    <section ref={root} className="relative min-h-[520px] overflow-hidden md:min-h-[600px] lg:min-h-[640px]">
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
      <div className="landing-hero-overlay absolute inset-0" aria-hidden />

      <div className="landing-container relative z-10 flex min-h-[520px] flex-col justify-center py-16 md:min-h-[600px] md:py-20 lg:min-h-[640px]">
        <h1 ref={title} className="font-landing-hero-title max-w-[920px] text-left text-balance">
          Trouve du matériel événementiel près de chez toi simplement.
        </h1>
        <p ref={sub} className="font-landing-body mt-5 max-w-[640px] text-white/95 md:text-lg md:leading-relaxed">
          Découvrez le matériel idéal, près de chez vous, pour créer des événements inoubliables et
          réussir chaque prestation.
        </p>

        <div ref={search} className="mt-10 w-full max-w-[1100px]">
          <form action="/rechercher" method="get" className="flex flex-col overflow-hidden rounded-xl border border-gs-line bg-white shadow-[0_12px_48px_rgba(0,0,0,0.18)] lg:flex-row lg:items-stretch">
            <div className="flex flex-1 flex-col justify-center border-b border-gs-line px-4 py-3 sm:px-5 sm:py-4 lg:min-h-[88px] lg:flex-[1.15] lg:border-b-0 lg:border-r lg:border-gs-line">
              <label htmlFor="hero-ville" className="font-landing-badge text-[#888]">
                Où
              </label>
              <input
                id="hero-ville"
                name="ville"
                type="search"
                placeholder="Ville, Code postal"
                autoComplete="off"
                className="font-landing-heading mt-1 w-full border-0 bg-transparent p-0 text-base font-bold text-gs-dark outline-none placeholder:text-[#888] placeholder:opacity-90"
              />
            </div>

            <div className="relative flex flex-1 flex-col justify-center border-b border-gs-line px-4 py-3 sm:px-5 sm:py-4 lg:min-h-[88px] lg:flex-1 lg:border-b-0 lg:border-r lg:border-gs-line">
              <label htmlFor="hero-type" className="font-landing-badge text-[#888]">
                Type
              </label>
              <div className="relative mt-1">
                <select
                  id="hero-type"
                  name="type"
                  defaultValue="concert"
                  className="font-landing-heading w-full cursor-pointer appearance-none border-0 bg-transparent py-0.5 pr-8 text-base font-bold text-gs-dark outline-none"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888]"
                  aria-hidden
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-center px-4 py-3 sm:px-5 sm:py-4 lg:min-h-[88px] lg:flex-1">
              <label htmlFor="hero-date" className="font-landing-badge text-[#888]">
                Date
              </label>
              <input
                id="hero-date"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="font-landing-heading mt-1 w-full border-0 bg-transparent p-0 text-base font-bold text-gs-dark outline-none [color-scheme:light]"
              />
              <input type="hidden" name="date_debut" value={dateDebut} />
              <input type="hidden" name="date_fin" value={dateDebut} />
            </div>

            <div className="flex p-2 lg:items-stretch lg:p-2.5">
              <button
                type="submit"
                className="font-landing-btn w-full rounded-lg bg-gs-orange px-6 py-3.5 text-white transition hover:brightness-105 sm:py-4 lg:flex lg:w-auto lg:min-w-[160px] lg:items-center lg:justify-center lg:self-stretch lg:px-8"
              >
                Rechercher
              </button>
            </div>
          </form>
          <p className="font-landing-body mt-3 text-sm text-white/80">
            Ou parcourir le{" "}
            <Link href="/items" className="font-landing-body font-semibold underline underline-offset-2">
              catalogue
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
