"use client";

import Link from "next/link";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapPin, Package } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import {
  ILE_DE_FRANCE_BOUNDS,
  ILE_DE_FRANCE_CENTER,
  ILE_DE_FRANCE_ZOOM,
} from "@/config/region";

const isBrowser = typeof window !== "undefined";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export type ListingMapItem = {
  id: string;
  title: string;
  location: string;
  price_per_day: number;
  lat: number | null;
  lng: number | null;
  category: string;
  image_url?: string | null;
};

function createPriceMarkerIcon(price: number | null) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const label = price != null && price > 0 ? `${Math.round(price)}€` : "—";
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#E86F1C;color:white;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer">${svg}<span>${label}</span></div>`,
    className: "price-marker",
    iconSize: [80, 36],
    iconAnchor: [40, 36],
    popupAnchor: [0, -48],
  });
}

const OFFSET_KM = 1;
const METERS_PER_DEG_LAT = 111320;
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function getObfuscatedCoords(lat: number, lng: number, listingId: string) {
  const h = hashId(listingId);
  const angle = (h % 360) * (Math.PI / 180);
  const distMeters = OFFSET_KM * 1000;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const deltaLat = (distMeters / METERS_PER_DEG_LAT) * Math.cos(angle);
  const deltaLng =
    cosLat !== 0 ? (distMeters / (METERS_PER_DEG_LAT * cosLat)) * Math.sin(angle) : 0;
  return { lat: lat + deltaLat, lng: lng + deltaLng };
}

const MIN_LAT = ILE_DE_FRANCE_BOUNDS[0][0];
const MAX_LAT = ILE_DE_FRANCE_BOUNDS[1][0];
const MIN_LNG = ILE_DE_FRANCE_BOUNDS[0][1];
const MAX_LNG = ILE_DE_FRANCE_BOUNDS[1][1];

function isInIdfBounds(lat: number, lng: number): boolean {
  return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
}

export function getListingCoords(listing: ListingMapItem, index: number) {
  const lat = Number(listing.lat);
  const lng = Number(listing.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const coords = getObfuscatedCoords(lat, lng, listing.id);
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
  listings,
  highlightedId,
}: {
  listings: ListingMapItem[];
  highlightedId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) return;
    const points = listings.map((l, i) => getListingCoords(l, i));
    const valid = points.filter((p) => isValidCoords(p));
    if (valid.length === 0) return;
    try {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { maxZoom: 14, padding: [40, 40] });
    } catch {
      // ignore
    }
  }, [listings, map]);

  useEffect(() => {
    if (!highlightedId) return;
    const idx = listings.findIndex((l) => l.id === highlightedId);
    if (idx < 0) return;
    const listing = listings[idx];
    if (!listing) return;
    const coords = getListingCoords(listing, idx);
    if (!isValidCoords(coords)) return;
    try {
      const zoom = map.getZoom();
      const safeZoom = Number.isFinite(zoom) ? Math.min(zoom, 15) : 12;
      map.setView([coords.lat, coords.lng], safeZoom, { animate: false });
    } catch {
      // ignore
    }
  }, [highlightedId, listings, map]);

  return null;
}

const idfBounds = L.latLngBounds(
  [ILE_DE_FRANCE_BOUNDS[0][0], ILE_DE_FRANCE_BOUNDS[0][1]],
  [ILE_DE_FRANCE_BOUNDS[1][0], ILE_DE_FRANCE_BOUNDS[1][1]]
);

function ViewportFilter({
  listings,
  onVisibleChange,
}: {
  listings: ListingMapItem[];
  onVisibleChange: (visible: ListingMapItem[]) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVisibleChangeRef = useRef(onVisibleChange);
  const lastVisibleIdsRef = useRef<string>("");
  onVisibleChangeRef.current = onVisibleChange;

  const map = useMapEvents({
    moveend: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        try {
          const bounds = map.getBounds();
          if (!bounds || typeof bounds.contains !== "function") return;
          const visible = listings.filter((l, i) => {
            const c = getListingCoords(l, i);
            if (!isValidCoords(c)) return false;
            try {
              return bounds.contains([c.lat, c.lng]);
            } catch {
              return false;
            }
          });
          const next = visible.length > 0 ? visible : listings;
          const nextIds = next.map((l) => l.id).sort().join(",");
          if (lastVisibleIdsRef.current !== nextIds) {
            lastVisibleIdsRef.current = nextIds;
            onVisibleChangeRef.current(next);
          }
        } catch {
          const nextIds = listings.map((l) => l.id).sort().join(",");
          if (lastVisibleIdsRef.current !== nextIds) {
            lastVisibleIdsRef.current = nextIds;
            onVisibleChangeRef.current(listings);
          }
        }
      }, 250);
    },
  });

  useEffect(() => {
    try {
      const bounds = map.getBounds();
      if (!bounds || typeof bounds.contains !== "function") return;
      const visible = listings.filter((l, i) => {
        const c = getListingCoords(l, i);
        if (!isValidCoords(c)) return false;
        try {
          return bounds.contains([c.lat, c.lng]);
        } catch {
          return false;
        }
      });
      const next = visible.length > 0 ? visible : listings;
      lastVisibleIdsRef.current = next.map((l) => l.id).sort().join(",");
      onVisibleChangeRef.current(next);
    } catch {
      lastVisibleIdsRef.current = listings.map((l) => l.id).sort().join(",");
      onVisibleChangeRef.current(listings);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [listings, map]);
  return null;
}

const ZONE_RADIUS_M = 1000;

function ListingsMapInnerComponent({
  listings,
  highlightedId = null,
  onMarkerClick,
}: {
  listings: ListingMapItem[];
  highlightedId?: string | null;
  onMarkerClick?: (listingId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(listings);
  const onVisibleChange = useCallback((v: ListingMapItem[]) => setVisible(v), []);

  useEffect(() => {
    setVisible(listings);
  }, [listings]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isBrowser) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 lg:aspect-auto lg:h-full lg:min-h-[500px]">
        <p className="text-sm text-slate-500">Chargement de la carte…</p>
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
        <MapPanController listings={listings} highlightedId={highlightedId} />
        <ViewportFilter listings={listings} onVisibleChange={onVisibleChange} />
        {visible.map((listing) => {
          const origIdx = listings.findIndex((l) => l.id === listing.id);
          const i = origIdx >= 0 ? origIdx : 0;
          const coords = getListingCoords(listing, i);
          if (!isValidCoords(coords)) return null;
          return (
            <Circle
              key={`zone-${listing.id}`}
              center={[coords.lat, coords.lng]}
              radius={ZONE_RADIUS_M}
              pathOptions={{
                color: "#E86F1C",
                fillColor: "#E86F1C",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
          );
        })}
        <MarkerClusterGroup chunkedLoading animate={false}>
          {visible.map((listing) => {
            const origIdx = listings.findIndex((l) => l.id === listing.id);
            const i = origIdx >= 0 ? origIdx : 0;
            const coords = getListingCoords(listing, i);
            if (!isValidCoords(coords)) return null;
            const price = listing.price_per_day > 0 ? listing.price_per_day : null;
            return (
              <Marker
                key={listing.id}
                position={[coords.lat, coords.lng]}
                icon={createPriceMarkerIcon(price)}
                eventHandlers={{
                  click: () => onMarkerClick?.(listing.id),
                }}
              >
                <Popup
                  maxWidth={300}
                  minWidth={260}
                  className="map-marker-popup map-marker-popup-large"
                  autoPan={false}
                >
                  <div className="map-popup-content">
                    <Link
                      href={`/items/${listing.id}`}
                      className="block overflow-hidden rounded-t-xl border border-slate-200 border-b-0 bg-white transition hover:opacity-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-slate-100">
                        {listing.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-base font-bold text-black">{listing.title}</h3>
                        <p className="mt-2 flex items-center gap-1.5 truncate text-[13px] text-slate-600">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                          {listing.location}
                        </p>
                      </div>
                    </Link>
                    <div
                      className="flex cursor-default items-center justify-center gap-2 rounded-b-xl border border-t-0 border-slate-200 bg-gs-orange px-4 py-2 text-white shadow-md"
                      style={{ pointerEvents: "none" }}
                    >
                      <span className="font-semibold">
                        {price != null ? `${Math.round(price)} € / jour` : "Sur demande"}
                      </span>
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
}

export const ListingsMapInner = memo(ListingsMapInnerComponent);
