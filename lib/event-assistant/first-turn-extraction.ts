import { v4 as uuid } from "uuid";
import type { EventType, ServiceNeed, VenueType } from "./types";
import type { ExtractionLogEntry, NormalizedText } from "./v2-types";

const MONTHS =
  "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";

/**
 * Extraction déterministe pour le premier message (et suivants) : équipements,
 * dates sans année, heures, villes, intentions événement courtes.
 */
export class FirstTurnPatternExtractor {
  static extract(normalized: NormalizedText, messageId: string): ExtractionLogEntry[] {
    const out: ExtractionLogEntry[] = [];
    const { cleaned, original } = normalized;
    const src = cleaned.length >= original.trim().length * 0.5 ? cleaned : original.toLowerCase().trim();

    out.push(...this.extractEventPhrases(src, messageId));
    out.push(...this.extractDatesAndTimes(src, messageId));
    out.push(...this.extractLocations(src, messageId));
    out.push(...this.extractGuestCount(src, messageId));
    out.push(...this.extractEquipmentAndServices(src, messageId));
    out.push(...this.extractVenuePhrases(src, messageId));

    return out;
  }

  private static extractEventPhrases(src: string, messageId: string): ExtractionLogEntry[] {
    const phrases: Array<{ re: RegExp; type: EventType }> = [
      { re: /\bpour une conférence\b/, type: "conference" },
      { re: /\bpour un mariage\b/, type: "wedding" },
      { re: /\bconférence\b|\bséminaire\b/, type: "conference" },
      { re: /\bmariage\b|\bnoce\b/, type: "wedding" },
      { re: /\banniversaire\b/, type: "birthday" },
      { re: /\bcocktail\b/, type: "cocktail" },
      { re: /\bcorporate\b|\bentreprise\b/, type: "corporate" },
      { re: /\bsoirée dansante\b/, type: "private_party" },
      { re: /\bsoirée\b|\bfête\b/, type: "private_party" },
    ];
    const found: ExtractionLogEntry[] = [];
    for (const { re, type } of phrases) {
      if (re.test(src)) {
        found.push({
          id: uuid(),
          messageId,
          extractor: "first_turn_patterns",
          field: "eventType",
          rawValue: type,
          normalizedValue: type,
          confidence: 0.9,
          applied: false,
          createdAt: new Date().toISOString(),
        });
        break;
      }
    }
    return found;
  }

  private static extractDatesAndTimes(src: string, messageId: string): ExtractionLogEntry[] {
    const out: ExtractionLogEntry[] = [];

    const fullDate = src.match(
      new RegExp(`(?:le\\s+)?(\\d{1,2})\\s+(${MONTHS})\\s+(\\d{4})`, "i"),
    );
    if (fullDate) {
      out.push(
        this.dateEntry(messageId, `${fullDate[1]} ${fullDate[2]} ${fullDate[3]}`, 0.92),
      );
    }

    const dayMonth = new RegExp(
      `(?:le\\s+)?(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\s+)?(\\d{1,2})\\s+(${MONTHS})(?:\\s+(\\d{2,4}))?`,
      "i",
    );
    if (out.length === 0) {
      const dm = src.match(dayMonth);
      if (dm) {
        const raw = dm[3] ? `${dm[1]} ${dm[2]} ${dm[3]}` : `${dm[1]} ${dm[2]}`;
        out.push(this.dateEntry(messageId, raw, dm[3] ? 0.9 : 0.86));
      } else {
        const slash = src.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
        if (slash) {
          const raw = slash[3] ? `${slash[1]}/${slash[2]}/${slash[3]}` : `${slash[1]}/${slash[2]}`;
          out.push(this.dateEntry(messageId, raw, slash[3] ? 0.88 : 0.84));
        }
      }
    }

    const timeM = src.match(/\b(?:à|vers)\s*(\d{1,2})h(\d{2})?\b|\b(\d{1,2})h(\d{2})\b/);
    if (timeM && out.length > 0) {
      const t = timeM[1]
        ? `à ${timeM[1]}h${timeM[2] ?? ""}`
        : `à ${timeM[3]}h${timeM[4]}`;
      const last = out[out.length - 1];
      if (last.field === "eventDate" && typeof last.normalizedValue === "object" && last.normalizedValue) {
        const nv = last.normalizedValue as { raw: string; isoDate?: string; isApproximate?: boolean };
        last.rawValue = `${nv.raw} ${t}`;
        nv.raw = `${nv.raw} ${t}`.trim();
      }
    }

    return out;
  }

  private static dateEntry(messageId: string, raw: string, confidence: number): ExtractionLogEntry {
    return {
      id: uuid(),
      messageId,
      extractor: "first_turn_patterns",
      field: "eventDate",
      rawValue: raw,
      normalizedValue: { raw: raw.trim() },
      confidence,
      applied: false,
      createdAt: new Date().toISOString(),
    };
  }

  private static extractLocations(src: string, messageId: string): ExtractionLogEntry[] {
    const out: ExtractionLogEntry[] = [];

    const paris = src.match(/\bparis(?:\s*(\d{1,2})(?:e|ème|er)?)?\b/i);
    if (paris) {
      const district = paris[1];
      const label = district ? `Paris ${district}e` : "Paris";
      out.push({
        id: uuid(),
        messageId,
        extractor: "first_turn_patterns",
        field: "location",
        rawValue: label,
        normalizedValue: {
          label,
          city: "Paris",
          district: district ? `${district}e` : undefined,
        },
        confidence: 0.9,
        applied: false,
        createdAt: new Date().toISOString(),
      });
      return out;
    }

    const afterPrep = src.match(
      /(?:à|au|vers)\s+([a-zàâäéèêëïîôöùûüç]+(?:[-\s][a-zàâäéèêëïîôöùûüç]+){0,2})(?=\s+(?:le|la|les|pour|avec|un|une|en|,|$)|\s+\d)/i,
    );
    if (afterPrep?.[1]) {
      const city = afterPrep[1].trim();
      if (city.length >= 3 && !/^(une|des|les|son|du|de|la)\b/.test(city)) {
        out.push({
          id: uuid(),
          messageId,
          extractor: "first_turn_patterns",
          field: "location",
          rawValue: city,
          normalizedValue: { label: city, city },
          confidence: 0.86,
          applied: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return out;
  }

  private static extractGuestCount(src: string, messageId: string): ExtractionLogEntry[] {
    const m = src.match(/(\d+)\s*(?:personnes?|invités?|invité|participants?|pers\.?|pax)\b/);
    if (!m) return [];
    const n = parseInt(m[1], 10);
    if (n <= 0 || n > 50000) return [];
    return [
      {
        id: uuid(),
        messageId,
        extractor: "first_turn_patterns",
        field: "guestCount",
        rawValue: n,
        normalizedValue: n,
        confidence: 0.92,
        applied: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private static extractEquipmentAndServices(src: string, messageId: string): ExtractionLogEntry[] {
    const needs = new Set<ServiceNeed>();
    const constraintBits: string[] = [];

    const add = (n: ServiceNeed) => needs.add(n);

    if (/\benceintes?\b|\bcolonnes?\b|\bcaissons?\b|\bsono\b|\bsonorisation\b|\bpack\s+son\b/i.test(src)) {
      add("sound");
    }
    if (/\bmicros?\b|\bmicrophones?\b|\bhf\b|\bsans[\s-]fil\b/i.test(src)) {
      add("microphones");
    }
    if (/\bdj\b|\bdisc[\s-]?jockey\b|\bplatines?\b/i.test(src)) {
      add("dj");
    }
    if (/\bled\b|\blumières?\b|\béclairage\b|\bambiance\s+lumi/i.test(src)) {
      add("lighting");
    }
    if (/\bécrans?\b|\bvidéo\b|\bprojection\b/i.test(src)) {
      add("led_screen");
    }
    if (/\bson\b/i.test(src) && !needs.has("sound")) {
      add("sound");
    }

    const eqQty = src.match(/(\d+)\s*(enceintes?|micros?|colonnes?)\b/i);
    if (eqQty) {
      constraintBits.push(`${eqQty[1]}× ${eqQty[2]}`);
    }

    const out: ExtractionLogEntry[] = [];
    if (needs.size > 0) {
      const arr = [...needs];
      out.push({
        id: uuid(),
        messageId,
        extractor: "first_turn_patterns",
        field: "serviceNeeds",
        rawValue: arr,
        normalizedValue: arr,
        confidence: 0.88,
        applied: false,
        createdAt: new Date().toISOString(),
      });
    }
    if (constraintBits.length > 0) {
      out.push({
        id: uuid(),
        messageId,
        extractor: "first_turn_patterns",
        field: "constraints",
        rawValue: constraintBits,
        normalizedValue: constraintBits,
        confidence: 0.82,
        applied: false,
        createdAt: new Date().toISOString(),
      });
    }

    return out;
  }

  private static extractVenuePhrases(src: string, messageId: string): ExtractionLogEntry[] {
    const ordered: Array<{ p: string; v: VenueType }> = [
      { p: "salle des fêtes", v: "event_hall" },
      { p: "salle des fetes", v: "event_hall" },
      { p: "salle municipale", v: "event_hall" },
      { p: "salle polyvalente", v: "event_hall" },
      { p: "hôtel", v: "hotel" },
      { p: "hotel", v: "hotel" },
      { p: "méridien", v: "hotel" },
      { p: "meridien", v: "hotel" },
    ];
    for (const { p, v } of ordered) {
      if (src.includes(p)) {
        return [
          {
            id: uuid(),
            messageId,
            extractor: "first_turn_patterns",
            field: "venueType",
            rawValue: p,
            normalizedValue: v,
            confidence: 0.85,
            applied: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: uuid(),
            messageId,
            extractor: "first_turn_patterns",
            field: "indoorOutdoor",
            rawValue: "indoor",
            normalizedValue: "indoor",
            confidence: 0.8,
            applied: false,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    }
    return [];
  }
}
