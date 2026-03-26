"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: "sound" | "dj" | "lighting" | "services";
  price_per_day: number;
  location: string;
  rating_avg: number;
  rating_count: number;
};

const CATEGORY_OPTIONS: Array<Listing["category"]> = ["sound", "dj", "lighting", "services"];

function ItemsPageInner() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category")?.trim() ?? "");
  const [location, setLocation] = useState(() => searchParams.get("location")?.trim() ?? "");
  const [minPrice, setMinPrice] = useState(() => searchParams.get("minPrice")?.trim() ?? "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("maxPrice")?.trim() ?? "");

  useEffect(() => {
    setQ(searchParams.get("q")?.trim() ?? "");
    setCategory(searchParams.get("category")?.trim() ?? "");
    setLocation(searchParams.get("location")?.trim() ?? "");
    setMinPrice(searchParams.get("minPrice")?.trim() ?? "");
    setMaxPrice(searchParams.get("maxPrice")?.trim() ?? "");
  }, [searchParams]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (location.trim()) params.set("location", location.trim());
    if (minPrice.trim()) params.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());
    params.set("limit", "50");
    return params.toString();
  }, [category, location, maxPrice, minPrice, q]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings?${queryString}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: Listing[]; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Impossible de charger les listings.");
        }
        if (!cancelled) {
          setItems(json.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur inattendue.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <main className="container max-w-5xl py-10">
      <h1 className="text-2xl font-bold text-black">Marketplace GetSoundOn</h1>
      <p className="mt-2 text-sm text-slate-600">Trouve du materiel son, DJ, lumiere et des services evenementiels.</p>

      <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Recherche"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm md:col-span-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
        >
          <option value="">Toutes categories</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ville"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            inputMode="numeric"
            placeholder="Prix min"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            inputMode="numeric"
            placeholder="Prix max"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
        </div>
      </section>

      <section className="mt-6">
        {loading ? <p className="text-sm text-slate-500">Chargement...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun resultat.</p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.category}</p>
              <h2 className="mt-1 text-lg font-semibold text-black">{item.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-medium text-black">{item.price_per_day.toFixed(2)} EUR / jour</span>
                <span className="text-slate-500">{item.location}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Note: {item.rating_avg?.toFixed(1) ?? "0.0"} ({item.rating_count ?? 0})
              </div>
              <Link
                href={`/items/${item.id}`}
                className="mt-4 inline-flex h-9 items-center rounded-md bg-gs-orange px-3 text-sm font-medium text-white hover:brightness-95"
              >
                Voir le listing
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function ItemsPage() {
  return (
    <Suspense
      fallback={
        <main className="container max-w-5xl py-10">
          <p className="text-sm text-slate-500">Chargement...</p>
        </main>
      }
    >
      <ItemsPageInner />
    </Suspense>
  );
}
