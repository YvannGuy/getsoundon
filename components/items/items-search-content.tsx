"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, MapPin, Search, SlidersHorizontal, X } from "lucide-react";

import type { ListingMapItem } from "@/components/items/listings-map-inner";
import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ListingsSearchMap = dynamic(
  () =>
    import("@/components/items/listings-search-map").then((mod) => ({ default: mod.ListingsSearchMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[500px]">
        <p className="text-sm text-slate-500">Chargement de la carte…</p>
      </div>
    ),
  }
);

type Listing = ListingMapItem & {
  description: string;
  rating_avg: number;
  rating_count: number;
};

type SortKey = "pertinence" | "prix-asc" | "prix-desc";

const CATEGORY_OPTIONS = ["sound", "dj", "lighting", "services"] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORY_OPTIONS)[number], string> = {
  sound: "Sono",
  dj: "DJ",
  lighting: "Lumière",
  services: "Services",
};

function buildListingsQueryString(sp: URLSearchParams): string {
  const params = new URLSearchParams();
  const q = sp.get("q")?.trim();
  const location = sp.get("location")?.trim();
  const category = sp.get("category")?.trim();
  const minPrice = sp.get("minPrice")?.trim();
  const maxPrice = sp.get("maxPrice")?.trim();
  if (q) params.set("q", q);
  if (location) params.set("location", location);
  if (category) params.set("category", category);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);
  params.set("limit", "50");
  return params.toString();
}

export function ItemsSearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** Conserver /items ou /catalogue selon la page affichée (liens et formulaires). */
  const listingBasePath = pathname === "/items" ? "/items" : "/catalogue";

  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<SortKey>("pertinence");
  const [prixMin, setPrixMin] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [filtresOpen, setFiltresOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [mapVisible, setMapVisible] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setMapVisible(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [searchQ, setSearchQ] = useState(searchParams.get("q") ?? "");
  const [searchLocation, setSearchLocation] = useState(searchParams.get("location") ?? "");
  const [searchCategory, setSearchCategory] = useState(searchParams.get("category") ?? "");

  useEffect(() => {
    setSearchQ(searchParams.get("q") ?? "");
    setSearchLocation(searchParams.get("location") ?? "");
    setSearchCategory(searchParams.get("category") ?? "");
    setPrixMin(searchParams.get("minPrice") ?? "");
    setPrixMax(searchParams.get("maxPrice") ?? "");
  }, [searchParams]);

  const queryString = useMemo(() => buildListingsQueryString(searchParams), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings?${queryString}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: Listing[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Impossible de charger les annonces.");
        if (!cancelled) setItems(json.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inattendue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; param: string }[] = [];
    const q = searchParams.get("q")?.trim();
    const loc = searchParams.get("location")?.trim();
    const cat = searchParams.get("category")?.trim();
    const minP = searchParams.get("minPrice")?.trim();
    const maxP = searchParams.get("maxPrice")?.trim();
    if (q) chips.push({ key: "q", label: q, param: "q" });
    if (loc) chips.push({ key: "loc", label: loc, param: "location" });
    if (cat && CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS])
      chips.push({ key: "cat", label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS], param: "category" });
    if (minP || maxP)
      chips.push({
        key: "price",
        label: `Prix : ${minP || "…"} – ${maxP || "…"} €`,
        param: "price",
      });
    return chips;
  }, [searchParams]);

  const removeFilter = (param: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (param === "price") {
      sp.delete("minPrice");
      sp.delete("maxPrice");
    } else {
      sp.delete(param);
    }
    router.push(sp.toString() ? `${listingBasePath}?${sp.toString()}` : listingBasePath);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams.toString());
    if (searchQ.trim()) sp.set("q", searchQ.trim());
    else sp.delete("q");
    if (searchLocation.trim()) sp.set("location", searchLocation.trim());
    else sp.delete("location");
    if (searchCategory.trim()) sp.set("category", searchCategory.trim());
    else sp.delete("category");
    router.push(sp.toString() ? `${listingBasePath}?${sp.toString()}` : listingBasePath);
  };

  const applyPriceFilters = () => {
    const sp = new URLSearchParams(searchParams.toString());
    if (prixMin.trim()) sp.set("minPrice", prixMin.trim());
    else sp.delete("minPrice");
    if (prixMax.trim()) sp.set("maxPrice", prixMax.trim());
    else sp.delete("maxPrice");
    router.push(sp.toString() ? `${listingBasePath}?${sp.toString()}` : listingBasePath);
    setFiltresOpen(false);
  };

  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (sort) {
      case "prix-asc":
        return list.sort((a, b) => a.price_per_day - b.price_per_day);
      case "prix-desc":
        return list.sort((a, b) => b.price_per_day - a.price_per_day);
      default:
        return list;
    }
  }, [items, sort]);

  const mapItems: ListingMapItem[] = useMemo(
    () =>
      sortedItems.map((x) => ({
        id: x.id,
        title: x.title,
        location: x.location,
        price_per_day: x.price_per_day,
        lat: x.lat,
        lng: x.lng,
        category: x.category,
        image_url: x.image_url,
      })),
    [sortedItems]
  );

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const hasUrlFilters =
    Boolean(searchParams.get("q")?.trim()) ||
    Boolean(searchParams.get("location")?.trim()) ||
    Boolean(searchParams.get("category")?.trim()) ||
    Boolean(searchParams.get("minPrice")?.trim()) ||
    Boolean(searchParams.get("maxPrice")?.trim());

  const urlQ = searchParams.get("q")?.trim() ?? "";
  const urlLocation = searchParams.get("location")?.trim() ?? "";
  /** Hero ou URL avec mot-clé et/ou lieu = page résultats, pas le bandeau « catalogue général ». */
  const isSearchResultsView = Boolean(urlQ || urlLocation);

  return (
    <>
      {isSearchResultsView ? (
        <section className="border-b border-gs-line bg-white/95 py-5 backdrop-blur-[2px]">
          <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-5 lg:px-8">
            <h1 className="font-landing-heading text-2xl font-bold text-gs-dark md:text-3xl">
              Résultats de recherche
            </h1>
            <p className="font-landing-body mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
              {urlQ ? (
                <>
                  Matériel ou prestation : <span className="font-semibold text-gs-dark">« {urlQ} »</span>
                </>
              ) : null}
              {urlQ && urlLocation ? <span className="text-slate-400"> · </span> : null}
              {urlLocation ? (
                <>
                  Lieu : <span className="font-semibold text-gs-dark">{urlLocation}</span>
                </>
              ) : null}
            </p>
          </div>
        </section>
      ) : (
        <section className="border-b border-gs-line bg-white/95 py-6 backdrop-blur-[2px]">
          <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-5 lg:px-8">
            <h1 className="font-landing-heading text-2xl font-bold text-gs-dark md:text-3xl">Catalogue</h1>
            <p className="font-landing-body mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
              Parcours toutes les annonces des prestataires : matériel son, DJ, lumière et services en
              Île-de-France. Filtre par lieu, catégorie et prix — résultats en liste et sur la carte.
            </p>
          </div>
        </section>
      )}

      <main className="mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-5 lg:px-8">
        <nav className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-gs-orange hover:underline">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">{isSearchResultsView ? "Résultats" : "Catalogue"}</span>
        </nav>

        <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Enceinte, DJ, lumière…"
              className="h-10 rounded-lg border-slate-200 pl-9 pr-3"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <VilleAutocomplete
              value={searchLocation}
              onChange={setSearchLocation}
              onCitySelect={(ville, _c) => setSearchLocation(ville)}
              placeholder="Paris, Versailles, Montreuil…"
              className="h-10"
              inputClassName="h-10 rounded-lg border-slate-200 pl-10 pr-3"
            />
          </div>
          <div className="relative w-[160px] shrink-0">
            <Select
              value={searchCategory || "all"}
              onValueChange={(v) => setSearchCategory(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-10 rounded-lg border-slate-200">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="all">Toutes</SelectItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" className="h-10 shrink-0 gap-2 bg-gs-orange px-4 hover:brightness-95">
            <Search className="h-4 w-4" />
            Rechercher
          </Button>
        </div>
      </form>

      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {activeChips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700"
            >
              {c.key === "loc" && <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
              {c.label}
              <button
                type="button"
                onClick={() => removeFilter(c.param)}
                className="rounded-full p-0.5 hover:bg-slate-200"
                title="Retirer ce filtre"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-slate-700">
          {loading ? "…" : sortedItems.length} annonce{sortedItems.length !== 1 ? "s" : ""}{" "}
          {!loading && "disponible"}
          {sortedItems.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Popover open={filtresOpen} onOpenChange={setFiltresOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-4 w-4" />
                Filtres
                {(searchParams.get("minPrice") || searchParams.get("maxPrice")) && (
                  <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gs-orange/10 px-1.5 text-xs font-medium text-black">
                    1
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-[9999] w-72 p-4" align="end">
              <h4 className="mb-3 font-medium text-black">Prix (€ / jour)</h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700">Minimum</label>
                  <Input
                    type="number"
                    placeholder="Ex. 20"
                    value={prixMin}
                    onChange={(e) => setPrixMin(e.target.value)}
                    min={0}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700">Maximum</label>
                  <Input
                    type="number"
                    placeholder="Ex. 500"
                    value={prixMax}
                    onChange={(e) => setPrixMax(e.target.value)}
                    min={0}
                    className="h-9"
                  />
                </div>
                <Button size="sm" className="w-full bg-gs-orange hover:brightness-95" onClick={applyPriceFilters}>
                  Appliquer
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SlidersHorizontal className="mr-1.5 h-4 w-4 shrink-0 text-slate-500" />
              <SelectValue placeholder="Pertinence" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="pertinence">Pertinence</SelectItem>
              <SelectItem value="prix-asc">Prix croissant</SelectItem>
              <SelectItem value="prix-desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
          {!loading && sortedItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-600">
              <p>Aucune annonce ne correspond à ta recherche.</p>
              <p className="mt-2 text-slate-500">Élargis le lieu ou change les mots-clés.</p>
              {hasUrlFilters ? (
                <Link
                  href="/catalogue"
                  className="mt-4 inline-block font-medium text-gs-orange hover:underline"
                >
                  Voir tout le catalogue
                </Link>
              ) : null}
            </div>
          )}
          {sortedItems.map((item) => {
            const isHighlighted = hoveredId === item.id || selectedId === item.id;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  cardRefs.current[item.id] = el;
                }}
                className={cn(
                  "flex gap-4 rounded-xl border-2 bg-white p-4 shadow-sm transition",
                  isHighlighted
                    ? "border-gs-orange ring-2 ring-gs-orange/20"
                    : "border-slate-200 hover:border-gs-orange/50"
                )}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-medium uppercase text-slate-400">
                      {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? item.category}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-black">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-600">
                      {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold text-black">
                      {item.price_per_day > 0 ? `${item.price_per_day.toFixed(0)} € / jour` : "Sur demande"}
                    </p>
                    <Link href={`/items/${item.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" className="h-8 bg-gs-orange text-[13px] hover:brightness-95">
                        Voir l&apos;annonce
                      </Button>
                    </Link>
                  </div>
                  {item.rating_count > 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Note {item.rating_avg?.toFixed(1) ?? "—"} ({item.rating_count} avis)
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-0 hidden min-w-0 overflow-hidden lg:block">
          {mapVisible && (
            <ListingsSearchMap
              key={queryString}
              listings={mapItems}
              highlightedId={hoveredId ?? selectedId}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>
      </div>
      </main>
    </>
  );
}
