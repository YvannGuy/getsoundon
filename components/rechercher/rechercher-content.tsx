"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Car, CheckCircle2, CookingPot, Heart, MapPin, Piano, Tv, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchMap } from "@/components/rechercher/search-map";
import { mockSalles } from "@/lib/mock-salles";

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

export function RechercherContent() {
  const searchParams = useSearchParams();
  const initialFilters = useMemo(() => {
    const filters: { key: string; label: string }[] = [];
    const ville = searchParams.get("ville");
    const date = searchParams.get("date");
    const personnes = searchParams.get("personnes");
    const type = searchParams.get("type");
    if (ville) filters.push({ key: "ville", label: ville });
    if (date) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) filters.push({ key: "date", label: format(d, "d MMMM yyyy", { locale: fr }) });
      } catch {
        filters.push({ key: "date", label: date });
      }
    }
    if (personnes) filters.push({ key: "capacite", label: `${personnes} pers.` });
    if (type) filters.push({ key: "type", label: TYPE_LABELS[type] ?? type });
    return filters.length ? filters : [{ key: "ville", label: "Paris" }, { key: "date", label: "12 Mars 2026" }, { key: "capacite", label: "120 pers." }, { key: "type", label: "Conférence" }];
  }, [searchParams]);

  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const removeFilter = (key: string) => {
    setFilters((prev) => prev.filter((f) => f.key !== key));
  };

  return (
    <main className="container max-w-[1400px] py-6">
      <p className="mb-3 text-[13px] text-slate-500">
        Recherche limitée à l&apos;Île-de-France
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {filters.map((f) => (
          <span
            key={f.key}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700"
          >
            {f.label}
            <button
              type="button"
              onClick={() => removeFilter(f.key)}
              className="rounded-full p-0.5 hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-slate-700">
          {mockSalles.length} salles disponibles
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9">
            Filtres
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            Pertinence
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
          {mockSalles.map((salle) => {
            const features = ["erp"];
            if (salle.features.some((f) => f.label.includes("Parking"))) features.push("parking");
            if (salle.features.some((f) => f.label.includes("PMR"))) features.push("pmr");
            if (salle.features.some((f) => f.label.includes("Sonorisation") || f.label.includes("audio")))
              features.push("sono");
            if (salle.features.some((f) => f.label.includes("Vidéo"))) features.push("video");
            if (salle.features.some((f) => f.label.includes("Piano"))) features.push("piano");
            if (salle.features.some((f) => f.label.includes("Cuisine"))) features.push("cuisine");

            return (
              <div
                key={salle.id}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
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
                  <h3 className="font-semibold text-[#304256]">{salle.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {salle.address}
                  </p>
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
                    <p className="text-[15px] font-semibold text-[#304256]">
                      {salle.pricePerDay}€ <span className="font-normal text-slate-500">/jour</span>
                    </p>
                    <Link href={`/salles/${salle.slug}`}>
                      <Button size="sm" className="h-8 bg-[#2d435a] text-[13px] hover:bg-[#243a4d]">
                        Voir la salle
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative hidden lg:block">
          <SearchMap salles={mockSalles} />
        </div>
      </div>
    </main>
  );
}
