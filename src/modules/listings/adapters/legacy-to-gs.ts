export type LegacySalle = {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  price_per_day?: number | null;
};

export type GsListingUpsert = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: "sound" | "dj" | "lighting" | "services";
  price_per_day: number;
  location: string;
  lat: number | null;
  lng: number | null;
};

export function mapLegacySalleToGsListing(salle: LegacySalle): GsListingUpsert {
  return {
    id: salle.id,
    owner_id: salle.owner_id,
    title: salle.name,
    description: salle.description ?? "",
    category: "sound",
    price_per_day: salle.price_per_day ?? 0,
    location: salle.city ?? "",
    lat: salle.lat ?? null,
    lng: salle.lng ?? null,
  };
}
