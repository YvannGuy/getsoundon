/**
 * Type Salle utilisé partout (DB, affichage, recherche).
 */
export type Salle = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  pricePerDay: number;
  description: string;
  images: string[];
  features: { label: string; sublabel?: string; icon: string }[];
  conditions: { label: string; icon: string }[];
  pricingInclusions: string[];
  lat?: number;
  lng?: number;
};

export type SalleRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  price_per_day: number;
  description: string | null;
  images: string[];
  features: unknown;
  conditions: unknown;
  pricing_inclusions: string[];
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export function rowToSalle(row: SalleRow): Salle {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address,
    capacity: row.capacity,
    pricePerDay: row.price_per_day,
    description: row.description ?? "",
    images: Array.isArray(row.images) ? row.images : [],
    features: Array.isArray(row.features) ? (row.features as Salle["features"]) : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as Salle["conditions"]) : [],
    pricingInclusions: Array.isArray(row.pricing_inclusions) ? row.pricing_inclusions : [],
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}
