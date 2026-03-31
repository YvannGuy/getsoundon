import { EventType, ServiceNeed, IndoorOutdoor } from "./types";

const EVENT_KEYWORDS: Array<{ words: RegExp; type: EventType }> = [
  { words: /\bconf(é|e)rence|séminaire|congr[eè]s/i, type: "conference" },
  { words: /\bcorporate|entreprise|afterwork|team\s?building/i, type: "corporate" },
  { words: /\banniversaire|birthday/i, type: "birthday" },
  { words: /\bsoir[ée]e?\b|party|fête privée/i, type: "private_party" },
  { words: /\bmariage|wedding/i, type: "wedding" },
  { words: /\bcocktail\b/i, type: "cocktail" },
  { words: /\bshowcase|live|concert/i, type: "showcase" },
  { words: /\bdj set|dj\b/i, type: "dj_set" },
  { words: /\bculte|messe|église|prière|gospel/i, type: "religious_service" },
  { words: /\blancement|product launch/i, type: "product_launch" },
  { words: /\bprojection|screening|cin[eé]ma/i, type: "screening" },
  { words: /\bplein air|outdoor event/i, type: "outdoor_event" },
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

// Mots qui ne sont jamais des noms de villes
const CITY_BLOCKLIST = /^(une?|la|le|les|des|du|de|ce|cette|mon|ma|ton|ta|son|sa|ses|leur|leurs|l[ae]|salle|maison|appartement|int[eé]rieur|ext[eé]rieur|indoor|outdoor|bureau|studio|espace|lieu|endroit)$/i;

/**
 * Extrait le nom de ville depuis un texte en langue naturelle.
 * Gère : "à Paris", "dans Lyon", "dans la ville de Montreuil",
 *        "la ville est Bordeaux", "ville: Marseille", etc.
 *
 * Contrairement à une simple regex avec \b, cette fonction utilise
 * (?:^|[\s,;.]) pour gérer les prépositions accentuées ("à") qui ne
 * sont pas des word-chars ASCII et échouent avec \b.
 */
function extractCity(text: string): string | undefined {
  // "dans la ville de Paris", "dans le quartier de Belleville"
  let m = text.match(/dans\s+(?:la\s+ville|le\s+quartier)\s+d[e']\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\-]*)/i);
  if (m && !CITY_BLOCKLIST.test(m[1].trim())) return m[1].trim();

  // "la ville est Paris", "le lieu : Lyon", "ville = Marseille"
  m = text.match(/(?:la\s+ville|le\s+lieu|ville)\s*(?:est|[:=])\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\-]+)/i);
  if (m && !CITY_BLOCKLIST.test(m[1].trim())) return m[1].trim();

  // "à Paris", "sur Lyon", "dans Nantes", "au Havre", "en Bretagne"
  // On utilise (?:^|[\s,;.]) au lieu de \b car "à" est accentué et non-ASCII :
  // \b ne matche pas à la frontière espace/"à" (deux non-word chars).
  const prepPattern = /(?:^|[\s,;.!?])(?:à|sur|dans|au|en)\s+([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\-]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = prepPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (!CITY_BLOCKLIST.test(candidate)) return candidate;
  }

  return undefined;
}

// Noms de mois français avec variantes accentuées
const MONTHS = "janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre";

const DATE_PATTERNS: RegExp[] = [
  // "le 7 avril 2025" ou "7 avril 2025" (avec année)
  new RegExp(`\\b(?:le\\s+)?(\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})\\b`, "i"),
  // "le 7 avril" ou "7 avril" (sans année — cas très courant)
  new RegExp(`\\b(?:le\\s+)?(\\d{1,2}\\s+(?:${MONTHS}))\\b`, "i"),
  // Numérique "07/04/2024" ou "07-04-2024"
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/,
  // Numérique court "07/04"
  /\b(\d{1,2}[\/\-\.]\d{1,2})\b/,
  // "en avril", "en mai"
  new RegExp(`\\b(en\\s+(?:${MONTHS}))\\b`, "i"),
  // Expressions relatives
  /\b(ce\s+(?:week.?end|samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi))\b/i,
  /\b((?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+prochain)\b/i,
  /\b(dans\s+\d+\s+(?:jours?|semaines?|mois))\b/i,
  /\b(la\s+semaine\s+prochaine)\b/i,
  /\b(ce\s+mois[-\s]ci|le\s+mois\s+prochain)\b/i,
];

function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}

const AUDIENCE_REGEX = /(\d{2,4})\s*(?:personnes?|pers\.?|invités?|guests?)/i;

function detectEventType(text: string): EventType | undefined {
  for (const { words, type } of EVENT_KEYWORDS) {
    if (words.test(text)) return type;
  }
  return undefined;
}

function detectNeeds(text: string): ServiceNeed[] {
  const needs: ServiceNeed[] = [];
  for (const { words, need } of NEED_KEYWORDS) {
    if (words.test(text)) needs.push(need);
  }
  return needs;
}

function detectIndoorOutdoor(text: string): IndoorOutdoor | undefined {
  if (/\bext[eé]rieur|dehors|plein air|outdoor|jardin|terrasse\b/i.test(text)) return "outdoor";
  if (/\bint[eé]rieur|dedans|salle|h[oô]tel|appartement|bureau\b/i.test(text)) return "indoor";
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
  const guestCount = audienceMatch ? parseInt(audienceMatch[1], 10) : undefined;

  const locationLabel = extractCity(raw);
  const date = extractDate(raw);
  const eventType = detectEventType(text);
  const needs = detectNeeds(text);
  const indoorOutdoor = detectIndoorOutdoor(text);

  return {
    eventType,
    guestCount,
    locationLabel,
    indoorOutdoor,
    serviceNeeds: needs.length ? needs : undefined,
    eventDateRaw: date,
    delivery: needs.includes("delivery") ? true : undefined,
    installation: needs.includes("installation") ? true : undefined,
    technician: needs.includes("technician") ? true : undefined,
  };
}
