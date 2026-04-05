"use server";

import { createClient } from "@/lib/supabase/server";
import { parseGuestCart } from "@/lib/guest-cart";
import { createAdminClient } from "@/lib/supabase/admin";
import { gsOrderDaysInclusive, recalcGsOrderDraft } from "@/lib/gs-orders-recalc";

export type GsOrderCartResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "PROVIDER_MISMATCH" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" };

async function requireCustomerUser(): Promise<
  { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> } | { ok: false; error: GsOrderCartResult<never> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: { ok: false, error: "Connexion requise.", code: "FORBIDDEN" } };
  }

  const { data: customerProfile } = await supabase
    .from("gs_users_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (customerProfile as { role?: string } | null)?.role;
  if (role !== "customer" && role !== "admin") {
    return { ok: false, error: { ok: false, error: "Réservé aux comptes client.", code: "FORBIDDEN" } };
  }

  return { ok: true, userId: user.id, supabase };
}

async function getOrCreateDraftOrderId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string
): Promise<{ orderId: string; error: string | null }> {
  const { data: existing } = await supabase
    .from("gs_orders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "draft")
    .maybeSingle();

  const eid = (existing as { id?: string } | null)?.id;
  if (eid) return { orderId: eid, error: null };

  const { data: inserted, error } = await supabase
    .from("gs_orders")
    .insert({ customer_id: customerId, status: "draft" })
    .select("id")
    .single();

  if (error || !inserted) {
    const { data: again } = await supabase
      .from("gs_orders")
      .select("id")
      .eq("customer_id", customerId)
      .eq("status", "draft")
      .maybeSingle();
    const aid = (again as { id?: string } | null)?.id;
    if (aid) return { orderId: aid, error: null };
    return { orderId: "", error: error?.message ?? "Impossible de créer le panier." };
  }

  return { orderId: (inserted as { id: string }).id, error: null };
}

export async function addToGsCartAction(input: {
  listingId: string;
  startDate: string;
  endDate: string;
  quantity: number;
}): Promise<GsOrderCartResult<{ orderId: string }>> {
  const auth = await requireCustomerUser();
  if (!auth.ok) return auth.error;

  const { userId, supabase } = auth;
  const qty = Math.min(99, Math.max(1, Math.floor(Number(input.quantity))));

  const days = gsOrderDaysInclusive(input.startDate, input.endDate);
  if (days <= 0) {
    return { ok: false, error: "Période invalide.", code: "VALIDATION" };
  }

  const { data: listing, error: lErr } = await supabase
    .from("gs_listings")
    .select("id, owner_id, title, price_per_day, is_active, deposit_amount")
    .eq("id", input.listingId)
    .maybeSingle();

  if (lErr || !listing) {
    return { ok: false, error: "Annonce introuvable.", code: "NOT_FOUND" };
  }

  const L = listing as {
    owner_id: string;
    title: string;
    price_per_day: number;
    is_active?: boolean | null;
    deposit_amount?: number | string | null;
  };

  if (L.is_active === false) {
    return { ok: false, error: "Cette annonce n'est plus disponible.", code: "NOT_FOUND" };
  }

  if (L.owner_id === userId) {
    return { ok: false, error: "Tu ne peux pas ajouter ta propre annonce au panier.", code: "FORBIDDEN" };
  }

  const { orderId, error: draftErr } = await getOrCreateDraftOrderId(supabase, userId);
  if (draftErr || !orderId) {
    return { ok: false, error: draftErr ?? "Panier indisponible." };
  }

  const { data: orderRow } = await supabase
    .from("gs_orders")
    .select("id, provider_id, start_date, end_date")
    .eq("id", orderId)
    .maybeSingle();

  const ord = orderRow as {
    provider_id: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;

  if (!ord) {
    return { ok: false, error: "Panier introuvable." };
  }

  const { count } = await supabase
    .from("gs_order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  const hasItems = (count ?? 0) > 0;

  if (hasItems && ord.provider_id && ord.provider_id !== L.owner_id) {
    return {
      ok: false,
      error:
        "Ton panier contient déjà du matériel d’un autre prestataire. Finalise cette commande ou vide le panier avant d’ajouter des articles d’ailleurs.",
      code: "PROVIDER_MISMATCH",
    };
  }

  const depositSnap = Math.max(0, Number(L.deposit_amount ?? 0));
  const priceSnap = Number(L.price_per_day);
  if (!Number.isFinite(priceSnap) || priceSnap < 0) {
    return { ok: false, error: "Prix de l’annonce invalide.", code: "VALIDATION" };
  }

  let nextProvider = ord.provider_id;
  let nextStart = ord.start_date;
  let nextEnd = ord.end_date;

  if (!hasItems) {
    nextProvider = L.owner_id;
    nextStart = input.startDate;
    nextEnd = input.endDate;
  } else {
    nextStart = input.startDate;
    nextEnd = input.endDate;
  }

  const { error: updOrderErr } = await supabase
    .from("gs_orders")
    .update({
      provider_id: nextProvider,
      start_date: nextStart,
      end_date: nextEnd,
    })
    .eq("id", orderId)
    .eq("status", "draft");

  if (updOrderErr) {
    return { ok: false, error: updOrderErr.message };
  }

  const { data: existingLine } = await supabase
    .from("gs_order_items")
    .select("id, quantity")
    .eq("order_id", orderId)
    .eq("listing_id", input.listingId)
    .maybeSingle();

  const ex = existingLine as { id: string; quantity: number } | null;

  if (ex) {
    const newQty = Math.min(99, ex.quantity + qty);
    const { error: upL } = await supabase
      .from("gs_order_items")
      .update({
        quantity: newQty,
        title_snapshot: L.title,
        price_per_day_snapshot: priceSnap,
        deposit_amount_snapshot: depositSnap,
      })
      .eq("id", ex.id);
    if (upL) {
      return { ok: false, error: upL.message };
    }
  } else {
    const { error: insL } = await supabase.from("gs_order_items").insert({
      order_id: orderId,
      listing_id: input.listingId,
      title_snapshot: L.title,
      price_per_day_snapshot: priceSnap,
      deposit_amount_snapshot: depositSnap,
      quantity: qty,
      days_count: days,
      line_total_eur: 0,
    });
    if (insL) {
      return { ok: false, error: insL.message };
    }
  }

  const rec = await recalcGsOrderDraft(supabase, orderId);
  if (rec.error) {
    return { ok: false, error: rec.error };
  }

  return { ok: true, data: { orderId } };
}

export async function removeGsCartLineAction(itemId: string): Promise<GsOrderCartResult> {
  const auth = await requireCustomerUser();
  if (!auth.ok) return auth.error;

  const { supabase } = auth;

  const { data: line } = await supabase
    .from("gs_order_items")
    .select("order_id")
    .eq("id", itemId)
    .maybeSingle();

  const orderId = (line as { order_id?: string } | null)?.order_id;
  if (!orderId) {
    return { ok: false, error: "Ligne introuvable.", code: "NOT_FOUND" };
  }

  const { error } = await supabase.from("gs_order_items").delete().eq("id", itemId);
  if (error) {
    return { ok: false, error: error.message };
  }

  const rec = await recalcGsOrderDraft(supabase, orderId);
  if (rec.error) {
    return { ok: false, error: rec.error };
  }

  return { ok: true, data: undefined };
}

export async function updateGsCartLineQuantityAction(
  itemId: string,
  quantity: number
): Promise<GsOrderCartResult> {
  const auth = await requireCustomerUser();
  if (!auth.ok) return auth.error;

  const qty = Math.min(99, Math.max(1, Math.floor(Number(quantity))));
  const { supabase } = auth;

  const { data: line } = await supabase
    .from("gs_order_items")
    .select("order_id")
    .eq("id", itemId)
    .maybeSingle();

  const orderId = (line as { order_id?: string } | null)?.order_id;
  if (!orderId) {
    return { ok: false, error: "Ligne introuvable.", code: "NOT_FOUND" };
  }

  const { error } = await supabase.from("gs_order_items").update({ quantity: qty }).eq("id", itemId);
  if (error) {
    return { ok: false, error: error.message };
  }

  const rec = await recalcGsOrderDraft(supabase, orderId);
  if (rec.error) {
    return { ok: false, error: rec.error };
  }

  return { ok: true, data: undefined };
}

export async function updateGsCartDatesAction(
  startDate: string,
  endDate: string
): Promise<GsOrderCartResult> {
  const auth = await requireCustomerUser();
  if (!auth.ok) return auth.error;

  const days = gsOrderDaysInclusive(startDate, endDate);
  if (days <= 0) {
    return { ok: false, error: "Période invalide.", code: "VALIDATION" };
  }

  const { userId, supabase } = auth;

  const { data: order } = await supabase
    .from("gs_orders")
    .select("id")
    .eq("customer_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  const orderId = (order as { id?: string } | null)?.id;
  if (!orderId) {
    return { ok: false, error: "Panier vide.", code: "NOT_FOUND" };
  }

  const { error } = await supabase
    .from("gs_orders")
    .update({ start_date: startDate, end_date: endDate })
    .eq("id", orderId)
    .eq("status", "draft");

  if (error) {
    return { ok: false, error: error.message };
  }

  const rec = await recalcGsOrderDraft(supabase, orderId);
  if (rec.error) {
    return { ok: false, error: rec.error };
  }

  return { ok: true, data: undefined };
}

/** Supprime toutes les lignes du panier brouillon courant. */
export async function clearGsDraftCartAction(): Promise<GsOrderCartResult> {
  const auth = await requireCustomerUser();
  if (!auth.ok) return auth.error;

  const { userId, supabase } = auth;

  const { data: order } = await supabase
    .from("gs_orders")
    .select("id")
    .eq("customer_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  const orderId = (order as { id?: string } | null)?.id;
  if (!orderId) {
    return { ok: true, data: undefined };
  }

  const { error: delErr } = await supabase.from("gs_order_items").delete().eq("order_id", orderId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  const rec = await recalcGsOrderDraft(supabase, orderId);
  if (rec.error) {
    return { ok: false, error: rec.error };
  }

  return { ok: true, data: undefined };
}

/**
 * Après connexion : importe le panier local invité dans le brouillon serveur (annonces revérifiées en base).
 */
export async function mergeGuestCartAction(
  raw: unknown
): Promise<GsOrderCartResult<{ orderId: string } | undefined>> {
  const cart = parseGuestCart(raw);
  if (!cart || cart.lines.length === 0) {
    return { ok: false, error: "Panier invité vide ou invalide.", code: "VALIDATION" };
  }

  const days = gsOrderDaysInclusive(cart.start_date, cart.end_date);
  if (days <= 0) {
    return { ok: false, error: "Période invalide.", code: "VALIDATION" };
  }

  const admin = createAdminClient();
  for (const line of cart.lines) {
    const { data: listing } = await admin
      .from("gs_listings")
      .select("id, owner_id, is_active")
      .eq("id", line.listing_id)
      .maybeSingle();
    const L = listing as { owner_id?: string; is_active?: boolean | null } | null;
    if (!L || L.is_active === false) {
      return { ok: false, error: "Une annonce du panier n’est plus disponible.", code: "NOT_FOUND" };
    }
    if (L.owner_id !== cart.provider_id) {
      return { ok: false, error: "Prestataire incohérent pour ce panier.", code: "VALIDATION" };
    }
  }

  const cleared = await clearGsDraftCartAction();
  if (!cleared.ok) return cleared;

  let lastOrderId: string | undefined;
  for (const line of cart.lines) {
    const res = await addToGsCartAction({
      listingId: line.listing_id,
      startDate: cart.start_date,
      endDate: cart.end_date,
      quantity: line.quantity,
    });
    if (!res.ok) return res;
    if (res.ok && res.data?.orderId) lastOrderId = res.data.orderId;
  }

  return { ok: true, data: { orderId: lastOrderId ?? "" } };
}
