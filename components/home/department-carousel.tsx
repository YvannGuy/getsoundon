"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DepartmentCard = {
  departmentCode: string;
  departmentLabel: string;
  count: number;
  image: string;
};

export function DepartmentCarousel({ items }: { items: DepartmentCard[] }) {
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
  }, [items.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-card]")?.getBoundingClientRect().width ?? 320;
    const gap = 24;
    const amount = (cardWidth + gap) * (dir === "left" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

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
        {items.map((item) => (
          <Link
            key={item.departmentCode}
            href={`/catalogue?location=${encodeURIComponent(item.departmentLabel)}`}
            data-card
            className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="relative aspect-[4/3] w-full shrink-0 bg-slate-100">
              <Image
                src={item.image}
                alt={item.departmentLabel}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.05]"
                sizes="280px"
              />
              <div
                className="absolute inset-0 bg-black/15 transition duration-300 group-hover:bg-black/20"
                aria-hidden
              />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-semibold text-white drop-shadow-sm">
                  {item.departmentLabel} ({item.departmentCode})
                </p>
                <p className="mt-0.5 text-sm text-white/90">
                  {item.count} salle{item.count > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
