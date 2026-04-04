import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeGsBookingCheckoutTotals,
  computeGsBookingPaymentSplit,
} from "@/lib/gs-booking-platform-fee";

export function gsOrderDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Caution au niveau commande (V1) : **maximum** des `deposit_amount_snapshot` des lignes —
 * une seule empreinte Stripe côté commande, pas la somme des cautions.
 */
export function computeOrderDepositMaxEur(
  lines: { deposit_amount_snapshot: number | string | null }[]
): number {
  if (lines.length === 0) return 0;
  let max = 0;
  for (const row of lines) {
    const v = Number(row.deposit_amount_snapshot ?? 0);
    if (Number.isFinite(v) && v > max) max = v;
  }
  return Math.round(max * 100) / 100;
}

type ItemRecalcRow = {
  id: string;
  price_per_day_snapshot: number | string;
  quantity: number | string;
  deposit_amount_snapshot: number | string | null;
};

/**
 * Recalcule jours, sous-totaux lignes, agrégats commande (location, 3 % service, checkout, 15 % / 85 %).
 * À appeler après toute mutation des lignes ou des dates (panier `draft` uniquement côté appelant).
 */
export async function recalcGsOrderDraft(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ error: string | null }> {
  const { data: order, error: oErr } = await supabase
    .from("gs_orders")
    .select("id, start_date, end_date, status")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) {
    return { error: oErr?.message ?? "Commande introuvable." };
  }

  const o = order as {
    start_date: string | null;
    end_date: string | null;
    status: string;
  };

  if (o.status !== "draft") {
    return { error: "Le panier n'est plus modifiable." };
  }

  const { data: items, error: iErr } = await supabase
    .from("gs_order_items")
    .select("id, price_per_day_snapshot, quantity, deposit_amount_snapshot")
    .eq("order_id", orderId);

  if (iErr) {
    return { error: iErr.message };
  }

  const rows = (items ?? []) as ItemRecalcRow[];

  if (rows.length === 0) {
    const { error: uErr } = await supabase
      .from("gs_orders")
      .update({
        provider_id: null,
        location_total_eur: 0,
        service_fee_eur: 0,
        checkout_total_eur: 0,
        platform_fee_eur: 0,
        provider_net_eur: 0,
        deposit_amount_eur: 0,
      })
      .eq("id", orderId)
      .eq("status", "draft");

    return { error: uErr?.message ?? null };
  }

  if (!o.start_date || !o.end_date) {
    return { error: "Dates de location manquantes." };
  }

  const days = gsOrderDaysInclusive(o.start_date, o.end_date);
  if (days <= 0) {
    return { error: "Période invalide." };
  }

  let locationTotal = 0;
  for (const line of rows) {
    const ppd = Number(line.price_per_day_snapshot);
    const qty = Math.max(1, Math.floor(Number(line.quantity)));
    if (!Number.isFinite(ppd) || ppd < 0) {
      return { error: "Prix journalier invalide sur une ligne." };
    }
    const lineTotal = Math.round(ppd * days * qty * 100) / 100;
    locationTotal = Math.round((locationTotal + lineTotal) * 100) / 100;
    const { error: lineUpdErr } = await supabase
      .from("gs_order_items")
      .update({ days_count: days, line_total_eur: lineTotal })
      .eq("id", line.id);
    if (lineUpdErr) {
      return { error: lineUpdErr.message };
    }
  }

  let checkout;
  let split;
  try {
    checkout = computeGsBookingCheckoutTotals(locationTotal);
    split = computeGsBookingPaymentSplit(locationTotal);
  } catch {
    return { error: "Totaux invalides." };
  }

  const depositEur = computeOrderDepositMaxEur(rows);

  const { error: uErr } = await supabase
    .from("gs_orders")
    .update({
      location_total_eur: checkout.grossEur,
      service_fee_eur: checkout.serviceFeeEur,
      checkout_total_eur: checkout.checkoutTotalEur,
      platform_fee_eur: split.platformFeeEur,
      provider_net_eur: split.providerNetEur,
      deposit_amount_eur: depositEur,
    })
    .eq("id", orderId)
    .eq("status", "draft");

  return { error: uErr?.message ?? null };
}
