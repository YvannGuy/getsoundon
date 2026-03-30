"use client";

import { MapContainer, TileLayer, Circle } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

const OFFSET_KM = 0.8;
const METERS_PER_DEG_LAT = 111320;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function obfuscatedCenter(lat: number, lng: number, listingId: string) {
  const h = hashId(listingId);
  const angle = (h % 360) * (Math.PI / 180);
  const distMeters = OFFSET_KM * 1000;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const deltaLat = (distMeters / METERS_PER_DEG_LAT) * Math.cos(angle);
  const deltaLng =
    cosLat !== 0 ? (distMeters / (METERS_PER_DEG_LAT * cosLat)) * Math.sin(angle) : 0;
  return { lat: lat + deltaLat, lng: lng + deltaLng };
}

type ListingZoneMapCardProps = {
  lat: number;
  lng: number;
  listingId: string;
  zoneLabel: string;
};

/** Carte indicative (cercle large, centre légèrement décalé) — pas d’adresse précise. */
export function ListingZoneMapCard({ lat, lng, listingId, zoneLabel }: ListingZoneMapCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const center = useMemo(() => obfuscatedCenter(lat, lng, listingId), [lat, lng, listingId]);

  if (!mounted || typeof window === "undefined") {
    return (
      <div className="flex aspect-[2.1/1] min-h-[200px] items-center justify-center bg-[#f0ebe6]">
        <p className="text-sm text-[#888]">Chargement de la carte…</p>
      </div>
    );
  }

  return (
    <div className="aspect-[2.1/1] min-h-[200px] w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[center.lat, center.lng]}
          radius={2400}
          pathOptions={{
            color: "#E86F1C",
            fillColor: "#E86F1C",
            fillOpacity: 0.18,
            weight: 2,
          }}
        />
      </MapContainer>
      <p className="sr-only">Zone approximative autour de {zoneLabel}, sans adresse exacte.</p>
    </div>
  );
}
