import { describe, it, expect } from "@jest/globals";
import { buildRecommendedSetupsAdaptive } from "../recommendation-bridge";
import { createMatchingEngineV2 } from "../matching-engine-v2";
import { ProviderV2, MatchingInputV2 } from "../matching-types-v2";
import { createMockEventBrief } from "./test-helpers";

/**
 * Cohérence métier : formats réels UiRecommendedSetups + moteur matching V2 (Jest active V2 via NODE_ENV=test).
 */
describe("Cohérence métier — recommandation UI + matching V2", () => {
  it("buildRecommendedSetupsAdaptive retourne 3 tiers avec items catégorisés", () => {
    const brief = createMockEventBrief({
      eventType: { value: "conference", confidence: 0.9, confirmationStatus: "confirmed" },
      guestCount: { value: 120, confidence: 0.9, confirmationStatus: "confirmed" },
      location: {
        value: { label: "Paris", city: "Paris" },
        confidence: 0.9,
        confirmationStatus: "confirmed",
      },
      indoorOutdoor: { value: "indoor", confidence: 0.9, confirmationStatus: "confirmed" },
      serviceNeeds: {
        value: ["sound", "microphones"],
        confidence: 0.9,
        confirmationStatus: "confirmed",
      },
    });

    const rec = buildRecommendedSetupsAdaptive(brief);
    expect(rec.tiers.length).toBe(3);
    const ids = rec.tiers.map((t) => t.id).sort();
    expect(ids).toEqual(["essential", "premium", "standard"].sort());

    for (const tier of rec.tiers) {
      expect(tier.items.length).toBeGreaterThan(0);
      const cats = tier.items.map((i) => i.category);
      expect(cats.some((c) => c === "sound" || c === "microphone")).toBe(true);
    }
  });

  it("matching V2 : exclusion zone + match Paris", () => {
    const engine = createMatchingEngineV2();
    const input: MatchingInputV2 = {
      eventType: "conference",
      guestCount: 100,
      location: { city: "Paris" },
      requiredEquipment: [
        {
          category: "sound_system",
          subcategory: "speakers",
          quantity: 2,
          label: "Son",
          description: "",
          priority: "essential",
          reasoning: "",
        },
      ],
      requiredServices: [],
      deliveryRequired: false,
      installationRequired: false,
    };

    const paris: ProviderV2 = {
      id: "p1",
      title: "Paris AV",
      location: "Paris",
      capabilities: {
        categories: ["sound"],
        services: { delivery: false, installation: false, technician: false },
        coverage: { zones: ["Paris"], maxDistance: 50 },
        inventory: [{ category: "sound", quantity: 10, qualityTier: "standard" }],
        specializations: [],
        equipment_quality: "standard",
      },
      pricing: { dailyRate: 200, deliveryFee: 0, setupFee: 0 },
      trust: { verified: true, responseTime: 24, completionRate: 90 },
      rating: 4.5,
      ratingCount: 10,
    };

    const lyon: ProviderV2 = {
      ...paris,
      id: "p2",
      title: "Lyon AV",
      location: "Lyon",
      capabilities: {
        ...paris.capabilities,
        coverage: { zones: ["Lyon"], maxDistance: 50 },
      },
    };

    const out = engine.findMatches(input, [paris, lyon]);
    expect(out.matches.some((m) => m.provider.id === "p1")).toBe(true);
    expect(out.matches.some((m) => m.provider.id === "p2")).toBe(false);
  });
});
