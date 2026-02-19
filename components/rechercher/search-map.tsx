"use client";

import { useEffect, useState } from "react";
import type { Salle } from "@/lib/mock-salles";

// Coords Paris centre pour les salles sans lat/lng
const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 };

export function SearchMap({ salles }: { salles: Salle[] }) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ salles: Salle[] }> | null>(null);

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

  return <MapComponent salles={salles} />;
}
