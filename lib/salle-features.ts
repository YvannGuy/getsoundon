/** Caractéristiques (ERP, mobilier, etc.) pour formulaire d'édition annonce */
export const FEATURE_EDIT_LIST = [
  { id: "erp", label: "ERP conforme" },
  { id: "pmr", label: "Accès PMR" },
  { id: "scene", label: "Scène / estrade" },
  { id: "climatisation", label: "Climatisation" },
  { id: "chauffage", label: "Chauffage" },
  { id: "parking", label: "Parking" },
  { id: "mobilier", label: "Mobilier" },
  { id: "bureau", label: "Bureau" },
  { id: "son", label: "Sonorisation" },
  { id: "lumiere", label: "Lumière naturelle" },
] as const;

/** Mapping id → format stocké en base */
export const FEATURE_TO_SALLE: Record<string, { label: string; sublabel?: string; icon: string }> = {
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

/** Inclusions tarifaires pour formulaire d'édition */
export const INCLUSION_EDIT_LIST = [
  { id: "location", label: "Location de la salle" },
  { id: "mobilier", label: "Mobilier et équipements" },
  { id: "sono", label: "Système de sonorisation" },
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

export function getInclusionIdsFromSalle(pricingInclusions: string[] | undefined): string[] {
  if (!Array.isArray(pricingInclusions) || pricingInclusions.length === 0) return [];
  const labelToId = Object.fromEntries(
    INCLUSION_EDIT_LIST.map((f) => [f.label, f.id])
  );
  return pricingInclusions
    .map((label) => labelToId[label])
    .filter((id): id is NonNullable<typeof id> => id != null) as string[];
}
