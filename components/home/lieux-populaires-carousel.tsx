"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Salle } from "@/lib/types/salle";
import { getSallePriceFrom, type SalleRow } from "@/lib/types/salle";

type PopularFilter =
  | "all"
  | "outdoor"
  | "budget"
  | "large"
  | "parking"
  | "bureau"
  | "pmr"
  | "sono"
  | "cuisine"
  | "lumiere"
  | "confort";

const FILTER_LABELS: Record<PopularFilter, string> = {
  all: "Tous les lieux",
  outdoor: "En plein air",
  budget: "Petit budget",
  large: "Grande capacité",
  parking: "Avec parking",
  bureau: "Avec bureau",
  pmr: "Accès PMR",
  sono: "Sonorisation",
  cuisine: "Avec cuisine",
  lumiere: "Lumière naturelle",
  confort: "Climatisation / chauffage",
};

type SalleWithMeta = Salle & {
  ratingAvg?: number;
  ratingCount?: number;
};

export function LieuxPopulairesCarousel({ salles }: { salles: Salle[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PopularFilter>("all");

  const sallesWithMeta = useMemo(
    () =>
      salles.map((salle) => {
        const raw = salle as Salle &
          Partial<SalleRow> & {
            rating_avg?: number | null;
            rating_count?: number | null;
          };
        return {
          ...salle,
          ratingAvg:
            typeof raw.rating_avg === "number"
              ? raw.rating_avg
              : undefined,
          ratingCount:
            typeof raw.rating_count === "number"
              ? raw.rating_count
              : undefined,
        };
      }),
    [salles]
  );

  const filteredSalles = useMemo(() => {
    const hasLabel = (salle: Salle, keyword: string) =>
      (salle.features ?? []).some((f) =>
        String(f.label ?? "").toLowerCase().includes(keyword)
      );

    const byFeature = (salle: SalleWithMeta, filter: PopularFilter) => {
      if (filter === "parking") return hasLabel(salle, "parking");
      if (filter === "bureau") return hasLabel(salle, "bureau");
      if (filter === "pmr") return hasLabel(salle, "pmr");
      if (filter === "sono")
        return (
          hasLabel(salle, "sonorisation") ||
          hasLabel(salle, "audio") ||
          hasLabel(salle, "sono")
        );
      if (filter === "cuisine") return hasLabel(salle, "cuisine");
      if (filter === "lumiere")
        return (
          hasLabel(salle, "lumière") ||
          hasLabel(salle, "lumiere")
        );
      if (filter === "confort")
        return hasLabel(salle, "climatisation") || hasLabel(salle, "chauffage");
      return false;
    };

    const byFilter = (salle: SalleWithMeta) => {
      switch (activeFilter) {
        case "outdoor":
          return hasLabel(salle, "extérieur") || hasLabel(salle, "jardin");
        case "budget": {
          const pf = getSallePriceFrom(salle);
          return !!pf && pf.value <= 1000;
        }
        case "large":
          return salle.capacity >= 80;
        case "parking":
        case "bureau":
        case "pmr":
        case "sono":
        case "cuisine":
          return byFeature(salle, activeFilter);
        default:
          return true;
      }
    };

    return sallesWithMeta.filter(byFilter);
  }, [activeFilter, sallesWithMeta]);

  const availableFilters = useMemo(() => {
    const hasLabel = (salle: Salle, keyword: string) =>
      (salle.features ?? []).some((f) =>
        String(f.label ?? "").toLowerCase().includes(keyword)
      );

    const byFeature = (salle: SalleWithMeta, filter: PopularFilter) => {
      if (filter === "parking") return hasLabel(salle, "parking");
      if (filter === "bureau") return hasLabel(salle, "bureau");
      if (filter === "pmr") return hasLabel(salle, "pmr");
      if (filter === "sono")
        return (
          hasLabel(salle, "sonorisation") ||
          hasLabel(salle, "audio") ||
          hasLabel(salle, "sono")
        );
      if (filter === "cuisine") return hasLabel(salle, "cuisine");
      return false;
    };

    const isAvailable = (filter: PopularFilter) => {
      if (filter === "all") return sallesWithMeta.length > 0;
      if (filter === "outdoor") {
        return sallesWithMeta.some(
          (salle) =>
            hasLabel(salle, "extérieur") || hasLabel(salle, "jardin")
        );
      }
      if (filter === "budget") {
        return sallesWithMeta.some((salle) => {
          const pf = getSallePriceFrom(salle);
          return !!pf && pf.value <= 1000;
        });
      }
      if (filter === "large") {
        return sallesWithMeta.some((salle) => salle.capacity >= 80);
      }
      return sallesWithMeta.some((salle) => byFeature(salle, filter));
    };

    return (Object.keys(FILTER_LABELS) as PopularFilter[]).filter(isAvailable);
  }, [sallesWithMeta]);

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
  }, [filteredSalles.length]);

  useEffect(() => {
    if (!availableFilters.includes(activeFilter)) {
      setActiveFilter("all");
    }
  }, [activeFilter, availableFilters]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "smooth" });
    updateScrollState();
  }, [activeFilter]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth =
      el.querySelector("[data-card]")?.getBoundingClientRect().width ?? 280;
    const gap = 24;
    const amount = (cardWidth + gap) * (dir === "left" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (salles.length === 0) return null;

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="mb-5 overflow-x-auto">
        <div className="flex min-w-max items-center gap-3 pb-1">
          {availableFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition ${
                activeFilter === filter
                  ? "border border-gs-orange bg-[#edf2ff] text-gs-orange"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      {canScrollLeft && filteredSalles.length > 1 && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-50 md:-left-4"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
      )}
      {canScrollRight && filteredSalles.length > 1 && (
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
        {filteredSalles.map((salle) => {
          const pf = getSallePriceFrom(salle);
          const locationLabel = salle.city;
          const ratingAvg =
            typeof salle.ratingAvg === "number" && salle.ratingAvg > 0
              ? Number(salle.ratingAvg.toFixed(1))
              : null;
          const ratingCount =
            typeof salle.ratingCount === "number" && salle.ratingCount > 0
              ? salle.ratingCount
              : null;
          const experienceLabel =
            ratingCount && ratingCount > 1
              ? `${ratingCount} expériences vécues`
              : ratingCount === 1
                ? "1 expérience vécue"
                : null;

          return (
            <Link
              key={salle.id}
              href={`/salles/${salle.slug}`}
              data-card
              className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full shrink-0 bg-slate-100">
                <Image
                  src={salle.images[0] ?? "/img.png"}
                  alt={salle.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.05]"
                  sizes="280px"
                />
              </div>

              <div className="flex h-full flex-col bg-slate-100 p-4">
                <p className="line-clamp-2 text-xl font-semibold tracking-tight text-black">
                  {salle.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">{locationLabel}</p>

                <div className="mt-2.5 flex items-start gap-2">
                  {ratingAvg !== null && (
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-[#1d4ea3] px-1.5 text-xs font-bold text-white">
                      {ratingAvg}
                    </span>
                  )}
                  <div>
                    {experienceLabel && (
                      <p className="text-sm text-slate-600">{experienceLabel}</p>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4 text-right">
                  <p className="text-sm text-slate-500">
                    Capacité : <span className="font-semibold text-slate-700">{salle.capacity} pers.</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    À partir de :{" "}
                    <span className="text-base font-bold text-black">
                      {pf ? `${pf.value} €` : "Sur demande"}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {filteredSalles.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Aucun lieu ne correspond à cette catégorie.
        </p>
      )}
    </div>
  );
}
