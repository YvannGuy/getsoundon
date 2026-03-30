"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Salle } from "@/lib/types/salle";

const MapInner = dynamic(() => import("./salle-map-inner").then((m) => m.SalleMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
      <div className="text-center text-slate-500">
        <MapPin className="mx-auto h-8 w-8 animate-pulse" />
        <p className="mt-2 text-sm">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

function extractPostcode(text: string): string | null {
  const match = text.match(/\b(75\d{3}|77\d{3}|78\d{3}|91\d{3}|92\d{3}|93\d{3}|94\d{3}|95\d{3})\b/);
  return match ? match[1] : null;
}

async function geocodeZone(
  address: string,
  city: string
): Promise<{ lat: number; lng: number; radius: number } | null> {
  const postcode = extractPostcode(address);
  const isParis = city?.toLowerCase().includes("paris");

  let query: string;
  let radius: number;

  if (isParis && postcode && postcode.startsWith("75")) {
    query = postcode;
    radius = 1200;
  } else if (postcode) {
    query = `${postcode}`;
    radius = 3500;
  } else {
    query = city?.trim() || "";
    radius = 3500;
  }

  if (!query) return null;

  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search?q=${encodeURIComponent(query)}&limit=1`
    );
    const data = await res.json();
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (coords && Array.isArray(coords) && coords.length >= 2) {
      return { lng: coords[0], lat: coords[1], radius };
    }
  } catch {
    // ignore
  }
  return null;
}

export function SalleMap({ salle }: { salle: Salle }) {
  const [zone, setZone] = useState<{ lat: number; lng: number; radius: number } | null>(() => null);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  useEffect(() => {
    if (zone) return;
    if (!salle.city?.trim()) {
      setGeocodeFailed(true);
      return;
    }
    let cancelled = false;
    geocodeZone("", salle.city).then((result) => {
      if (!cancelled && result) setZone(result);
      else if (!cancelled) setGeocodeFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [zone, salle.city]);

  if (geocodeFailed && !zone) {
    const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(salle.city)}`;
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
        <MapPin className="h-10 w-10 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-600">{salle.city}</p>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <MapPin className="h-4 w-4" />
          Voir sur la carte
        </a>
      </div>
    );
  }

  if (zone) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapInner lat={zone.lat} lng={zone.lng} radius={zone.radius} city={salle.city} />
      </div>
    );
  }

  return (
    <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
      <div className="text-center text-slate-500">
        <MapPin className="mx-auto h-8 w-8 animate-pulse" />
        <p className="mt-2 text-sm">Chargement de la carte...</p>
      </div>
    </div>
  );
}
