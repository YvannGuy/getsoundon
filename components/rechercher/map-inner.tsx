"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

// Génère des coordonnées légèrement décalées si manquantes (dans Île-de-France)
function getCoords(salle: Salle, index: number) {
  if (salle.lat && salle.lng) return { lat: salle.lat, lng: salle.lng };
  return {
    lat: ILE_DE_FRANCE_CENTER.lat + (index % 3) * 0.01 - 0.01,
    lng: ILE_DE_FRANCE_CENTER.lng + Math.floor(index / 3) * 0.015 - 0.015,
  };
}

const idfBounds = L.latLngBounds(
  [ILE_DE_FRANCE_BOUNDS[0][0], ILE_DE_FRANCE_BOUNDS[0][1]],
  [ILE_DE_FRANCE_BOUNDS[1][0], ILE_DE_FRANCE_BOUNDS[1][1]],
);

export function MapInner({ salles }: { salles: Salle[] }) {
  return (
    <div className="h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-slate-200 lg:min-h-[500px]">
      <MapContainer
        center={[ILE_DE_FRANCE_CENTER.lat, ILE_DE_FRANCE_CENTER.lng]}
        zoom={ILE_DE_FRANCE_ZOOM}
        className="h-full w-full"
        maxBounds={idfBounds}
        maxBoundsViscosity={1}
        minZoom={8}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {salles.map((salle, i) => {
          const coords = getCoords(salle, i);
          return (
            <Marker key={salle.id} position={[coords.lat, coords.lng]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{salle.name}</p>
                  <p className="text-slate-600">{salle.pricePerDay}€ / jour</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
