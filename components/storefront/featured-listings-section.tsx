"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useState } from "react";

import type { StorefrontFeaturedItem } from "@/lib/provider-storefront-demo";

type FeaturedListingsSectionProps = {
  items: StorefrontFeaturedItem[];
};

export function FeaturedListingsSection({ items }: FeaturedListingsSectionProps) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <h2 className="font-landing-section-title text-xl text-gs-dark sm:text-2xl">Annonces à la une</h2>
        <Link
          href="/catalogue"
          className="font-landing-nav text-sm font-semibold text-gs-orange hover:underline"
        >
          Voir tout &gt;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {items.map((item) => (
          <article
            key={item.id}
            className="group overflow-hidden rounded-xl border border-gs-line bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition hover:shadow-md"
          >
            <Link href="/catalogue" className="block">
              <div className="relative aspect-square w-full overflow-hidden bg-[#f0ebe6]">
                <Image
                  src={item.imageSrc}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                />
                {item.featured ? (
                  <span className="font-landing-badge absolute right-2 top-2 rounded bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wider text-gs-dark shadow-sm">
                    FEATURED
                  </span>
                ) : null}
              </div>
            </Link>
            <div className="flex flex-col gap-2 p-3.5 sm:p-4">
              <p className="font-landing-badge text-[10px] text-gs-orange sm:text-[11px]">{item.categoryLabel}</p>
              <Link href="/catalogue">
                <h3 className="font-landing-heading line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-gs-dark sm:text-base">
                  {item.title}
                </h3>
              </Link>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="font-landing-body text-gs-dark">
                  <span className="text-base font-bold sm:text-lg">{item.pricePerDay}</span>
                  <span className="text-sm font-semibold text-[#555]">€/jour</span>
                </p>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-gs-dark transition hover:bg-gs-beige"
                  aria-pressed={favorites[item.id] ?? false}
                  aria-label={favorites[item.id] ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart
                    className={`h-[18px] w-[18px] ${favorites[item.id] ? "fill-gs-orange text-gs-orange" : "text-gs-dark"}`}
                    strokeWidth={1.75}
                  />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
