"use client";

import { useEffect, useState } from "react";

import type { ListingMapItem } from "@/components/items/listings-map-inner";

type ListingsSearchMapProps = {
  listings: ListingMapItem[];
  highlightedId?: string | null;
  onMarkerClick?: (listingId: string) => void;
};

export function ListingsSearchMap({
  listings,
  highlightedId = null,
  onMarkerClick,
}: ListingsSearchMapProps) {
  const [MapComponent, setMapComponent] = useState<
    React.ComponentType<{
      listings: ListingMapItem[];
      highlightedId?: string | null;
      onMarkerClick?: (listingId: string) => void;
    }> | null
  >(null);

  useEffect(() => {
    import("@/components/items/listings-map-inner").then((mod) =>
      setMapComponent(() => mod.ListingsMapInner)
    );
  }, []);

  if (!MapComponent) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[500px]">
        <p className="text-sm text-slate-500">Chargement de la carte…</p>
      </div>
    );
  }

  return (
    <MapComponent
      listings={listings}
      highlightedId={highlightedId}
      onMarkerClick={onMarkerClick}
    />
  );
}
