/**
 * Type Salle utilisé partout (DB, affichage, recherche).
 */
export type Salle = {
  id: string;
  ownerId?: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  contactPhone?: string | null;
  displayContactPhone?: boolean;
  cautionRequise?: boolean;
  capacity: number;
  pricePerDay: number;
  pricePerMonth?: number | null;
  pricePerHour?: number | null;
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
  contact_phone?: string | null;
  display_contact_phone?: boolean;
  caution_requise?: boolean;
  capacity: number;
  price_per_day: number;
  price_per_month?: number | null;
  price_per_hour?: number | null;
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

/** Retourne les libellés tarifs (ex: "800 € / jour · 1500 € / mois") */
export function formatSalleTarifs(salle: Salle): string {
  const parts: string[] = [];
  if (salle.pricePerDay > 0) parts.push(`${salle.pricePerDay} € / jour`);
  if (salle.pricePerMonth && salle.pricePerMonth > 0) parts.push(`${salle.pricePerMonth} € / mois`);
  if (salle.pricePerHour && salle.pricePerHour > 0) parts.push(`${salle.pricePerHour} € / heure`);
  return parts.join(" · ") || "Sur demande";
}

/** Premier tarif affichable pour "À partir de" */
export function getSallePriceFrom(salle: Salle): { label: string; value: number } | null {
  if (salle.pricePerDay > 0) return { label: "/ jour", value: salle.pricePerDay };
  if (salle.pricePerMonth && salle.pricePerMonth > 0) return { label: "/ mois", value: salle.pricePerMonth };
  if (salle.pricePerHour && salle.pricePerHour > 0) return { label: "/ heure", value: salle.pricePerHour };
  return null;
}

export function rowToSalle(row: SalleRow): Salle {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address,
    contactPhone: row.contact_phone ?? null,
    displayContactPhone: row.display_contact_phone ?? true,
    cautionRequise: row.caution_requise ?? false,
    capacity: row.capacity,
    pricePerDay: row.price_per_day,
    pricePerMonth: row.price_per_month ?? null,
    pricePerHour: row.price_per_hour ?? null,
    description: row.description ?? "",
    images: Array.isArray(row.images) ? row.images : [],
    features: Array.isArray(row.features) ? (row.features as Salle["features"]) : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as Salle["conditions"]) : [],
    pricingInclusions: Array.isArray(row.pricing_inclusions) ? row.pricing_inclusions : [],
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}
