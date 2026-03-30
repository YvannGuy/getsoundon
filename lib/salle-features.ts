/**
 * Caractéristiques annonces : v1 wizard = matériel / pack ; édition = matériel + champs lieu historiques.
 * Les ids du wizard doivent exister dans FEATURE_TO_SALLE et FEATURE_EDIT_LIST pour l’édition propriétaire.
 */

/** Matériel / pack — affichage wizard + mapping JSON `features` */
export const FEATURE_GEAR_EDIT_LIST = [
  { id: "son_ligne", label: "Enceintes / retours / amplis" },
  { id: "caisson_basse", label: "Caisson de basses / sub" },
  { id: "table_mix", label: "Console de mixage / DJ" },
  { id: "micros", label: "Micros (filaire / sans fil)" },
  { id: "lumieres_led", label: "Éclairage / effets LED" },
  { id: "flight_case", label: "Flight-case / housse / protection transport" },
  { id: "connectique", label: "Câbles & connectique" },
  { id: "technicien_inclus", label: "Réglage / technicien inclus" },
] as const;

/** Lieu / annonces historiques — conservés pour l’édition et les lignes existantes */
export const FEATURE_LEGACY_EDIT_LIST = [
  { id: "erp", label: "ERP conforme" },
  { id: "pmr", label: "Accès PMR" },
  { id: "scene", label: "Scène / estrade" },
  { id: "climatisation", label: "Climatisation" },
  { id: "chauffage", label: "Chauffage" },
  { id: "parking", label: "Parking" },
  { id: "mobilier", label: "Mobilier" },
  { id: "bureau", label: "Bureau" },
  { id: "son", label: "Sonorisation (lieu)" },
  { id: "lumiere", label: "Lumière naturelle" },
] as const;

export const FEATURE_EDIT_LIST = [
  ...FEATURE_GEAR_EDIT_LIST,
  ...FEATURE_LEGACY_EDIT_LIST,
] as const;

/** Mapping id → format stocké en base */
export const FEATURE_TO_SALLE: Record<string, { label: string; sublabel?: string; icon: string }> = {
  son_ligne: {
    label: "Enceintes / retours / amplis",
    sublabel: "Sonorisation professionnelle",
    icon: "speaker",
  },
  caisson_basse: { label: "Caisson de basses / sub", icon: "speaker" },
  table_mix: { label: "Console de mixage / DJ", icon: "list" },
  micros: { label: "Micros (filaire / sans fil)", icon: "check" },
  lumieres_led: { label: "Éclairage / effets LED", icon: "check" },
  flight_case: { label: "Flight-case / housse / protection transport", icon: "check" },
  connectique: { label: "Câbles & connectique", icon: "check" },
  technicien_inclus: { label: "Réglage / technicien inclus", icon: "check" },
  erp: { label: "ERP conforme", icon: "check" },
  pmr: { label: "Accès PMR", sublabel: "Accessible aux personnes à mobilité réduite", icon: "wheelchair" },
  scene: { label: "Scène / estrade", icon: "list" },
  climatisation: { label: "Climatisation", icon: "check" },
  chauffage: { label: "Chauffage", icon: "check" },
  parking: { label: "Parking", sublabel: "places disponibles à proximité", icon: "parking" },
  mobilier: { label: "Mobilier", sublabel: "Chaises et tables modulables incluses", icon: "furniture" },
  bureau: { label: "Bureau", icon: "check" },
  son: { label: "Sonorisation", sublabel: "Système audio professionnel inclus", icon: "speaker" },
  lumiere: { label: "Lumière naturelle", icon: "check" },
};

/** Inclusions tarifaires — libellés orientés matériel / pack */
export const INCLUSION_EDIT_LIST = [
  { id: "location", label: "Location du matériel / pack" },
  { id: "mobilier", label: "Accessoires & périmètre inclus (pieds, housses…)" },
  { id: "sono", label: "Installation / ligne son incluse" },
] as const;

export const FEATURE_IDS = FEATURE_EDIT_LIST.map((f) => f.id);
export const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  FEATURE_EDIT_LIST.map((f) => [f.id, f.label])
);
export const INCLUSION_IDS = INCLUSION_EDIT_LIST.map((f) => f.id);
export const INCLUSION_LABELS: Record<string, string> = Object.fromEntries(
  INCLUSION_EDIT_LIST.map((f) => [f.id, f.label])
);

export function getFeatureIdsFromSalle(
  features: { label: string; sublabel?: string; icon: string }[] | undefined
): string[] {
  if (!Array.isArray(features) || features.length === 0) return [];
  const labelToId = Object.fromEntries(
    FEATURE_EDIT_LIST.map((f) => [f.label, f.id])
  );
  return features
    .map((f) => labelToId[f.label])
    .filter((id): id is NonNullable<typeof id> => id != null) as string[];
}

/** Libellés historiques (avant wording « matériel ») → id inclusion */
const INCLUSION_LEGACY_LABEL_TO_ID: Record<string, string> = {
  "Location de la salle": "location",
  "Mobilier et équipements": "mobilier",
  "Système de sonorisation": "sono",
};

export function getInclusionIdsFromSalle(pricingInclusions: string[] | undefined): string[] {
  if (!Array.isArray(pricingInclusions) || pricingInclusions.length === 0) return [];
  const labelToId = Object.fromEntries(
    INCLUSION_EDIT_LIST.map((f) => [f.label, f.id])
  );
  return pricingInclusions
    .map((label) => labelToId[label] ?? INCLUSION_LEGACY_LABEL_TO_ID[label])
    .filter((id): id is NonNullable<typeof id> => id != null) as string[];
}
