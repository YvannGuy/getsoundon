"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { StorefrontCatalogItem, StorefrontCategory } from "@/lib/provider-storefront-demo";

type ProviderCatalogSectionProps = {
  providerName: string;
  categories: StorefrontCategory[];
  items: StorefrontCatalogItem[];
};

export function ProviderCatalogSection({ providerName, categories, items }: ProviderCatalogSectionProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const catOk = activeCategory === "all" || it.categoryId === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      const blob = `${it.title} ${it.subtitle}`.toLowerCase();
      return blob.includes(q);
    });
  }, [items, query, activeCategory]);

  return (
    <section className="mt-12 sm:mt-14 md:mt-16">
      <h2 className="font-landing-section-title text-xl text-gs-dark sm:text-2xl md:text-[1.75rem]">
        Parc matériel de {providerName}
      </h2>

      <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-[260px] xl:w-[288px]">
          <div className="rounded-xl border border-gs-line bg-white p-4 shadow-sm sm:p-5">
            <p className="font-landing-overline text-[11px] text-[#888]">Recherche</p>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un matériel..."
                className="font-landing-body w-full rounded-lg border border-gs-line bg-gs-beige/40 py-2.5 pl-10 pr-3 text-sm text-gs-dark outline-none ring-gs-orange/30 placeholder:text-[#888] focus:border-gs-orange focus:ring-2"
                autoComplete="off"
              />
            </div>

            <p className="font-landing-overline mt-8 text-[11px] text-[#888]">Catégories</p>
            <ul className="mt-3 space-y-0.5">
              {categories.map((c) => {
                const active = activeCategory === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(c.id)}
                      className={`font-landing-body flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-gs-orange/10 font-semibold text-gs-orange"
                          : "text-[#555] hover:bg-gs-beige/80 hover:text-gs-dark"
                      }`}
                    >
                      <span>{c.label}</span>
                      <span
                        className={`tabular-nums ${active ? "text-gs-orange" : "text-[#aaa]"}`}
                      >
                        {c.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-gs-line bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition hover:shadow-md"
              >
                <Link href="/catalogue" className="relative block aspect-[3/4] w-full overflow-hidden bg-[#1a1a1a]">
                  <Image
                    src={item.imageSrc}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link href="/catalogue">
                    <h3 className="font-landing-heading text-base font-bold text-gs-dark sm:text-lg">{item.title}</h3>
                  </Link>
                  <p className="font-landing-body mt-1 line-clamp-2 text-sm text-[#666]">{item.subtitle}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-gs-line/80 pt-4">
                    <p className="font-landing-body text-gs-dark">
                      <span className="text-lg font-bold">{item.pricePerDay}</span>
                      <span className="text-sm font-semibold text-[#555]">€/jour</span>
                    </p>
                    <Link
                      href="/catalogue"
                      className="font-landing-btn shrink-0 text-xs text-gs-orange hover:underline sm:text-sm"
                    >
                      Louer
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="font-landing-body mt-10 text-center text-[#666]">Aucun matériel ne correspond à votre recherche.</p>
          ) : null}

          <div className="mt-10 flex justify-center sm:mt-12">
            <button
              type="button"
              className="font-landing-btn w-full max-w-xl rounded-lg border border-gs-line bg-[#ece8e4] px-6 py-3.5 text-sm text-gs-dark transition hover:bg-[#e4dfda] sm:py-4"
            >
              Charger plus de matériel
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
