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
  videoUrl?: string | null;
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
  video_url?: string | null;
  features: unknown;
  conditions: unknown;
  pricing_inclusions: string[];
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/** Retourne les libellés tarifs (ex: "800 € / jour · 90 € / heure · 879 € / mois") - tarif horaire avant mensuel */
export function formatSalleTarifs(salle: Salle): string {
  const parts = getSalleTarifParts(salle);
  return parts.length > 0 ? parts.map((p) => `${p.value} € ${p.label}`).join(" · ") : "Sur demande";
}

/** Retourne les tarifs sous forme de parts pour affichage séparé (ordre: jour, heure, mois) */
export function getSalleTarifParts(salle: Salle): { value: number; label: string }[] {
  const parts: { value: number; label: string }[] = [];
  if (salle.pricePerDay > 0) parts.push({ value: salle.pricePerDay, label: "/ jour" });
  if (salle.pricePerHour && salle.pricePerHour > 0) parts.push({ value: salle.pricePerHour, label: "/ heure" });
  if (salle.pricePerMonth && salle.pricePerMonth > 0) parts.push({ value: salle.pricePerMonth, label: "/ mois" });
  return parts;
}

/** Premier tarif affichable pour "À partir de" - horaire avant mensuel */
export function getSallePriceFrom(salle: Salle): { label: string; value: number } | null {
  if (salle.pricePerDay > 0) return { label: "/ jour", value: salle.pricePerDay };
  if (salle.pricePerHour && salle.pricePerHour > 0) return { label: "/ heure", value: salle.pricePerHour };
  if (salle.pricePerMonth && salle.pricePerMonth > 0) return { label: "/ mois", value: salle.pricePerMonth };
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
    videoUrl: row.video_url ?? null,
    features: Array.isArray(row.features) ? (row.features as Salle["features"]) : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as Salle["conditions"]) : [],
    pricingInclusions: Array.isArray(row.pricing_inclusions) ? row.pricing_inclusions : [],
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}
