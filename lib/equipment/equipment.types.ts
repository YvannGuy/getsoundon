/**
 * Taxonomie matériel onboarding — extensible (ex. prestation / service plus tard).
 * Les ids sont stables pour futures migrations Supabase / filtres marketplace.
 */

export const LISTING_TYPE_IDS = ["material", "pack", "service"] as const;
export type ListingTypeId = (typeof LISTING_TYPE_IDS)[number];

/** Aligné flow actuel : equipment | pack ; service réservé UX future. */
export function listingTypeIdToKind(id: ListingTypeId): "equipment" | "pack" {
  if (id === "pack") return "pack";
  return "equipment";
}

export function listingKindToTypeId(kind: "equipment" | "pack"): ListingTypeId {
  return kind === "pack" ? "pack" : "material";
}

export const EQUIPMENT_CATEGORY_IDS = [
  "sono",
  "lumiere",
  "dj",
  "video",
  "micros",
  "accessoires",
] as const;
export type EquipmentCategoryId = (typeof EQUIPMENT_CATEGORY_IDS)[number];

export const OTHER_KEY = "other" as const;

export type EquipmentSubcategory = { id: string; label: string };

export type EquipmentModel = { id: string; label: string; popular?: boolean };

export type EquipmentBrand = {
  id: string;
  label: string;
  popular?: boolean;
  models: EquipmentModel[];
};

export type EquipmentCategory = {
  id: EquipmentCategoryId;
  label: string;
  /** Valeur `gear_category` / `gearCategoryField` côté API existante */
  gearField: string;
  subcategories: EquipmentSubcategory[];
  brands: EquipmentBrand[];
};

export type EquipmentIdentityState = {
  eqCategoryId: EquipmentCategoryId | "";
  eqSubcategoryId: string;
  eqBrandKey: string;
  eqModelKey: string;
  eqCustomBrand: string;
  eqCustomModel: string;
};

/** Sous-ensemble wizard pour éviter les imports circulaires avec le formulaire. */
export type WizardEquipmentFields = EquipmentIdentityState & {
  gearCategoryField: string;
  gearBrand: string;
  gearModel: string;
};
