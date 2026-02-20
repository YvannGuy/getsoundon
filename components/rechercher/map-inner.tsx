"use client";

import Link from "next/link";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Check, Home, MapPin, Star, Users } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

// Éviter toute exécution Leaflet côté serveur / avant montage DOM
const isBrowser = typeof window !== "undefined";
import type { Salle } from "@/lib/types/salle";
import {
  ILE_DE_FRANCE_BOUNDS,
  ILE_DE_FRANCE_CENTER,
  ILE_DE_FRANCE_ZOOM,
} from "@/config/region";

// Fix Leaflet default icon avec Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Badge maison + prix (bleu, icône blanche à gauche, prix à droite)
function createPriceMarkerIcon(pricePerDay: number) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#2d435a;color:white;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer">${svg}<span>${pricePerDay}€</span></div>`,
    className: "price-marker",
    iconSize: [80, 36],
    iconAnchor: [40, 36],
    popupAnchor: [0, 10],
  });
}

// Décalage fixe de 1 km pour masquer l'adresse exacte
const OFFSET_KM = 1;
const METERS_PER_DEG_LAT = 111320;
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i) | 0;
  return Math.abs(h);
}
function getObfuscatedCoords(lat: number, lng: number, salleId: string) {
  const h = hashId(salleId);
  const angle = (h % 360) * (Math.PI / 180);
  const distMeters = OFFSET_KM * 1000;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const deltaLat = (distMeters / METERS_PER_DEG_LAT) * Math.cos(angle);
  const deltaLng =
    cosLat !== 0
      ? (distMeters / (METERS_PER_DEG_LAT * cosLat)) * Math.sin(angle)
      : 0;
  return {
    lat: lat + deltaLat,
    lng: lng + deltaLng,
  };
}

const MIN_LAT = ILE_DE_FRANCE_BOUNDS[0][0];
const MAX_LAT = ILE_DE_FRANCE_BOUNDS[1][0];
const MIN_LNG = ILE_DE_FRANCE_BOUNDS[0][1];
const MAX_LNG = ILE_DE_FRANCE_BOUNDS[1][1];

function isInIdfBounds(lat: number, lng: number): boolean {
  return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
}

export function getCoords(salle: Salle, index: number) {
  const lat = Number(salle.lat);
  const lng = Number(salle.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const coords = getObfuscatedCoords(lat, lng, salle.id);
    if (
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng) &&
      isInIdfBounds(coords.lat, coords.lng)
    ) {
      return coords;
    }
  }
  const offsetLat = (index % 5) * 0.03 - 0.06;
  const offsetLng = Math.floor(index / 5) * 0.04 - 0.08;
  return {
    lat: ILE_DE_FRANCE_CENTER.lat + offsetLat,
    lng: ILE_DE_FRANCE_CENTER.lng + offsetLng,
  };
}

function isValidCoords(c: { lat: number; lng: number }): boolean {
  return Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

function MapPanController({
  salles,
  highlightedSalleId,
}: {
  salles: Salle[];
  highlightedSalleId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (salles.length === 0) return;
    const points = salles.map((s, i) => getCoords(s, i));
    const valid = points.filter((p) => isValidCoords(p));
    if (valid.length === 0) return;
    try {
      const bounds = L.latLngBounds(
        valid.map((p) => [p.lat, p.lng] as [number, number])
      );
      map.fitBounds(bounds, { maxZoom: 14, padding: [40, 40] });
    } catch {
      // Ignore fitBounds errors (e.g. invalid bounds, map not ready)
    }
  }, [salles, map]);

  useEffect(() => {
    if (!highlightedSalleId) return;
    const idx = salles.findIndex((s) => s.id === highlightedSalleId);
    if (idx < 0) return;
    const salle = salles[idx];
    if (!salle) return;
    const coords = getCoords(salle, idx);
    if (!isValidCoords(coords)) return;
    try {
      const zoom = map.getZoom();
      const safeZoom = Number.isFinite(zoom) ? Math.min(zoom, 15) : 12;
      map.flyTo([coords.lat, coords.lng], safeZoom, { duration: 0.5 });
    } catch {
      // Ignore flyTo errors
    }
  }, [highlightedSalleId, salles, map]);

  return null;
}

const idfBounds = L.latLngBounds(
  [ILE_DE_FRANCE_BOUNDS[0][0], ILE_DE_FRANCE_BOUNDS[0][1]],
  [ILE_DE_FRANCE_BOUNDS[1][0], ILE_DE_FRANCE_BOUNDS[1][1]],
);

type RatingStats = Record<string, { avg: number; count: number }>;

function ViewportFilter({
  salles,
  onVisibleChange,
}: {
  salles: Salle[];
  onVisibleChange: (visible: Salle[]) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVisibleChangeRef = useRef(onVisibleChange);
  onVisibleChangeRef.current = onVisibleChange;

  const map = useMapEvents({
    moveend: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        try {
          const bounds = map.getBounds();
          if (!bounds || typeof bounds.contains !== "function") return;
          const visible = salles.filter((s, i) => {
            const c = getCoords(s, i);
            if (!isValidCoords(c)) return false;
            try {
              return bounds.contains([c.lat, c.lng]);
            } catch {
              return false;
            }
          });
          onVisibleChangeRef.current(visible.length > 0 ? visible : salles);
        } catch {
          onVisibleChangeRef.current(salles);
        }
      }, 100);
    },
  });

  useEffect(() => {
    try {
      const bounds = map.getBounds();
      if (!bounds || typeof bounds.contains !== "function") return;
      const visible = salles.filter((s, i) => {
        const c = getCoords(s, i);
        if (!isValidCoords(c)) return false;
        try {
          return bounds.contains([c.lat, c.lng]);
        } catch {
          return false;
        }
      });
      onVisibleChangeRef.current(visible.length > 0 ? visible : salles);
    } catch {
      onVisibleChangeRef.current(salles);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [salles, map]);
  return null;
}

const ZONE_RADIUS_M = 1000;

function MapInnerComponent({
  salles,
  highlightedSalleId = null,
  ratingStats = {},
  onMarkerClick,
}: {
  salles: Salle[];
  highlightedSalleId?: string | null;
  ratingStats?: RatingStats;
  onMarkerClick?: (salleId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visibleSalles, setVisibleSalles] = useState(salles);
  const onVisibleChange = useCallback((v: Salle[]) => setVisibleSalles(v), []);

  useEffect(() => {
    setVisibleSalles(salles);
  }, [salles]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isBrowser) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[500px]">
        <p className="text-sm text-slate-500">Chargement de la carte...</p>
      </div>
    );
  }

  return (
    <div className="map-wrapper h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-slate-200 lg:min-h-[500px]">
      <MapContainer
        center={[ILE_DE_FRANCE_CENTER.lat, ILE_DE_FRANCE_CENTER.lng]}
        zoom={ILE_DE_FRANCE_ZOOM}
        className="h-full w-full"
        maxBounds={idfBounds}
        maxBoundsViscosity={1}
        minZoom={8}
        maxZoom={18}
        closePopupOnClick={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapPanController salles={salles} highlightedSalleId={highlightedSalleId} />
        <ViewportFilter salles={salles} onVisibleChange={onVisibleChange} />
        {visibleSalles.map((salle) => {
          const origIdx = salles.findIndex((s) => s.id === salle.id);
          const i = origIdx >= 0 ? origIdx : 0;
          const coords = getCoords(salle, i);
          if (!isValidCoords(coords)) return null;
          return (
            <Circle
              key={`zone-${salle.id}`}
              center={[coords.lat, coords.lng]}
              radius={ZONE_RADIUS_M}
              pathOptions={{
                color: "#2d435a",
                fillColor: "#2d435a",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
          );
        })}
        <MarkerClusterGroup chunkedLoading>
        {visibleSalles.map((salle) => {
          const origIdx = salles.findIndex((s) => s.id === salle.id);
          const i = origIdx >= 0 ? origIdx : 0;
          const coords = getCoords(salle, i);
          if (!isValidCoords(coords)) return null;
          const rating = ratingStats[salle.id];
          const avg = rating?.avg ?? 0;
          const count = rating?.count ?? 0;
          return (
            <Marker
              key={salle.id}
              position={[coords.lat, coords.lng]}
              icon={createPriceMarkerIcon(salle.pricePerDay)}
              eventHandlers={{
                click: () => onMarkerClick?.(salle.id),
              }}
            >
              <Popup
                maxWidth={320}
                minWidth={280}
                className="map-marker-popup map-marker-popup-large"
                autoPan={true}
                autoPanPadding={[20, 20]}
                autoPanPaddingTopLeft={[20, 20]}
                autoPanPaddingBottomRight={[20, 20]}
              >
                <div className="map-popup-content">
                  <Link
                    href={`/salles/${salle.slug}`}
                    className="block overflow-hidden rounded-t-xl border border-slate-200 border-b-0 bg-white transition hover:opacity-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative h-28 overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={salle.images[0] ?? "/img.png"}
                        alt={salle.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-emerald-600 shadow-sm">
                        <Check className="h-3.5 w-3.5" />
                        Vérifiée
                      </span>
                    </div>
                    <div className="p-3">
                      <h3 className="truncate text-base font-bold text-[#304256]">{salle.name}</h3>
                      <div className="mt-2 space-y-1 text-[13px] text-slate-600">
                        {avg > 0 && (
                          <p className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-slate-900">{avg.toFixed(1)}</span>
                            <span>({count} avis)</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                          {salle.city}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 shrink-0 text-slate-400" />
                          {salle.capacity} pers.
                        </p>
                      </div>
                    </div>
                  </Link>
                  {/* Marqueur bleu en bas : maison + prix (tip visuel vers le point sur la carte) */}
                  <div
                    className="flex cursor-default items-center justify-center gap-2 rounded-b-xl border border-t-0 border-slate-200 bg-[#2d435a] px-4 py-2 text-white shadow-md"
                    style={{ pointerEvents: "none" }}
                  >
                    <Home size={20} strokeWidth={2} className="shrink-0" />
                    <span className="font-semibold">{salle.pricePerDay}€ / jour</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export const MapInner = memo(MapInnerComponent);
