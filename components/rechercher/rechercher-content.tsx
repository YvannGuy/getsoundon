"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building2, Car, CheckCircle2, CookingPot, Filter, Heart, Piano, Search, SlidersHorizontal, Tv, Volume2, X } from "lucide-react";

import { DatePicker } from "@/components/search/date-picker";
import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Salle } from "@/lib/types/salle";

const SearchMap = dynamic(
  () => import("@/components/rechercher/search-map").then((mod) => ({ default: mod.SearchMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[500px]">
        <p className="text-sm text-slate-500">Chargement de la carte...</p>
      </div>
    ),
  }
);

type SortKey = "pertinence" | "prix-asc" | "prix-desc" | "capacite";

const TYPE_LABELS: Record<string, string> = {
  "culte-regulier": "Culte régulier",
  conference: "Conférence",
  celebration: "Célébration",
  bapteme: "Baptême",
  retraite: "Retraite",
};

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  erp: CheckCircle2,
  parking: Car,
  pmr: CheckCircle2,
  sono: Volume2,
  video: Tv,
  piano: Piano,
  cuisine: CookingPot,
};

type RatingStats = Record<string, { avg: number; count: number }>;

export function RechercherContent({
  salles,
  ratingStats = {},
}: {
  salles: Salle[];
  ratingStats?: RatingStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilters = useMemo(() => {
    const filters: { key: string; label: string; paramKey: string }[] = [];
    const ville = searchParams.get("ville");
    const date = searchParams.get("date");
    const personnes = searchParams.get("personnes");
    const type = searchParams.get("type");
    if (ville) filters.push({ key: "ville", label: ville, paramKey: "ville" });
    if (date) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) filters.push({ key: "date", label: format(d, "d MMMM yyyy", { locale: fr }), paramKey: "date" });
      } catch {
        filters.push({ key: "date", label: date, paramKey: "date" });
      }
    }
    if (personnes) filters.push({ key: "capacite", label: `${personnes} pers.`, paramKey: "personnes" });
    if (type) filters.push({ key: "type", label: TYPE_LABELS[type] ?? type, paramKey: "type" });
    return filters;
  }, [searchParams]);

  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState<SortKey>("pertinence");
  const [prixMin, setPrixMin] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [filtresOpen, setFiltresOpen] = useState(false);
  const [hoveredSalleId, setHoveredSalleId] = useState<string | null>(null);
  const [selectedSalleId, setSelectedSalleId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [mapVisible, setMapVisible] = useState(false);
  const [searchVille, setSearchVille] = useState(searchParams.get("ville") ?? "");
  const [searchDate, setSearchDate] = useState<Date | undefined>(() => {
    const d = searchParams.get("date");
    if (!d) return undefined;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  });
  const [searchType, setSearchType] = useState(searchParams.get("type") ?? "");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setMapVisible(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setFilters(initialFilters);
    setSearchVille(searchParams.get("ville") ?? "");
    const d = searchParams.get("date");
    setSearchDate(d ? (isNaN(new Date(d).getTime()) ? undefined : new Date(d)) : undefined);
    setSearchType(searchParams.get("type") ?? "");
  }, [initialFilters, searchParams]);

  const removeFilter = (paramKey: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(paramKey);
    router.push(`/rechercher${sp.toString() ? `?${sp.toString()}` : ""}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams.toString());
    if (searchVille.trim()) sp.set("ville", searchVille.trim());
    else sp.delete("ville");
    if (searchDate && !isNaN(searchDate.getTime())) sp.set("date", searchDate.toISOString().slice(0, 10));
    else sp.delete("date");
    if (searchType?.trim()) sp.set("type", searchType.trim());
    else sp.delete("type");
    router.push(`/rechercher${sp.toString() ? `?${sp.toString()}` : ""}`);
  };

  const filteredSalles = useMemo(() => {
    let list = [...salles];
    const min = prixMin ? parseInt(prixMin, 10) : 0;
    const max = prixMax ? parseInt(prixMax, 10) : 0;
    if (!isNaN(min) && min > 0) list = list.filter((s) => s.pricePerDay >= min);
    if (!isNaN(max) && max > 0) list = list.filter((s) => s.pricePerDay <= max);
    return list;
  }, [salles, prixMin, prixMax]);

  const handleMarkerClick = useCallback((salleId: string) => {
    setSelectedSalleId(salleId);
    cardRefs.current[salleId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const sortedSalles = useMemo(() => {
    const list = [...filteredSalles];
    switch (sort) {
      case "prix-asc":
        return list.sort((a, b) => a.pricePerDay - b.pricePerDay);
      case "prix-desc":
        return list.sort((a, b) => b.pricePerDay - a.pricePerDay);
      case "capacite":
        return list.sort((a, b) => b.capacity - a.capacity);
      default:
        return list;
    }
  }, [filteredSalles, sort]);

  return (
    <main className="container max-w-[1400px] py-6">
      {/* Mini barre de recherche */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[180px] flex-1">
            <VilleAutocomplete
              value={searchVille}
              onChange={setSearchVille}
              placeholder="Paris, Versailles, Meaux..."
              className="h-10"
              inputClassName="h-10 rounded-lg border-slate-200 pl-10 pr-3"
            />
          </div>
          <div className="w-[140px] shrink-0">
            <DatePicker
              value={searchDate}
              onChange={setSearchDate}
              placeholder="jj/mm/aaaa"
            />
          </div>
          <div className="relative w-[180px] shrink-0">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Select value={searchType || "all"} onValueChange={(v) => setSearchType(v === "all" ? "" : v)}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 pl-9 pr-9">
                <SelectValue placeholder="Type d'événement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="culte-regulier">Culte régulier</SelectItem>
                <SelectItem value="conference">Conférence</SelectItem>
                <SelectItem value="celebration">Célébration</SelectItem>
                <SelectItem value="bapteme">Baptême</SelectItem>
                <SelectItem value="retraite">Retraite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" className="h-10 shrink-0 gap-2 bg-[#213398] px-4 hover:bg-[#1a2980]">
            <Search className="h-4 w-4" />
            Rechercher
          </Button>
        </div>
      </form>

      {/* Filtres actifs (cliquables pour les retirer) */}
      {filters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {filters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700"
            >
              {f.label}
              <button
                type="button"
                onClick={() => removeFilter(f.paramKey)}
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
          {sortedSalles.length} salle{sortedSalles.length !== 1 ? "s" : ""} disponible{sortedSalles.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Popover open={filtresOpen} onOpenChange={setFiltresOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-4 w-4" />
                Filtres
                {(prixMin || prixMax) && (
                  <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#213398]/10 px-1.5 text-xs font-medium text-black">
                    1
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-[9999] w-72 p-4" align="end">
              <h4 className="mb-3 font-medium text-black">Filtres avancés</h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700">Prix min (€)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 50"
                    value={prixMin}
                    onChange={(e) => setPrixMin(e.target.value)}
                    min={0}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700">Prix max (€)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 500"
                    value={prixMax}
                    onChange={(e) => setPrixMax(e.target.value)}
                    min={0}
                    className="h-9"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={() => setFiltresOpen(false)}>
                  Appliquer
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SlidersHorizontal className="mr-1.5 h-4 w-4 shrink-0 text-slate-500" />
              <SelectValue placeholder="Pertinence" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="pertinence">Pertinence</SelectItem>
              <SelectItem value="prix-asc">Prix croissant</SelectItem>
              <SelectItem value="prix-desc">Prix décroissant</SelectItem>
              <SelectItem value="capacite">Capacité</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
          {sortedSalles.map((salle) => {
            const features = ["erp"];
            if (salle.features.some((f) => f.label.includes("Parking"))) features.push("parking");
            if (salle.features.some((f) => f.label.includes("PMR"))) features.push("pmr");
            if (salle.features.some((f) => f.label.includes("Sonorisation") || f.label.includes("audio")))
              features.push("sono");
            if (salle.features.some((f) => f.label.includes("Vidéo"))) features.push("video");
            if (salle.features.some((f) => f.label.includes("Piano"))) features.push("piano");
            if (salle.features.some((f) => f.label.includes("Cuisine"))) features.push("cuisine");

            const isHighlighted = hoveredSalleId === salle.id || selectedSalleId === salle.id;
            return (
              <div
                key={salle.id}
                ref={(el) => {
                  cardRefs.current[salle.id] = el;
                }}
                className={`flex gap-4 rounded-xl border-2 bg-white p-4 shadow-sm transition ${
                  isHighlighted ? "border-[#213398] ring-2 ring-[#213398]/20" : "border-slate-200 hover:border-[#213398]"
                }`}
                onMouseEnter={() => setHoveredSalleId(salle.id)}
                onMouseLeave={() => setHoveredSalleId(null)}
                onClick={() => setSelectedSalleId(salle.id)}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <Image
                    src={salle.images[0] ?? "/img.png"}
                    alt={salle.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full p-1.5 text-slate-400 hover:bg-white/80 hover:text-rose-500"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-black">{salle.name}</h3>
                  <p className="mt-1 text-[13px] text-slate-600">
                    {salle.capacity > 150
                      ? `${salle.capacity - 50}-${salle.capacity + 50} pers.`
                      : salle.capacity > 80
                        ? `${salle.capacity - 30}-${salle.capacity + 50} pers.`
                        : `${Math.floor(salle.capacity * 0.5)}-${salle.capacity} pers.`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {features.map((f) => {
                      const Icon = featureIcons[f];
                      return (
                        <span
                          key={f}
                          className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-600"
                        >
                          {Icon && <Icon className="mr-1 h-3 w-3" />}
                          {f}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-black">
                      {salle.pricePerDay}€ <span className="font-normal text-slate-500">/jour</span>
                    </p>
                    <Link href={`/salles/${salle.slug}`}>
                      <Button size="sm" className="h-8 bg-[#213398] text-[13px] hover:bg-[#1a2980]">
                        Voir la salle
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-0 min-w-0 overflow-hidden hidden lg:block">
          {mapVisible && (
            <SearchMap
              key="search-map"
              salles={sortedSalles}
              highlightedSalleId={hoveredSalleId ?? selectedSalleId}
              ratingStats={ratingStats}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>
      </div>
    </main>
  );
}
