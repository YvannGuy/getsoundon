/**
 * Mapping des données onboarding → structure page salle
 * Utilisé lorsque les propriétaires ajoutent leur salle via le wizard.
 * Les données sont transformées pour affichage sur /salles/[slug]
 */

import type { Salle } from "./types/salle";

type HorairesJour = { debut: string; fin: string };

type OnboardingWizardData = {
  nom: string;
  ville: string;
  capacite: string;
  adresse: string;
  description: string;
  tarifParJour: string;
  inclusions: string[];
  placesParking: string;
  features: string[];
  horairesParJour?: Record<string, HorairesJour>;
  joursOuverture: string[];
  restrictionSonore: string;
  evenementsAcceptes: string[];
};

const FEATURE_TO_SALLE: Record<string, { label: string; sublabel?: string; icon: string }> = {
  erp: { label: "ERP conforme", icon: "check" },
  pmr: { label: "Accès PMR", sublabel: "Accessible aux personnes à mobilité réduite", icon: "wheelchair" },
  scene: { label: "Scène / estrade", icon: "list" },
  climatisation: { label: "Climatisation", icon: "check" },
  parking: { label: "Parking", sublabel: "places disponibles à proximité", icon: "parking" },
  mobilier: { label: "Mobilier", sublabel: "Chaises et tables modulables incluses", icon: "furniture" },
  son: { label: "Sonorisation", sublabel: "Système audio professionnel inclus", icon: "speaker" },
  lumiere: { label: "Lumière naturelle", icon: "check" },
};

const INCLUSION_LABELS: Record<string, string> = {
  location: "Location de la salle pour la journée",
  mobilier: "Mobilier et équipements",
  sono: "Système de sonorisation",
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
  const capacity = parseInt(data.capacite, 10) || 0;
  const pricePerDay = parseInt(data.tarifParJour, 10) || 0;

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
          label: `Horaires - ${jourCapitalized} : ${h.debut} - ${h.fin}`,
          icon: "clock",
        });
      }
    });
  }

  if (data.restrictionSonore) {
    conditions.push({
      label: `Restrictions sonores - ${RESTRICTION_LABELS[data.restrictionSonore] ?? data.restrictionSonore}`,
      icon: "volume",
    });
  }

  if (data.evenementsAcceptes.length > 0) {
    conditions.push({
      label: `Types d'événements acceptés - ${data.evenementsAcceptes.map((e) => EVENT_LABELS[e] ?? e).join(", ")}`,
      icon: "list",
    });
  }

  const pricingInclusions = data.inclusions
    .map((id) => INCLUSION_LABELS[id])
    .filter(Boolean);

  return {
    slug,
    name: data.nom || "Ma salle",
    city: data.ville || "",
    address: data.adresse ? `${data.adresse}, ${data.ville}` : data.ville,
    capacity,
    pricePerDay,
    description: data.description || "",
    images,
    features,
    conditions,
    pricingInclusions,
  };
}
