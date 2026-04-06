/**
 * Besoins matériel structurés (quantités) pour le moteur assistant.
 * S'appuie sur extractEquipmentRequests (equipment-extractors) puis normalise en types métier stables.
 */

import type { ServiceNeed } from "./types";
import type { ExplicitEquipmentRequest, EquipmentCategory, NumericInterpretation } from "./nlp-types";
import { extractEquipmentRequests } from "./equipment-extractors";

// ============================================================================
// MODÈLE MÉTIER PUBLIC (stable API / persistance JSON)
// ============================================================================

export type RequestedEquipmentType =
  | "speaker"
  | "microphone"
  | "subwoofer"
  | "mixer"
  | "lighting"
  | "dj"
  | "projector"
  | "screen"
  | "stage";

export type RequestedEquipmentItem = {
  type: RequestedEquipmentType;
  quantity: number;
  source: "explicit" | "implicit";
};

// ============================================================================
// NÉGATIONS LÉGÈRES (déterministes)
// ============================================================================

const NEGATION_RULES: Array<{ re: RegExp; type: RequestedEquipmentType }> = [
  { re: /\bpas\s+de\s+dj\b|\bpas\s+besoin\s+de\s+dj\b|\bsans\s+dj\b|\baucun\s+dj\b/i, type: "dj" },
  { re: /\bsans\s+micros?\b|\bpas\s+de\s+micros?\b|\baucun\s+micro\b/i, type: "microphone" },
  { re: /\bsans\s+enceintes?\b|\bsans\s+sono\b|\bpas\s+d['\u2019]?enceintes?\b/i, type: "speaker" },
  { re: /\bsans\s+caisson\b|\bsans\s+sub\b/i, type: "subwoofer" },
  { re: /\bsans\s+lumi/i, type: "lighting" },
  { re: /\bsans\s+vidéoprojecteur\b|\bsans\s+projecteur\b/i, type: "projector" },
  { re: /\bsans\s+écran\b/i, type: "screen" },
];

const STAGE_HINT = /\bscène\b|\bscene\b|\bestrade\b|\bpraticables?\b/i;

function quantityFromNumeric(n?: NumericInterpretation): { qty: number; implicit: boolean } {
  if (!n) return { qty: 1, implicit: true };
  if (n.kind === "exact") return { qty: Math.max(1, n.value), implicit: false };
  if (n.kind === "approx") return { qty: Math.max(1, Math.round(n.value)), implicit: false };
  if (n.kind === "range")
    return { qty: Math.max(1, Math.round((n.min + n.max) / 2)), implicit: false };
  return { qty: 1, implicit: true };
}

/**
 * Convertit une demande NLP existante vers un item métier (1 ligne par catégorie logique).
 */
export function explicitRequestToRequestedItem(req: ExplicitEquipmentRequest): RequestedEquipmentItem | null {
  const { qty, implicit } = quantityFromNumeric(req.quantity);

  switch (req.category) {
    case "speakers":
      if (req.subcategory === "subwoofers") {
        return { type: "subwoofer", quantity: qty, source: implicit ? "implicit" : "explicit" };
      }
      return { type: "speaker", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "microphones":
      return { type: "microphone", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "mixing":
      return { type: "mixer", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "lighting":
      return { type: "lighting", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "dj_equipment":
      return { type: "dj", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "video":
      return { type: "projector", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "screens":
      return { type: "screen", quantity: qty, source: implicit ? "implicit" : "explicit" };
    case "rigging":
      return { type: "stage", quantity: qty, source: implicit ? "implicit" : "explicit" };
    default:
      return null;
  }
}

/** Regroupe les lignes du même type dans une même phrase (somme des quantités). */
export function consolidateRequestedItemsForUtterance(items: RequestedEquipmentItem[]): RequestedEquipmentItem[] {
  const map = new Map<RequestedEquipmentType, { qty: number; source: "explicit" | "implicit" }>();
  for (const it of items) {
    const cur = map.get(it.type);
    if (!cur) {
      map.set(it.type, { qty: it.quantity, source: it.source });
    } else {
      map.set(it.type, {
        qty: cur.qty + it.quantity,
        source: it.source === "explicit" || cur.source === "explicit" ? "explicit" : "implicit",
      });
    }
  }
  return [...map.entries()].map(([type, v]) => ({
    type,
    quantity: Math.max(1, v.qty),
    source: v.source,
  }));
}

export function detectExcludedEquipmentTypes(text: string): RequestedEquipmentType[] {
  const t = text.toLowerCase();
  const out = new Set<RequestedEquipmentType>();
  for (const { re, type } of NEGATION_RULES) {
    if (re.test(t)) out.add(type);
  }
  return [...out];
}

/** Extraits structurés + négations pour un tour utilisateur. */
export function syncRequestedItemsFromUtterance(text: string): {
  items: RequestedEquipmentItem[];
  excluded: RequestedEquipmentType[];
} {
  const excluded = detectExcludedEquipmentTypes(text);
  const explicitReqs = extractEquipmentRequests(text);
  const items: RequestedEquipmentItem[] = [];

  for (const req of explicitReqs) {
    const it = explicitRequestToRequestedItem(req);
    if (it && !excluded.includes(it.type)) items.push(it);
  }

  if (STAGE_HINT.test(text) && !excluded.includes("stage")) {
    items.push({ type: "stage", quantity: 1, source: "implicit" });
  }

  return {
    items: consolidateRequestedItemsForUtterance(items),
    excluded,
  };
}

/** Fusion multi-tours : cumul des quantités par type ; exclusions cumulatives. */
export function mergeRequestedEquipmentState(
  prevItems: RequestedEquipmentItem[],
  prevExcluded: RequestedEquipmentType[],
  utteranceText: string,
): { requestedItems: RequestedEquipmentItem[]; excludedEquipmentTypes: RequestedEquipmentType[] } {
  const { items: turnItems, excluded: turnExcluded } = syncRequestedItemsFromUtterance(utteranceText);
  const excluded = [...new Set([...prevExcluded, ...turnExcluded])];

  const map = new Map<RequestedEquipmentType, { qty: number; source: "explicit" | "implicit" }>();
  for (const it of prevItems) {
    if (excluded.includes(it.type)) continue;
    map.set(it.type, { qty: it.quantity, source: it.source });
  }
  for (const it of turnItems) {
    if (excluded.includes(it.type)) continue;
    const cur = map.get(it.type);
    if (!cur) map.set(it.type, { qty: it.quantity, source: it.source });
    else
      map.set(it.type, {
        qty: cur.qty + it.quantity,
        source: it.source === "explicit" || cur.source === "explicit" ? "explicit" : "implicit",
      });
  }

  const requestedItems = [...map.entries()].map(([type, v]) => ({
    type,
    quantity: Math.max(1, v.qty),
    source: v.source,
  }));

  return { requestedItems, excludedEquipmentTypes: excluded };
}

const SERVICE_NEED_BY_TYPE: Partial<Record<RequestedEquipmentType, ServiceNeed>> = {
  speaker: "sound",
  subwoofer: "sound",
  microphone: "microphones",
  lighting: "lighting",
  dj: "dj",
  projector: "video",
  screen: "led_screen",
};

/** Retire les serviceNeeds en conflit avec les exclusions explicites. */
export function filterServiceNeedsForExclusions(
  needs: ServiceNeed[] | undefined,
  excluded: RequestedEquipmentType[],
): ServiceNeed[] | undefined {
  if (!needs?.length) return needs;
  const drop = new Set(
    excluded.flatMap((t) => (SERVICE_NEED_BY_TYPE[t] ? [SERVICE_NEED_BY_TYPE[t]!] : [])),
  );
  return needs.filter((n) => !drop.has(n));
}

/** Items → format attendu par le moteur de recommandation V2. */
export function requestedItemsToExplicitRequests(
  items: RequestedEquipmentItem[],
  excluded: RequestedEquipmentType[],
): ExplicitEquipmentRequest[] {
  const ex = new Set(excluded);
  const q = (n: number): NumericInterpretation => ({ kind: "exact", value: Math.max(1, n) });

  const out: ExplicitEquipmentRequest[] = [];
  for (const it of items) {
    if (ex.has(it.type)) continue;
    switch (it.type) {
      case "speaker":
        out.push({ category: "speakers" as EquipmentCategory, quantity: q(it.quantity), qualifiers: [] });
        break;
      case "subwoofer":
        out.push({
          category: "speakers",
          subcategory: "subwoofers",
          quantity: q(it.quantity),
          qualifiers: [],
        });
        break;
      case "microphone":
        out.push({ category: "microphones", quantity: q(it.quantity), qualifiers: [] });
        break;
      case "mixer":
        out.push({ category: "mixing", quantity: q(it.quantity), qualifiers: [] });
        break;
      case "lighting":
        out.push({ category: "lighting", quantity: q(it.quantity), qualifiers: [] });
        break;
      case "dj":
        out.push({ category: "dj_equipment", quantity: q(it.quantity), qualifiers: [] });
        break;
      case "projector":
        out.push({ category: "video", quantity: q(it.quantity), qualifiers: [] });
        break;
      case "screen":
        out.push({ category: "screens", quantity: q(it.quantity), qualifiers: [] });
        break;
      case "stage":
        out.push({ category: "rigging", quantity: q(it.quantity), qualifiers: [] });
        break;
      default:
        break;
    }
  }
  return out;
}

export function formatRequestedItemsForDisplay(items: RequestedEquipmentItem[]): string {
  const labels: Record<RequestedEquipmentType, string> = {
    speaker: "enceinte(s)",
    subwoofer: "caisson(s)",
    microphone: "micro(s)",
    mixer: "console / table de mixage",
    lighting: "lumière",
    dj: "DJ / platines",
    projector: "vidéoprojecteur",
    screen: "écran",
    stage: "scène / structure",
  };
  return items.map((i) => `${i.quantity}× ${labels[i.type]}`).join(", ");
}
