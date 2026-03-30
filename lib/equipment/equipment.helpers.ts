import { EQUIPMENT_CATALOG, getEquipmentCategory } from "./equipment-catalog";
import type { EquipmentCategoryId } from "./equipment.types";
import { OTHER_KEY } from "./equipment.types";

export function normalizeWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Minuscules, sans accents, alphanum + espaces pour comparaison. */
export function normalizeString(s: string): string {
  return normalizeWhitespace(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "");
}

export function slugifyInternal(text: string): string {
  return normalizeString(text).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "item";
}

export function categoryIdToGearField(categoryId: EquipmentCategoryId): string {
  return getEquipmentCategory(categoryId)?.gearField ?? "son";
}

/** Rétrocompat brouillon / ancien `gearCategoryField`. */
export function gearFieldToCategoryId(field: string): EquipmentCategoryId {
  const m: Record<string, EquipmentCategoryId> = {
    son: "sono",
    lumiere: "lumiere",
    dj: "dj",
    video: "video",
    micros: "micros",
    accessoires: "accessoires",
  };
  return m[field] ?? "sono";
}

export function getSubcategories(categoryId: EquipmentCategoryId) {
  const cat = getEquipmentCategory(categoryId);
  if (!cat) return [];
  return Object.values(cat.subcategories).map((s) => ({ value: s.id, label: s.label }));
}

export function getBrands(categoryId: EquipmentCategoryId, subcategoryId: string) {
  const cat = getEquipmentCategory(categoryId);
  const sub = cat?.subcategories?.[subcategoryId];
  if (!sub) return [];
  return Object.keys(sub.brands).map((b) => ({
    value: b,
    label: b,
    popular: sub.popularBrands?.includes(b) ?? false,
  }));
}

export function getModels(categoryId: EquipmentCategoryId, subcategoryId: string, brand: string) {
  const cat = getEquipmentCategory(categoryId);
  const list = cat?.subcategories?.[subcategoryId]?.brands?.[brand] ?? [];
  return list.map((m) => ({ value: m, label: m }));
}

export function findMatchingBrand(categoryId: EquipmentCategoryId, subId: string, raw: string): string | null {
  const q = normalizeString(raw);
  if (!q) return null;
  const brands = getBrands(categoryId, subId);
  for (const br of brands) {
    if (normalizeString(br.label) === q || normalizeString(br.value) === q) return br.value;
  }
  return null;
}

export function findMatchingModel(
  categoryId: EquipmentCategoryId,
  subId: string,
  brandId: string,
  raw: string
): string | null {
  const q = normalizeString(raw);
  if (!q) return null;
  const models = getModels(categoryId, subId, brandId);
  for (const m of models) {
    if (normalizeString(m.label) === q || normalizeString(m.value) === q) return m.value;
  }
  return null;
}

export function canonicalizeBrand(categoryId: EquipmentCategoryId, subId: string, brandKey: string): string {
  if (brandKey === OTHER_KEY) return OTHER_KEY;
  const brands = getBrands(categoryId, subId);
  return brands.find((b) => b.value === brandKey)?.label ?? brandKey;
}

export function canonicalizeModel(
  categoryId: EquipmentCategoryId,
  subId: string,
  brandKey: string,
  modelKey: string
): string {
  if (modelKey === OTHER_KEY) return OTHER_KEY;
  const models = getModels(categoryId, subId, brandKey);
  return models.find((m) => m.value === modelKey)?.label ?? modelKey;
}

export function subcategoryLabel(categoryId: EquipmentCategoryId, subId: string): string {
  const cat = getEquipmentCategory(categoryId);
  return cat?.subcategories?.[subId]?.label ?? "";
}

export function buildSearchKeywords(parts: string[]): string[] {
  const set = new Set<string>();
  for (const p of parts) {
    const n = normalizeWhitespace(p);
    if (n.length < 2) continue;
    set.add(n);
    for (const w of n.split(/\s+/)) {
      if (w.length > 2) set.add(w);
    }
  }
  return Array.from(set);
}

export type EquipmentSuggestInput = {
  categoryId: EquipmentCategoryId;
  subcategoryId: string;
  brandDisplay: string;
  modelDisplay: string;
};

export function buildSuggestedEquipmentTitle(input: EquipmentSuggestInput): string {
  const sub = subcategoryLabel(input.categoryId, input.subcategoryId);
  const parts = [sub, input.brandDisplay, input.modelDisplay].map(normalizeWhitespace).filter(Boolean);
  return parts.join(" ").trim();
}

const DESC_BY_CAT: Partial<Record<EquipmentCategoryId, string>> = {
  dj: "adapté aux événements festifs et prestations DJ.",
  micros: "fiable et polyvalent pour prises de parole, animation et événementiel.",
  video: "adapté aux projections, captations et installations événementielles.",
  lumiere: "pour scènes, soirées et mises en lumière d’événements.",
  accessoires: "indispensable pour compléter votre installation pro en toute sécurité.",
};

export function buildSuggestedEquipmentDescription(title: string, categoryId: EquipmentCategoryId): string {
  const t = normalizeWhitespace(title);
  if (!t) return "";
  const tail =
    DESC_BY_CAT[categoryId] ??
    "idéale pour conférences, soirées, événements privés et prestations professionnelles.";
  return `${t}, ${tail}`;
}

export function resolveBrandDisplay(
  categoryId: EquipmentCategoryId,
  subId: string,
  brandKey: string,
  customBrand: string
): string {
  if (brandKey === OTHER_KEY) return normalizeWhitespace(customBrand);
  return canonicalizeBrand(categoryId, subId, brandKey);
}

export function resolveModelDisplay(
  categoryId: EquipmentCategoryId,
  subId: string,
  brandKey: string,
  modelKey: string,
  customModel: string
): string {
  if (modelKey === OTHER_KEY) return normalizeWhitespace(customModel);
  return canonicalizeModel(categoryId, subId, brandKey, modelKey);
}

/** Ligne structurée pour description longue / futurs index (migrable Supabase). */
export function buildEquipmentTaxonomyLine(
  categoryId: EquipmentCategoryId,
  subId: string,
  brandDisplay: string,
  modelDisplay: string,
  keywords: string[]
): string {
  const cat = getEquipmentCategory(categoryId)?.label ?? categoryId;
  const sub = subcategoryLabel(categoryId, subId);
  const core = [cat, sub, brandDisplay, modelDisplay].map(normalizeWhitespace).filter(Boolean).join(" · ");
  const kw = keywords.length ? ` — mots-clés : ${keywords.slice(0, 16).join(", ")}` : "";
  return `[Fiche matériel] ${core}${kw}`.trim();
}
