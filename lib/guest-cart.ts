import type { DraftCartPreview } from "@/lib/gs-draft-cart-preview";
import { computeGsBookingCheckoutTotals } from "@/lib/gs-booking-platform-fee";
import { computeOrderDepositMaxEur, gsOrderDaysInclusive } from "@/lib/gs-orders-recalc";

export const GUEST_CART_STORAGE_KEY = "gs_guest_cart_v1";
export const GUEST_CART_CHANGED_EVENT = "gs-guest-cart-changed";

export type GuestCartLine = {
  key: string;
  listing_id: string;
  title_snapshot: string;
  price_per_day_snapshot: number;
  deposit_amount_snapshot: number;
  quantity: number;
  cover_url?: string | null;
};

export type GuestCart = {
  v: 1;
  provider_id: string;
  provider_label: string | null;
  start_date: string;
  end_date: string;
  lines: GuestCartLine[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function parseGuestCart(raw: unknown): GuestCart | null {
  if (!isRecord(raw) || raw.v !== 1) return null;
  if (typeof raw.provider_id !== "string" || !raw.provider_id) return null;
  if (typeof raw.start_date !== "string" || typeof raw.end_date !== "string") return null;
  const linesRaw = raw.lines;
  if (!Array.isArray(linesRaw)) return null;
  const lines: GuestCartLine[] = [];
  for (const row of linesRaw) {
    if (!isRecord(row)) continue;
    const key = typeof row.key === "string" ? row.key : "";
    const listing_id = typeof row.listing_id === "string" ? row.listing_id : "";
    const title_snapshot = typeof row.title_snapshot === "string" ? row.title_snapshot : "";
    const price = Number(row.price_per_day_snapshot);
    const dep = Number(row.deposit_amount_snapshot ?? 0);
    const qty = Math.floor(Number(row.quantity));
    if (!key || !listing_id || !title_snapshot || !Number.isFinite(price) || price < 0 || qty < 1) continue;
    lines.push({
      key,
      listing_id,
      title_snapshot,
      price_per_day_snapshot: price,
      deposit_amount_snapshot: Number.isFinite(dep) && dep >= 0 ? dep : 0,
      quantity: Math.min(99, qty),
      cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
    });
  }
  return {
    v: 1,
    provider_id: raw.provider_id,
    provider_label: typeof raw.provider_label === "string" ? raw.provider_label : null,
    start_date: raw.start_date,
    end_date: raw.end_date,
    lines,
  };
}

export function readGuestCartFromStorage(): GuestCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return null;
    return parseGuestCart(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeGuestCartToStorage(cart: GuestCart | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!cart || cart.lines.length === 0) {
      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
    }
    window.dispatchEvent(new Event(GUEST_CART_CHANGED_EVENT));
  } catch {
    /* quota / private mode */
  }
}

export function emitGuestCartChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GUEST_CART_CHANGED_EVENT));
}

export function computeGuestCartTotals(cart: GuestCart): {
  days: number;
  locationTotalEur: number;
  serviceFeeEur: number;
  checkoutTotalEur: number;
  depositMaxEur: number;
  lineTotals: { key: string; line_total_eur: number; days_count: number }[];
} | null {
  const days = gsOrderDaysInclusive(cart.start_date, cart.end_date);
  if (days <= 0 || cart.lines.length === 0) return null;

  let locationTotal = 0;
  const lineTotals: { key: string; line_total_eur: number; days_count: number }[] = [];
  const depositRows: { deposit_amount_snapshot: number }[] = [];

  for (const line of cart.lines) {
    const ppd = Number(line.price_per_day_snapshot);
    const qty = Math.max(1, Math.floor(line.quantity));
    const lineTotal = Math.round(ppd * days * qty * 100) / 100;
    locationTotal = Math.round((locationTotal + lineTotal) * 100) / 100;
    lineTotals.push({ key: line.key, line_total_eur: lineTotal, days_count: days });
    depositRows.push({ deposit_amount_snapshot: line.deposit_amount_snapshot });
  }

  let checkout;
  try {
    checkout = computeGsBookingCheckoutTotals(locationTotal);
  } catch {
    return null;
  }

  const depositMaxEur = computeOrderDepositMaxEur(depositRows);

  return {
    days,
    locationTotalEur: checkout.grossEur,
    serviceFeeEur: checkout.serviceFeeEur,
    checkoutTotalEur: checkout.checkoutTotalEur,
    depositMaxEur,
    lineTotals,
  };
}

export function guestCartToDraftPreview(cart: GuestCart): DraftCartPreview | null {
  const totals = computeGuestCartTotals(cart);
  if (!totals) {
    return {
      orderId: "guest",
      providerLabel: cart.provider_label,
      locationTotalEur: 0,
      lines: [],
      units: 0,
    };
  }

  const lineByKey = new Map(totals.lineTotals.map((t) => [t.key, t]));
  const lines: DraftCartPreview["lines"] = cart.lines.map((l) => {
    const t = lineByKey.get(l.key);
    return {
      id: l.key,
      listing_id: l.listing_id,
      title_snapshot: l.title_snapshot,
      quantity: l.quantity,
      line_total_eur: t?.line_total_eur ?? 0,
      cover_url: l.cover_url ?? null,
    };
  });

  let units = 0;
  for (const l of cart.lines) units += Math.max(0, Math.floor(l.quantity));

  return {
    orderId: "guest",
    providerLabel: cart.provider_label,
    locationTotalEur: totals.locationTotalEur,
    lines,
    units,
  };
}

export type GuestListingInput = {
  id: string;
  owner_id: string;
  title: string;
  price_per_day: number;
  deposit_amount?: number | null;
  cover_url?: string | null;
  owner_display_name?: string | null;
};

export function addLineToGuestCart(input: {
  listing: GuestListingInput;
  startDate: string;
  endDate: string;
  quantity: number;
}): { ok: true } | { ok: false; error: string; code?: "PROVIDER_MISMATCH" | "VALIDATION" } {
  const days = gsOrderDaysInclusive(input.startDate, input.endDate);
  if (days <= 0) {
    return { ok: false, error: "Période invalide.", code: "VALIDATION" };
  }

  const qty = Math.min(99, Math.max(1, Math.floor(Number(input.quantity))));
  const depositSnap = Math.max(0, Number(input.listing.deposit_amount ?? 0));
  const priceSnap = Number(input.listing.price_per_day);
  if (!Number.isFinite(priceSnap) || priceSnap < 0) {
    return { ok: false, error: "Prix de l’annonce invalide.", code: "VALIDATION" };
  }

  const existing = readGuestCartFromStorage();
  const providerLabel =
    input.listing.owner_display_name?.trim() ||
    existing?.provider_label ||
    "Prestataire";

  if (existing && existing.lines.length > 0) {
    if (existing.provider_id !== input.listing.owner_id) {
      return {
        ok: false,
        error:
          "Ton panier contient déjà du matériel d’un autre prestataire. Finalise cette commande ou vide le panier avant d’ajouter des articles d’ailleurs.",
        code: "PROVIDER_MISMATCH",
      };
    }
  }

  let next: GuestCart;
  if (!existing || existing.lines.length === 0) {
    next = {
      v: 1,
      provider_id: input.listing.owner_id,
      provider_label: providerLabel,
      start_date: input.startDate,
      end_date: input.endDate,
      lines: [
        {
          key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}`,
          listing_id: input.listing.id,
          title_snapshot: input.listing.title,
          price_per_day_snapshot: priceSnap,
          deposit_amount_snapshot: depositSnap,
          quantity: qty,
          cover_url: input.listing.cover_url ?? null,
        },
      ],
    };
  } else {
    const idx = existing.lines.findIndex((l) => l.listing_id === input.listing.id);
    const lines = [...existing.lines];
    if (idx >= 0) {
      const prev = lines[idx]!;
      lines[idx] = {
        ...prev,
        quantity: Math.min(99, prev.quantity + qty),
        title_snapshot: input.listing.title,
        price_per_day_snapshot: priceSnap,
        deposit_amount_snapshot: depositSnap,
        cover_url: input.listing.cover_url ?? prev.cover_url ?? null,
      };
    } else {
      lines.push({
        key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}`,
        listing_id: input.listing.id,
        title_snapshot: input.listing.title,
        price_per_day_snapshot: priceSnap,
        deposit_amount_snapshot: depositSnap,
        quantity: qty,
        cover_url: input.listing.cover_url ?? null,
      });
    }
    next = {
      ...existing,
      provider_label: existing.provider_label || providerLabel,
      start_date: input.startDate,
      end_date: input.endDate,
      lines,
    };
  }

  writeGuestCartToStorage(next);
  return { ok: true };
}

export function clearGuestCartStorage(): void {
  writeGuestCartToStorage(null);
}

export function updateGuestCartLineQuantity(key: string, quantity: number): void {
  const cart = readGuestCartFromStorage();
  if (!cart) return;
  const qty = Math.min(99, Math.max(1, Math.floor(quantity)));
  const lines = cart.lines.map((l) => (l.key === key ? { ...l, quantity: qty } : l));
  writeGuestCartToStorage({ ...cart, lines });
}

export function removeGuestCartLine(key: string): void {
  const cart = readGuestCartFromStorage();
  if (!cart) return;
  const lines = cart.lines.filter((l) => l.key !== key);
  writeGuestCartToStorage(lines.length === 0 ? null : { ...cart, lines });
}

export function updateGuestCartDates(startDate: string, endDate: string): { ok: true } | { ok: false; error: string } {
  const days = gsOrderDaysInclusive(startDate, endDate);
  if (days <= 0) return { ok: false, error: "Période invalide." };
  const cart = readGuestCartFromStorage();
  if (!cart || cart.lines.length === 0) return { ok: false, error: "Panier vide." };
  writeGuestCartToStorage({ ...cart, start_date: startDate, end_date: endDate });
  return { ok: true };
}
