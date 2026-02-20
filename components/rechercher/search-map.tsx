"use client";

import { useEffect, useState } from "react";
import type { Salle } from "@/lib/types/salle";

type RatingStats = Record<string, { avg: number; count: number }>;

type SearchMapProps = {
  salles: Salle[];
  highlightedSalleId?: string | null;
  ratingStats?: RatingStats;
  onMarkerClick?: (salleId: string) => void;
};

export function SearchMap({
  salles,
  highlightedSalleId = null,
  ratingStats = {},
  onMarkerClick,
}: SearchMapProps) {
  const [MapComponent, setMapComponent] = useState<
    React.ComponentType<{
      salles: Salle[];
      highlightedSalleId?: string | null;
      ratingStats?: RatingStats;
      onMarkerClick?: (salleId: string) => void;
    }> | null
  >(null);

  useEffect(() => {
    import("./map-inner").then((mod) => setMapComponent(() => mod.MapInner));
  }, []);

  if (!MapComponent) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[500px]">
        <p className="text-sm text-slate-500">Chargement de la carte...</p>
      </div>
    );
  }

  return (
    <MapComponent
      salles={salles}
      highlightedSalleId={highlightedSalleId}
      ratingStats={ratingStats}
      onMarkerClick={onMarkerClick}
    />
  );
}
