/**
 * Synchronise les champs « wizard GetSoundOn » vers le payload attendu par createSalleFromOnboarding.
 * TODO: colonnes dédiées (zone, politique d’annulation, etc.) quand le schéma évoluera.
 */

import type { OnboardingWizardData } from "@/lib/onboarding-to-salle";

export type AccountTypeGs = "" | "particulier" | "auto_entrepreneur" | "societe";

export const GS_OFFER_CATEGORY_IDS = ["sono", "lumiere", "dj", "video", "micros", "packs"] as const;
export type GsOfferCategoryId = (typeof GS_OFFER_CATEGORY_IDS)[number];

export const GS_ADDITIONAL_SERVICE_IDS = ["livraison", "installation", "technicien", "retrait_sur_place"] as const;
export type GsAdditionalServiceId = (typeof GS_ADDITIONAL_SERVICE_IDS)[number];

export const GS_HANDOFF_IDS = ["retrait", "livraison", "livraison_installation"] as const;
export type GsHandoffId = (typeof GS_HANDOFF_IDS)[number];

const ACCOUNT_LABELS: Record<AccountTypeGs, string> = {
  "": "",
  particulier: "Particulier",
  auto_entrepreneur: "Auto-entrepreneur",
  societe: "Société / prestataire événementiel",
};

const CAT_LABELS: Record<GsOfferCategoryId, string> = {
  sono: "Sono",
  lumiere: "Lumière",
  dj: "DJ",
  video: "Vidéo",
  micros: "Microphones",
  packs: "Packs événementiels",
};

const SVC_LABELS: Record<GsAdditionalServiceId, string> = {
  livraison: "Livraison",
  installation: "Installation",
  technicien: "Technicien",
  retrait_sur_place: "Retrait sur place",
};

const HANDOFF_LABELS: Record<GsHandoffId, string> = {
  retrait: "Retrait sur place",
  livraison: "Livraison",
  livraison_installation: "Livraison + installation",
};

const LEAD_LABELS: Record<string, string> = {
  same_day: "Même jour",
  "24h": "24 h",
  "48h": "48 h",
  other: "Autre (précisé dans la description)",
};

const CANCEL_LABELS: Record<string, string> = {
  flexible: "Flexible",
  moderate: "Modérée",
  strict: "Stricte",
};

/** Catégories étape 2 → ids `features` (salle-features / FEATURE_TO_SALLE). */
export function gsCategoriesToFeatureIds(categories: string[]): string[] {
  const set = new Set<string>();
  const map: Record<string, string[]> = {
    sono: ["son_ligne", "caisson_basse"],
    lumiere: ["lumieres_led"],
    dj: ["table_mix"],
    video: ["connectique"],
    micros: ["micros"],
    packs: ["flight_case", "son_ligne"],
  };
  for (const c of categories) {
    for (const id of map[c] ?? []) set.add(id);
  }
  return Array.from(set);
}

/** Première catégorie → `gear_category` SQL. */
export function gsPrimaryGearCategory(
  categories: string[],
  listingKind: "equipment" | "pack"
): string {
  if (listingKind === "pack") return "pack_premium";
  const order = ["sono", "lumiere", "dj", "video", "micros", "packs"];
  for (const o of order) {
    if (categories.includes(o)) {
      const m: Record<string, string> = {
        sono: "son",
        lumiere: "lumiere",
        dj: "dj",
        video: "video",
        micros: "micros",
        packs: "pack_premium",
      };
      return m[o] ?? "son";
    }
  }
  return "son";
}

const JOURS_SEM = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;
const JOURS_WE = ["samedi", "dimanche"] as const;

export type GsWizardSyncInput = {
  accountType: AccountTypeGs;
  raisonSociale: string;
  contactEmail: string;
  contactPhone: string;
  ville: string;
  /** Étape boutique — injecté dans la description annonce tant que le schéma n’a pas de colonnes dédiées. */
  storefrontName: string;
  storefrontDescription: string;
  storefrontLocationDisplay: string;
  postalCode?: string;
  offeredCategories: string[];
  additionalServices: string[];
  handoffModes: string[];
  adresse: string;
  rayonKm: string;
  villesDesservies: string;
  dispoSemaine: boolean;
  dispoWeekend: boolean;
  dispoSoiree: boolean;
  horairesRetrait: string;
  bookingMode: "manual" | "instant";
  cautionEnabled: boolean;
  cautionAmountDefault: string;
  leadTime: string;
  leadTimeOther: string;
  cancellationPolicy: string;
  listingKind: "equipment" | "pack";
  nom: string;
  gearCategoryField: string;
  gearBrand: string;
  gearModel: string;
  description: string;
  tarifParJour: string;
  capacite: string;
  quantite: string;
  etatMateriel: string;
  packUsage: string;
  packContents: string;
  packLivraison: boolean;
  packInstallation: boolean;
};

export function buildGsOnboardingDescription(d: GsWizardSyncInput): string {
  const parts: string[] = [];

  if (d.storefrontName.trim()) {
    const tag = d.storefrontDescription.trim()
      ? ` — ${d.storefrontDescription.trim()}`
      : "";
    parts.push(`Boutique GetSoundOn « ${d.storefrontName.trim()} »${tag}.`);
    if (d.storefrontLocationDisplay.trim()) {
      parts.push(`Localisation affichée : ${d.storefrontLocationDisplay.trim()}.`);
    }
  }

  if (d.raisonSociale.trim()) {
    const acc = d.accountType ? ACCOUNT_LABELS[d.accountType] : "";
    parts.push(
      `Prestataire : ${d.raisonSociale.trim()}${acc ? ` (${acc})` : ""}.`
    );
  }
  const cats = d.offeredCategories.filter((c): c is GsOfferCategoryId =>
    (GS_OFFER_CATEGORY_IDS as readonly string[]).includes(c)
  );
  if (cats.length) {
    parts.push(`Offre : ${cats.map((c) => CAT_LABELS[c]).join(", ")}.`);
  }

  const svcs = d.additionalServices.filter((s): s is GsAdditionalServiceId =>
    (GS_ADDITIONAL_SERVICE_IDS as readonly string[]).includes(s)
  );
  if (svcs.length) {
    parts.push(`Services proposés : ${svcs.map((s) => SVC_LABELS[s]).join(", ")}.`);
  }

  const ho = d.handoffModes.filter((h): h is GsHandoffId =>
    (GS_HANDOFF_IDS as readonly string[]).includes(h)
  );
  if (ho.length) {
    parts.push(`Récupération / livraison : ${ho.map((h) => HANDOFF_LABELS[h]).join(", ")}.`);
  }

  if (d.rayonKm) {
    parts.push(
      `Zone d’intervention : ${d.rayonKm === "devis" ? "sur devis" : `${d.rayonKm} km`}.`
    );
  }
  if (d.villesDesservies.trim()) {
    parts.push(`Villes desservies : ${d.villesDesservies.trim()}.`);
  }

  const dispo: string[] = [];
  if (d.dispoSemaine) dispo.push("en semaine");
  if (d.dispoWeekend) dispo.push("week-end");
  if (d.dispoSoiree) dispo.push("soirée");
  if (dispo.length) parts.push(`Disponibilités générales : ${dispo.join(", ")}.`);
  if (d.horairesRetrait.trim()) {
    parts.push(`Horaires de retrait : ${d.horairesRetrait.trim()}.`);
  }

  parts.push(
    `Mode de réservation : ${d.bookingMode === "instant" ? "réservation instantanée (sous réserve des règles plateforme)" : "validation manuelle"}.`
  );
  if (d.cautionEnabled) {
    parts.push(
      d.cautionAmountDefault.trim()
        ? `Caution : oui — montant indicatif ${d.cautionAmountDefault.trim()} €.`
        : `Caution : oui.`
    );
  } else {
    parts.push(`Caution : non.`);
  }

  const lead =
    d.leadTime === "other" && d.leadTimeOther.trim()
      ? d.leadTimeOther.trim()
      : LEAD_LABELS[d.leadTime] ?? d.leadTime;
  parts.push(`Délai minimum avant réservation : ${lead}.`);
  parts.push(`Politique d’annulation : ${CANCEL_LABELS[d.cancellationPolicy] ?? d.cancellationPolicy}.`);
  parts.push(`Les paiements sont gérés de manière sécurisée via Stripe Connect.`);

  if (d.listingKind === "pack") {
    if (d.packUsage.trim()) parts.push(`Usage du pack : ${d.packUsage.trim()}.`);
    if (d.packContents.trim()) parts.push(`Contenu du pack : ${d.packContents.trim()}.`);
    if (d.packLivraison) parts.push(`Ce pack peut être livré.`);
    if (d.packInstallation) parts.push(`Installation possible pour ce pack.`);
  } else {
    if (d.quantite.trim()) parts.push(`Quantité : ${d.quantite.trim()}.`);
    if (d.etatMateriel.trim()) parts.push(`État du matériel : ${d.etatMateriel.trim()}.`);
  }

  if (d.description.trim()) {
    parts.push(d.description.trim());
  }

  return parts.join("\n\n");
}

export function buildJoursOuvertureFromDispo(d: GsWizardSyncInput): {
  joursOuverture: string[];
  horairesParJour: Record<string, { debut: string; fin: string }>;
} {
  let jours: string[] = [];
  if (d.dispoSemaine) jours.push(...JOURS_SEM);
  if (d.dispoWeekend) jours.push(...JOURS_WE);
  if (!jours.length) {
    jours = [...JOURS_SEM, ...JOURS_WE];
  }
  const h = d.dispoSoiree
    ? { debut: "18:00", fin: "23:00" }
    : { debut: "09:00", fin: "19:00" };
  const horairesParJour = Object.fromEntries(jours.map((j) => [j, { ...h }]));
  return { joursOuverture: jours, horairesParJour };
}

const PACK_USAGE_TO_EVENTS: Record<string, string[]> = {
  anniversaire: ["concert"],
  mariage: ["concert"],
  conference: ["conference"],
  dj_set: ["concert"],
  soiree_privee: ["concert"],
};

export function gsPackUsageToEvenements(packUsage: string): string[] {
  return PACK_USAGE_TO_EVENTS[packUsage] ?? ["concert", "conference"];
}

/** Payload aligné sur `createSalleFromOnboarding` / `mapOnboardingToSalle`. */
export function syncGsWizardToOnboardingPayload(d: GsWizardSyncInput): {
  onboardingData: OnboardingWizardData;
  cautionRequise: boolean;
} {
  const { joursOuverture, horairesParJour } = buildJoursOuvertureFromDispo(d);
  let features = gsCategoriesToFeatureIds(d.offeredCategories);
  const inclusions = new Set<string>(["location"]);
  if (d.additionalServices.includes("installation")) inclusions.add("sono");
  if (d.additionalServices.includes("technicien")) {
    features = [...new Set([...features, "technicien_inclus"])];
  }

  const evenementsAcceptes =
    d.listingKind === "pack"
      ? gsPackUsageToEvenements(d.packUsage)
      : ["concert", "conference"];

  const gearCategory =
    d.gearCategoryField.trim() ||
    gsPrimaryGearCategory(d.offeredCategories, d.listingKind);

  const fullDescription = buildGsOnboardingDescription(d);

  const onboardingData: OnboardingWizardData = {
    nom: d.nom.trim() || "Annonce matériel",
    ville: d.ville.trim(),
    capacite: d.capacite.trim() || "0",
    adresse: d.adresse.trim(),
    description: fullDescription,
    tarifParJour: d.tarifParJour,
    tarifMensuel: "",
    tarifHoraire: "",
    inclusions: Array.from(inclusions),
    placesParking: "",
    features,
    horairesParJour,
    joursOuverture,
    restrictionSonore: "none",
    evenementsAcceptes,
    listingKind: d.listingKind,
    gearCategory,
    gearBrand: d.gearBrand.trim(),
    gearModel: d.gearModel.trim(),
  };

  return { onboardingData, cautionRequise: d.cautionEnabled };
}
