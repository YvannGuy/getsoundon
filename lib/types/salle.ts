/**
 * Type « annonce » — la table Postgres reste `public.salles` (catalogue matériel / pack en v1 GetSoundOn).
 * Les champs optionnels gear_* / listing_kind supposent la migration `scripts/supabase-salles-gear-listing.sql`.
 */
export type ListingKind = "equipment" | "pack" | "service" | "venue";

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
  /** Public / charge utile indicative (optionnel pour le matériel — peut être 0). */
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
  /** Horaires de disponibilité (location / retrait), pas uniquement « lieu ». */
  horairesParJour?: Record<string, { debut: string; fin: string }>;
  joursOuverture?: string[];
  joursVisite?: string[] | null;
  visiteDates?: string[] | null;
  visiteHeureDebut?: string | null;
  visiteHeureFin?: string | null;
  visiteHorairesParDate?: Record<string, { debut: string; fin: string }> | null;
  /** Métadonnées matériel (migration SQL optionnelle). */
  listingKind?: ListingKind | null;
  gearCategory?: string | null;
  gearBrand?: string | null;
  gearModel?: string | null;
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
  horaires_par_jour?: Record<string, { debut: string; fin: string }> | null;
  jours_ouverture?: string[] | null;
  jours_visite?: string[] | null;
  visite_dates?: string[] | null;
  visite_heure_debut?: string | null;
  visite_heure_fin?: string | null;
  visite_horaires_par_date?: Record<string, { debut: string; fin: string }> | null;
  status: string;
  created_at: string;
  updated_at: string;
  listing_kind?: string | null;
  gear_category?: string | null;
  gear_brand?: string | null;
  gear_model?: string | null;
};

/** Retourne les libellés tarifs (ex: "800 € / jour · 90 € / heure · 879 € / mois") */
export function formatSalleTarifs(salle: Salle): string {
  const parts = getSalleTarifParts(salle);
  return parts.length > 0 ? parts.map((p) => `${p.value} € ${p.label}`).join(" · ") : "Sur demande";
}

export function getSalleTarifParts(salle: Salle): { value: number; label: string }[] {
  const parts: { value: number; label: string }[] = [];
  if (salle.pricePerDay > 0) parts.push({ value: salle.pricePerDay, label: "/ jour" });
  if (salle.pricePerHour && salle.pricePerHour > 0) parts.push({ value: salle.pricePerHour, label: "/ heure" });
  if (salle.pricePerMonth && salle.pricePerMonth > 0) parts.push({ value: salle.pricePerMonth, label: "/ mois" });
  return parts;
}

export function getSallePriceFrom(salle: Salle): { label: string; value: number } | null {
  if (salle.pricePerDay > 0) return { label: "/ jour", value: salle.pricePerDay };
  if (salle.pricePerHour && salle.pricePerHour > 0) return { label: "/ heure", value: salle.pricePerHour };
  if (salle.pricePerMonth && salle.pricePerMonth > 0) return { label: "/ mois", value: salle.pricePerMonth };
  return null;
}

function parseListingKind(raw: string | null | undefined): ListingKind | null {
  if (!raw) return null;
  if (raw === "equipment" || raw === "pack" || raw === "service" || raw === "venue") return raw;
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
    displayContactPhone: row.display_contact_phone ?? false,
    cautionRequise: row.caution_requise ?? false,
    capacity: row.capacity,
    pricePerDay: typeof row.price_per_day === "number" ? row.price_per_day : 0,
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
    horairesParJour: (row.horaires_par_jour as Record<string, { debut: string; fin: string }>) ?? undefined,
    joursOuverture: Array.isArray(row.jours_ouverture) ? row.jours_ouverture : undefined,
    joursVisite: Array.isArray(row.jours_visite) ? row.jours_visite : undefined,
    visiteDates: Array.isArray(row.visite_dates)
      ? row.visite_dates.map((d) => {
          if (typeof d === "string") return d;
          const val = d as unknown;
          return val instanceof Date ? val.toISOString().slice(0, 10) : String(d).slice(0, 10);
        })
      : undefined,
    visiteHeureDebut: row.visite_heure_debut ?? undefined,
    visiteHeureFin: row.visite_heure_fin ?? undefined,
    visiteHorairesParDate:
      row.visite_horaires_par_date &&
      typeof row.visite_horaires_par_date === "object" &&
      !Array.isArray(row.visite_horaires_par_date)
        ? (row.visite_horaires_par_date as Record<string, { debut: string; fin: string }>)
        : undefined,
    listingKind: parseListingKind(row.listing_kind ?? undefined),
    gearCategory: row.gear_category ?? null,
    gearBrand: row.gear_brand ?? null,
    gearModel: row.gear_model ?? null,
  };
}
