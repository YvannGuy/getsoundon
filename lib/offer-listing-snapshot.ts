/**
 * Figé sur `offers.listing_snapshot` à la création de l'offre (et réutilisé à l’acceptation via la même ligne).
 * Compatible contrats / Stripe / EDL : ne pas renommer les clés `v` et les sous-objets sans migration.
 */
export const OFFER_LISTING_SNAPSHOT_VERSION = 1 as const;

export type OfferListingSnapshotV1 = {
  v: typeof OFFER_LISTING_SNAPSHOT_VERSION;
  captured_at: string;
  listing: {
    salle_id: string;
    title: string;
    city: string;
    address?: string | null;
    listing_kind?: string | null;
    gear_category?: string | null;
    gear_brand?: string | null;
    gear_model?: string | null;
    feature_labels: string[];
  };
  rental_period: {
    date_debut: string;
    date_fin: string;
    event_type: string;
  };
  money: {
    amount_cents: number;
    deposit_cents: number;
    service_fee_cents: number;
    payment_mode: "full" | "split";
    upfront_cents: number;
    balance_cents: number;
    cancellation_policy: string;
  };
  logistics: {
    mode: "retrait" | "livraison" | "les_deux" | "a_convenir";
    notes: string;
    accessories_notes: string;
  };
};

export function parseOfferListingSnapshot(raw: unknown): OfferListingSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  return raw as OfferListingSnapshotV1;
}

export function fulfillmentModeLabel(
  mode: OfferListingSnapshotV1["logistics"]["mode"]
): string {
  switch (mode) {
    case "retrait":
      return "Retrait sur place";
    case "livraison":
      return "Livraison";
    case "les_deux":
      return "Retrait ou livraison (selon accord)";
    default:
      return "À convenir";
  }
}

const PDF_LINE_MAX = 92;

function wrapPdfLine(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxLen) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxLen ? `${w.slice(0, maxLen - 1)}…` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Lignes courtes pour pdf-lib (pas de retour à la ligne automatique). */
export function snapshotLinesForPdf(raw: unknown): string[] {
  const snap = parseOfferListingSnapshot(raw);
  if (!snap) return [];
  const chunks: string[] = [];
  const push = (s: string) => {
    for (const line of wrapPdfLine(s, PDF_LINE_MAX)) chunks.push(line);
  };
  push(`Annonce : ${snap.listing.title} — ${snap.listing.city}`);
  if (snap.listing.address?.trim()) push(`Adresse : ${snap.listing.address}`);
  const gear = [snap.listing.gear_category, snap.listing.gear_brand, snap.listing.gear_model]
    .filter(Boolean)
    .join(" · ");
  if (gear) push(`Matériel : ${gear}`);
  if (snap.listing.feature_labels.length) {
    push(`Accessoires / options : ${snap.listing.feature_labels.join(", ")}`);
  }
  if (snap.logistics.accessories_notes.trim()) {
    push(`Notes accessoires : ${snap.logistics.accessories_notes}`);
  }
  const d0 = new Date(snap.rental_period.date_debut).toLocaleDateString("fr-FR");
  const d1 = new Date(snap.rental_period.date_fin).toLocaleDateString("fr-FR");
  push(`Période figée : ${d0} – ${d1} (usage : ${snap.rental_period.event_type})`);
  const log = `${fulfillmentModeLabel(snap.logistics.mode)}${snap.logistics.notes.trim() ? ` — ${snap.logistics.notes}` : ""}`;
  push(`Retrait / livraison : ${log}`);
  push(
    `Montants : ${(snap.money.amount_cents / 100).toFixed(2)} € TTC · caution ${(snap.money.deposit_cents / 100).toFixed(2)} € · politique : ${snap.money.cancellation_policy}`
  );
  return chunks;
}
