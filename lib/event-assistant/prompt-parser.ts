import { EventType, ServiceNeed, IndoorOutdoor } from "./types";
import type { EventBrief } from "./types";
import { mergeField } from "./brief";

const EVENT_KEYWORDS: Array<{ words: RegExp; type: EventType }> = [
  { words: /\bconf(é|e)rence|séminaire|congr[eè]s/i, type: "conference" },
  { words: /\bcorporate|entreprise|afterwork|team\s?building/i, type: "corporate" },
  { words: /\banniversaire|birthday/i, type: "birthday" },
  { words: /\bsoir[ée]|party|fête privée/i, type: "private_party" },
  { words: /\bmariage|wedding/i, type: "wedding" },
  { words: /\bcocktail\b/i, type: "cocktail" },
  { words: /\bshowcase|live|concert/i, type: "showcase" },
  { words: /\bdj set|dj\b/i, type: "dj_set" },
  { words: /\bculte|messe|église|prière|gospel/i, type: "religious_service" },
  { words: /\blancement|product launch/i, type: "product_launch" },
  { words: /\bprojection|screening|cin[eé]ma/i, type: "screening" },
  { words: /\bplein air|outdoor|extérieur/i, type: "outdoor_event" },
];

const NEED_KEYWORDS: Array<{ words: RegExp; need: ServiceNeed }> = [
  { words: /\bsono|sonorisation|enceinte|haut.?parleur|sound\b/i, need: "sound" },
  { words: /\bdj\b|platine|controller|mix/i, need: "dj" },
  { words: /\blumi(è|e)re|light|par led|lyre/i, need: "lighting" },
  { words: /\bmicro|microphone|mic\b/i, need: "microphones" },
  { words: /\b(écran led|mur led|led wall|screen)\b/i, need: "led_screen" },
  { words: /\bvid[eé]o|projecteur|projection\b/i, need: "video" },
  { words: /\bav|audiovisuel\b/i, need: "audiovisual" },
  { words: /\blivraison\b|delivery/i, need: "delivery" },
  { words: /\binstallation|montage\b/i, need: "installation" },
  { words: /\btechnicien|r[eé]gie|ing[ée] son\b/i, need: "technician" },
  { words: /\bfull service|clé en main\b/i, need: "full_service" },
];

const CITY_REGEX = /\b(?:à|a|sur|dans|au|en)\s+([A-ZÉÈÎÏÂÀÔÛÙ][\w'’\-éèàùôûîïç]+(?:[-\s][A-ZÉÈÎÏÂÀÔÛÙ][\w'’\-éèàùôûîïç]+)*)/i;
// Plusieurs formats de date possibles
const DATE_PATTERNS = [
  /\b(?:le\s+)?(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i,
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
  /\b(\d{1,2}[\/\-\.]\d{1,2})/
];

function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}
const AUDIENCE_REGEX = /(\d{2,4})\s*(?:personnes|pers\.?|invités?|guests?)/i;
const BUDGET_REGEX = /\b(\d{2,5})\s*€?/i;

function detectEventType(text: string): EventType | undefined {
  for (const { words, type } of EVENT_KEYWORDS) {
    if (words.test(text)) return type;
  }
  return undefined;
}

function detectNeeds(text: string): ServiceNeed[] {
  const needs: ServiceNeed[] = [];
  for (const { words, need } of NEED_KEYWORDS) {
    if (words.test(text)) {
      needs.push(need);
    }
  }
  return needs;
}

function detectIndoorOutdoor(text: string): IndoorOutdoor | undefined {
  if (/\bext[eé]rieur|dehors|plein air|outdoor|jardin|terrasse\b/i.test(text)) {
    return "outdoor";
  }
  if (/\bint[eé]rieur|dedans|salle|h[oô]tel|appartement|bureau\b/i.test(text)) {
    return "indoor";
  }
  return undefined;
}

export type ParsedSignal = {
  eventType?: EventType;
  guestCount?: number;
  locationLabel?: string;
  indoorOutdoor?: IndoorOutdoor;
  serviceNeeds?: ServiceNeed[];
  eventDateRaw?: string;
  delivery?: boolean;
  installation?: boolean;
  technician?: boolean;
};

export function parseEventPrompt(raw: string): ParsedSignal {
  const text = raw.toLowerCase();

  const audienceMatch = raw.match(AUDIENCE_REGEX);
  const audienceSize = audienceMatch ? parseInt(audienceMatch[1], 10) : undefined;

  const cityMatch = raw.match(CITY_REGEX);
  const city = cityMatch ? cityMatch[1].trim() : undefined;

  const date = extractDate(raw);

  const eventType = detectEventType(text);
  const needs = detectNeeds(text);
  const indoorOutdoor = detectIndoorOutdoor(text);

  return {
    eventType,
    guestCount: audienceSize,
    locationLabel: city,
    indoorOutdoor,
    serviceNeeds: needs.length ? needs : undefined,
    eventDateRaw: date,
    delivery: needs.includes("delivery") ? true : undefined,
    installation: needs.includes("installation") ? true : undefined,
    technician: needs.includes("technician") ? true : undefined,
  };
}
