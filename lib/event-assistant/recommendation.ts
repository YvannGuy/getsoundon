import { EventBrief, UiEquipmentRequirement, UiRecommendedSetups, UiSetupTier } from "./types";

function speakersByAudience(audience?: number): number {
  if (!audience) return 2;
  if (audience <= 80) return 2;
  if (audience <= 200) return 4;
  if (audience <= 600) return 6;
  return 8;
}

function baseSoundPack(audience?: number): UiEquipmentRequirement[] {
  const qty = speakersByAudience(audience);
  return [
    { category: "sound", subcategory: "speakers", quantity: qty, label: `${qty} enceintes actives`, notes: "Son principal" },
    { category: "sound", subcategory: "mixer", quantity: 1, label: "Console de mixage", notes: "Entrées micros / musique" },
  ];
}

function microphonePack(needs: Set<string>, eventType?: string, audience?: number): UiEquipmentRequirement[] {
  if (needs.has("microphones") || eventType === "conference") {
    const count = audience && audience > 150 ? 3 : 2;
    return [
      { category: "microphone", subcategory: "wireless", quantity: count, label: `${count} micros sans fil`, notes: "Discours / Q&A" },
    ];
  }
  return [];
}

function djPack(needs: Set<string>, eventType?: string): UiEquipmentRequirement[] {
  if (needs.has("dj") || eventType === "dj_set" || eventType === "birthday" || eventType === "private_party") {
    return [
      { category: "dj", subcategory: "controller", quantity: 1, label: "Contrôleur / platines DJ", notes: "Mix DJ" },
      { category: "dj", subcategory: "monitor", quantity: 2, label: "Retours DJ", notes: "Confort DJ" },
    ];
  }
  return [];
}

function lightingPack(needs: Set<string>, eventType?: string): UiEquipmentRequirement[] {
  if (needs.has("lighting") || eventType === "showcase" || eventType === "dj_set" || eventType === "private_party") {
    return [
      { category: "lighting", subcategory: "wash", quantity: 4, label: "Projecteurs LED / wash", notes: "Ambiance salle / scène" },
      { category: "lighting", subcategory: "effects", quantity: 2, label: "Effets / lyres légères", notes: "Dynamique" },
    ];
  }
  return [];
}

function ledPack(needs: Set<string>, eventType?: string): UiEquipmentRequirement[] {
  if (needs.has("led_screen") || eventType === "product_launch" || needs.has("video")) {
    return [
      { category: "video", subcategory: "led_wall", quantity: 1, label: "Écran LED modulable", notes: "Scène ou fond de salle" },
    ];
  }
  return [];
}

function buildTier(brief: EventBrief, id: UiSetupTier["id"]): UiSetupTier {
  const needs = new Set(brief.serviceNeeds.value ?? []);
  const base = baseSoundPack(brief.guestCount.value ?? undefined);
  const mics = microphonePack(needs, brief.eventType.value ?? undefined, brief.guestCount.value ?? undefined);
  const dj = djPack(needs, brief.eventType.value ?? undefined);
  const lights = lightingPack(needs, brief.eventType.value ?? undefined);
  const led = ledPack(needs, brief.eventType.value ?? undefined);

  const services: string[] = [];
  if (brief.deliveryNeeded.value !== false) services.push("Livraison");
  if (brief.installationNeeded.value !== false) services.push("Installation");
  if (brief.technicianNeeded.value) services.push("Technicien sur place");

  const multiplier = id === "essential" ? 1 : id === "standard" ? 1.2 : 1.5;

  const scaleQuantity = (reqs: UiEquipmentRequirement[]): UiEquipmentRequirement[] =>
    reqs.map((r) => ({
      ...r,
      quantity: r.quantity ? Math.max(1, Math.round(r.quantity * multiplier)) : r.quantity,
    }));

  return {
    id,
    title: id === "essential" ? "Essentiel" : id === "standard" ? "Standard" : "Premium",
    items: scaleQuantity([...base, ...mics, ...dj, ...lights, ...led]),
    services,
    rationale:
      id === "essential"
        ? "Couverture de base pour un rendu clair."
        : id === "standard"
          ? "Confort supérieur : plus de pression sonore et de lumière."
          : "Réserve et impact maximum pour un rendu premium.",
  };
}

export function buildRecommendedSetups(brief: EventBrief): UiRecommendedSetups {
  const tiers: UiSetupTier[] = ["essential", "standard", "premium"].map((id) =>
    buildTier(brief, id as UiSetupTier["id"])
  );

  const summaryParts = [
    brief.eventType.value && brief.eventType.value !== "unknown" ? `Type: ${brief.eventType.value}` : null,
    brief.guestCount.value ? `${brief.guestCount.value} personnes` : null,
    brief.location.value?.label ? `Lieu: ${brief.location.value.label}` : null,
    brief.eventDate.value?.raw ? `Date: ${brief.eventDate.value.raw}` : null,
  ].filter(Boolean);

  return {
    tiers,
    summary: summaryParts.join(" · "),
  };
}
