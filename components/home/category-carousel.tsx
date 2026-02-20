"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Church, Droplets, Gift, Mountain, Music, Presentation } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

type CategoryCard = {
  type: string;
  label: string;
  desc: string;
  image: string;
  color: string;
  icon: LucideIcon;
};

const CATEGORIES: CategoryCard[] = [
  {
    type: "culte-regulier",
    label: "Cultes",
    desc: "Des espaces pour vos rassemblements hebdomadaires",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    color: "indigo",
    icon: Church,
  },
  {
    type: "conference",
    label: "Conférences",
    desc: "Espaces pour vos événements professionnels",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    color: "sky",
    icon: Presentation,
  },
  {
    type: "bapteme",
    label: "Baptêmes",
    desc: "Lieux sacrés pour célébrer la vie",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    color: "teal",
    icon: Droplets,
  },
  {
    type: "celebration",
    label: "Célébrations",
    desc: "Pour vos moments de fête et de joie",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    color: "amber",
    icon: Gift,
  },
  {
    type: "retraite",
    label: "Retraites",
    desc: "Des lieux sereins pour se ressourcer",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    color: "emerald",
    icon: Mountain,
  },
  {
    type: "concert",
    label: "Concert",
    desc: "Espaces pour vos soirées musicales",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    color: "violet",
    icon: Music,
  },
];

const COLOR_CLASSES: Record<string, string> = {
  indigo: "bg-[#213398] text-black",
  sky: "bg-[#213398] text-black",
  teal: "bg-teal-600 text-teal-600",
  amber: "bg-amber-600 text-amber-600",
  emerald: "bg-emerald-600 text-emerald-600",
  violet: "bg-violet-600 text-violet-600",
};

export function CategoryCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-card]")?.getBoundingClientRect().width ?? 320;
    const gap = 24;
    const amount = (cardWidth + gap) * (dir === "left" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto max-w-5xl">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-50 md:-left-4"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-50 md:-right-4"
          aria-label="Suivant"
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-6 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth scrollbar-none"
      >
        {CATEGORIES.map((cat) => {
          const [bg, text] = COLOR_CLASSES[cat.color].split(" ");
          const Icon = cat.icon;
          return (
            <Link
              key={cat.type}
              href={`/rechercher?type=${cat.type}`}
              data-card
              className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className={`relative aspect-[4/3] w-full shrink-0 ${bg}`}>
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover opacity-60 mix-blend-multiply transition group-hover:scale-[1.03]"
                  sizes="280px"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-md">
                    <Icon className={`h-7 w-7 shrink-0 ${text}`} />
                  </div>
                  <p className="text-center font-semibold text-white drop-shadow-md">{cat.label}</p>
                </div>
              </div>
              <div className="flex min-h-[88px] flex-1 flex-col p-4">
                <p className="flex-1 text-sm leading-snug text-slate-600">{cat.desc}</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-sm font-medium ${text} group-hover:underline`}>
                  Découvrir <span className="inline-block">→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
