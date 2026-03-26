/**
 * Mapping des données onboarding → structure page annonce (`salles`).
 * Table Postgres inchangée : `public.salles` = catalogue matériel / pack en v1.
 */

import { FEATURE_TO_SALLE, INCLUSION_LABELS } from "./salle-features";
import type { ListingKind, Salle } from "./types/salle";

type HorairesJour = { debut: string; fin: string };

export type OnboardingWizardData = {
  nom: string;
  ville: string;
  capacite: string;
  adresse: string;
  description: string;
  tarifParJour: string;
  tarifMensuel?: string;
  tarifHoraire?: string;
  inclusions: string[];
  placesParking: string;
  features: string[];
  horairesParJour?: Record<string, HorairesJour>;
  joursOuverture: string[];
  restrictionSonore: string;
  evenementsAcceptes: string[];
  listingKind?: ListingKind;
  gearCategory?: string;
  gearBrand?: string;
  gearModel?: string;
};

const RESTRICTION_LABELS: Record<string, string> = {
  none: "Aucune restriction sonore",
  modere: "Niveau sonore modéré requis",
  no_music: "Musique interdite",
  horaires: "Horaires stricts",
};

const EVENT_LABELS: Record<string, string> = {
  culte: "Culte régulier",
  bapteme: "Baptême",
  conference: "Conférence",
  concert: "Concert",
  retraite: "Retraite",
  veillee_priere: "Veillée de prière",
};

export function mapOnboardingToSalle(
  data: OnboardingWizardData,
  slug: string,
  images: string[] = ["/img.png"]
): Partial<Salle> {
  const capacity = parseInt(data.capacite, 10);
  const capacitySafe = Number.isFinite(capacity) && capacity >= 0 ? capacity : 0;
  const pricePerDay = parseInt(data.tarifParJour, 10) || 0;
  const pricePerMonth = data.tarifMensuel?.trim() ? parseInt(data.tarifMensuel, 10) || null : null;
  const pricePerHour = data.tarifHoraire?.trim() ? parseInt(data.tarifHoraire, 10) || null : null;

  const features = data.features
    .map((id) => {
      const mapped = FEATURE_TO_SALLE[id];
      if (!mapped) return null;
      if (id === "parking" && data.placesParking) {
        return { ...mapped, sublabel: `${data.placesParking} places disponibles à proximité` };
      }
      return mapped;
    })
    .filter(Boolean) as { label: string; sublabel?: string; icon: string }[];

  const conditions: { label: string; icon: string }[] = [];

  if (data.joursOuverture.length > 0 && data.horairesParJour && Object.keys(data.horairesParJour).length > 0) {
    data.joursOuverture.forEach((jour) => {
      const h = data.horairesParJour![jour];
      if (h?.debut && h?.fin) {
        const jourCapitalized = jour.charAt(0).toUpperCase() + jour.slice(1);
        conditions.push({
          label: `Disponibilité — ${jourCapitalized} : ${h.debut} - ${h.fin}`,
          icon: "clock",
        });
      }
    });
  }

  if (data.restrictionSonore) {
    conditions.push({
      label: `Restrictions sonores — ${RESTRICTION_LABELS[data.restrictionSonore] ?? data.restrictionSonore}`,
      icon: "volume",
    });
  }

  if (data.evenementsAcceptes.length > 0) {
    conditions.push({
      label: `Usages cibles — ${data.evenementsAcceptes.map((e) => EVENT_LABELS[e] ?? e).join(", ")}`,
      icon: "list",
    });
  }

  const pricingInclusions = data.inclusions
    .map((id) => INCLUSION_LABELS[id])
    .filter(Boolean);

  const ville = data.ville?.trim() ?? "";
  const adresse = data.adresse?.trim() ?? "";
  const addressLine = adresse ? `${adresse}, ${ville}`.trim() : ville;

  const listingKind = (data.listingKind ?? "equipment") as ListingKind;

  return {
    slug,
    name: data.nom?.trim() || "Annonce matériel",
    city: ville,
    address: addressLine,
    capacity: capacitySafe,
    pricePerDay,
    pricePerMonth: pricePerMonth ?? undefined,
    pricePerHour: pricePerHour ?? undefined,
    description: data.description || "",
    images,
    features,
    conditions,
    pricingInclusions,
    listingKind,
    gearCategory: data.gearCategory?.trim() || null,
    gearBrand: data.gearBrand?.trim() || null,
    gearModel: data.gearModel?.trim() || null,
  };
}
