import { EventBrief, MatchingProvider, ProviderScoreBreakdown, UiRecommendedSetups } from "./types";

const WEIGHTS = {
  material: 30,
  delivery: 20,
  proximity: 10,
  installation: 10,
  technician: 10,
  date: 10,
  budget: 5,
  confidence: 5,
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  sound: ["sound", "sono", "audio"],
  dj: ["dj", "mix", "console"],
  lighting: ["lighting", "light", "lumiere"],
  microphones: ["microphone", "mic", "speech"],
  led_screen: ["led", "video", "screen"],
};

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

function neededCategories(brief: EventBrief): string[] {
  const base = new Set<string>(brief.serviceNeeds.value ?? []);
  base.delete("delivery");
  base.delete("installation");
  base.delete("technician");
  if (base.size === 0) base.add("sound");
  return Array.from(base);
}

function scoreMaterial(provider: MatchingProvider, categoriesNeeded: string[]): number {
  const caps = provider.capabilities.categories.map((c) => c.toLowerCase());
  const normalizedNeeds = categoriesNeeded.map((c) => c.toLowerCase());
  let covered = 0;

  normalizedNeeds.forEach((need) => {
    const aliases = CATEGORY_ALIASES[need] ?? [need];
    const hasMatch = aliases.some((a) => caps.some((c) => c.includes(a)));
    if (hasMatch) covered += 1;
  });

  if (normalizedNeeds.length === 0) return 50;
  return clamp((covered / normalizedNeeds.length) * 100);
}

function scoreServiceFlag(wanted: boolean | undefined, available: boolean | undefined): number {
  if (wanted === undefined) return 70;
  if (wanted && available) return 100;
  if (wanted && !available) return 20;
  if (!wanted && available) return 70;
  return 60;
}

function scoreProximity(eventCity?: string, providerLocation?: string): number {
  if (!eventCity || !providerLocation) return 60;
  const normEvent = eventCity.toLowerCase();
  const normProv = providerLocation.toLowerCase();
  if (normProv.includes(normEvent)) return 100;
  return 65;
}

function scoreBudget(band: string | undefined, price?: number): number {
  if (!band || !price) return 70;
  if (band === "low") return price <= 80 ? 100 : 40;
  if (band === "mid") return price <= 200 ? 100 : 60;
  return price <= 350 ? 80 : 60;
}

function scoreConfidence(rating?: number, ratingCount?: number): number {
  if (!rating || !ratingCount) return 70;
  const base = rating * 20; // 4.5 → 90
  const volumeBoost = ratingCount > 20 ? 5 : 0;
  return clamp(base + volumeBoost);
}

export function scoreProviderMatch(
  brief: EventBrief,
  setup: UiRecommendedSetups,
  provider: MatchingProvider
): ProviderScoreBreakdown {
  const needed = neededCategories(brief);
  const material = scoreMaterial(provider, needed);
  const delivery = scoreServiceFlag(brief.deliveryNeeded.value ?? undefined, provider.capabilities.services.delivery);
  const installation = scoreServiceFlag(brief.installationNeeded.value ?? undefined, provider.capabilities.services.installation);
  const technician = scoreServiceFlag(brief.technicianNeeded.value ?? undefined, provider.capabilities.services.technician);
  const proximity = scoreProximity(brief.location.value?.city, provider.location);
  const date = 80; // mock: on considère disponible
  const budget = scoreBudget(undefined, provider.pricePerDay);
  const confidence = scoreConfidence(provider.rating, provider.ratingCount);

  const total =
    (material * WEIGHTS.material +
      delivery * WEIGHTS.delivery +
      proximity * WEIGHTS.proximity +
      installation * WEIGHTS.installation +
      technician * WEIGHTS.technician +
      date * WEIGHTS.date +
      budget * WEIGHTS.budget +
      confidence * WEIGHTS.confidence) /
    Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

  return {
    total: Math.round(total),
    criteria: {
      material: Math.round(material),
      delivery: Math.round(delivery),
      proximity: Math.round(proximity),
      installation: Math.round(installation),
      technician: Math.round(technician),
      date,
      budget: Math.round(budget),
      confidence: Math.round(confidence),
    },
    rationale: setup.summary ? [setup.summary] : [],
  };
}

export function rankProviders(
  brief: EventBrief,
  setup: UiRecommendedSetups,
  providers: MatchingProvider[]
): Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }> {
  return providers
    .map((provider) => ({
      provider,
      score: scoreProviderMatch(brief, setup, provider),
    }))
    .sort((a, b) => b.score.total - a.score.total);
}
