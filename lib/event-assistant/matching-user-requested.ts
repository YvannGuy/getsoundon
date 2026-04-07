/**
 * Fusion des besoins matériel utilisateur (requestedItems) avec la reco
 * pour le matching inventaire / scoring — logique déterministe MVP.
 */

import type { EquipmentLineItem } from "./production-types";
import type { ProviderV2 } from "./matching-types-v2";
import { normalizeCategory } from "./matching-rules-v2";
import type { RequestedEquipmentType } from "./requested-equipment";

export const REQUESTED_TYPE_TO_MATCHING_CATEGORY: Record<RequestedEquipmentType, string> = {
  speaker: "sound_system",
  microphone: "microphones",
  subwoofer: "sound_system",
  mixer: "sound_system",
  lighting: "lighting",
  dj: "dj_setup",
  projector: "video",
  screen: "video",
  stage: "infrastructure",
};

export type UserRequestedEquipmentLine = {
  type: string;
  quantity: number;
};

/**
 * Agrège reco + demandes utilisateur par bucket normalisé (max entre somme reco et somme user par bucket).
 */
export function mergeRecoAndUserInventoryRequirements(
  reco: EquipmentLineItem[],
  userLines: UserRequestedEquipmentLine[] | undefined,
): Array<{ category: string; quantity: number }> {
  const byNorm = new Map<string, number>();

  for (const eq of reco) {
    const n = normalizeCategory(eq.category);
    byNorm.set(n, (byNorm.get(n) || 0) + Math.max(1, eq.quantity));
  }

  if (userLines?.length) {
    const userByNorm = new Map<string, number>();
    for (const u of userLines) {
      const mapped = REQUESTED_TYPE_TO_MATCHING_CATEGORY[u.type as RequestedEquipmentType];
      if (!mapped) continue;
      const n = normalizeCategory(mapped);
      userByNorm.set(n, (userByNorm.get(n) || 0) + Math.max(1, u.quantity));
    }
    for (const [n, uQty] of userByNorm) {
      const rQty = byNorm.get(n) || 0;
      byNorm.set(n, Math.max(rQty, uQty));
    }
  }

  return [...byNorm.entries()].map(([category, quantity]) => ({ category, quantity }));
}

/** Exigences uniquement issues des lignes utilisateur (pour bonus multi-catégories). */
export function userLinesToInventoryRequirements(
  userLines: UserRequestedEquipmentLine[] | undefined,
): Array<{ category: string; quantity: number }> {
  if (!userLines?.length) return [];
  const byNorm = new Map<string, number>();
  for (const u of userLines) {
    const mapped = REQUESTED_TYPE_TO_MATCHING_CATEGORY[u.type as RequestedEquipmentType];
    if (!mapped) continue;
    const n = normalizeCategory(mapped);
    byNorm.set(n, (byNorm.get(n) || 0) + Math.max(1, u.quantity));
  }
  return [...byNorm.entries()].map(([category, quantity]) => ({ category, quantity }));
}

const MAX_EXCLUSION_PENALTY = 22;

/**
 * Pénalité spécialisation si l’utilisateur a exclu un axe que le prestataire met en avant (catégories).
 */
export function specializationPenaltyForExcludedEquipment(
  provider: ProviderV2,
  excludedTypes: string[] | undefined,
): number {
  if (!excludedTypes?.length) return 0;
  const cats = new Set(provider.capabilities.categories.map((c) => c.toLowerCase()));
  let pen = 0;

  for (const ex of excludedTypes) {
    switch (ex) {
      case "dj":
        if (cats.has("dj")) pen += 14;
        break;
      case "microphone":
        if (cats.has("microphones")) pen += 10;
        break;
      case "lighting":
        if (cats.has("lighting")) pen += 10;
        break;
      case "speaker":
      case "subwoofer":
      case "mixer":
        if (cats.has("sound")) pen += 8;
        break;
      case "projector":
      case "screen":
        if (cats.has("video") || cats.has("led_screen")) pen += 8;
        break;
      default:
        break;
    }
  }

  return Math.min(pen, MAX_EXCLUSION_PENALTY);
}
