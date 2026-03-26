"use server";

import type { OfferListingSnapshotV1 } from "@/lib/offer-listing-snapshot";
import { OFFER_LISTING_SNAPSHOT_VERSION } from "@/lib/offer-listing-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function featureLabelsFromSalle(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features
    .map((f) =>
      f && typeof f === "object" && "label" in f ? String((f as { label: string }).label) : ""
    )
    .filter(Boolean);
}

function parseFulfillmentMode(
  raw: string | null | undefined
): OfferListingSnapshotV1["logistics"]["mode"] {
  const s = String(raw ?? "").trim();
  if (s === "livraison" || s === "les_deux" || s === "a_convenir") return s;
  return "retrait";
}

async function getPlatformFeeCents(params: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  eventType: "ponctuel" | "mensuel";
}): Promise<number> {
  const { adminSupabase, eventType } = params;
  const defaultCommission = { fixed_fee_cents: 1500, ponctuel: true, mensuel: false };

  const { data } = await (adminSupabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "commission")
    .maybeSingle();

  const raw = (data as { value?: Record<string, unknown> } | null)?.value ?? {};
  const fixedFeeValue = Number(raw.fixed_fee_cents);
  const fixedFeeCents = Number.isFinite(fixedFeeValue)
    ? Math.max(0, Math.round(fixedFeeValue))
    : defaultCommission.fixed_fee_cents;
  const enabledPonctuel =
    typeof raw.ponctuel === "boolean" ? raw.ponctuel : defaultCommission.ponctuel;
  const enabledMensuel =
    typeof raw.mensuel === "boolean" ? raw.mensuel : defaultCommission.mensuel;
  const isEnabled = eventType === "mensuel" ? enabledMensuel : enabledPonctuel;
  if (!isEnabled) return 0;
  return fixedFeeCents;
}

/** Marque les offres expirées (status pending + expires_at < now) pour une conversation */
export async function markExpiredOffersAction(conversationId: string): Promise<void> {
  const adminSupabase = createAdminClient();
  await adminSupabase
    .from("offers")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
}

export async function createOfferAction(formData: FormData): Promise<{ success: boolean; error?: string; offerId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const conversationId = formData.get("conversationId") as string | null;
  const demandeId = formData.get("demandeId") as string | null;
  const salleId = formData.get("salleId") as string | null;
  const amountStr = formData.get("amount") as string | null;
  const paymentModeRaw = (formData.get("paymentMode") as string | null) ?? "full";
  const upfrontAmountStr = formData.get("upfrontAmount") as string | null;
  const depositAmountStr = formData.get("depositAmount") as string | null;
  const eventType = (formData.get("eventType") as string | null) || "ponctuel";
  const cancellationPolicyRaw =
    (formData.get("cancellationPolicy") as string | null) || "strict";
  const dateDebut = formData.get("dateDebut") as string | null;
  const dateFin = formData.get("dateFin") as string | null;
  const expiresAt = formData.get("expiresAt") as string | null;
  const message = (formData.get("message") as string | null)?.trim() || null;
  const accessoriesNotes = String(formData.get("accessoriesNotes") ?? "").trim();
  const fulfillmentModeRaw = String(formData.get("fulfillmentMode") ?? "retrait").trim();
  const fulfillmentNotes = String(formData.get("fulfillmentNotes") ?? "").trim();

  if (!conversationId || !demandeId || !salleId || !amountStr || !expiresAt) {
    return { success: false, error: "Données manquantes." };
  }

  const validEventType = eventType === "mensuel" ? "mensuel" : "ponctuel";
  const cancellationPolicy =
    cancellationPolicyRaw === "moderate" || cancellationPolicyRaw === "flexible"
      ? cancellationPolicyRaw
      : "strict";
  const validDateDebut = dateDebut || expiresAt;
  const validDateFin = dateFin || dateDebut || expiresAt;

  const amountCents = Math.round(parseFloat(amountStr) * 100);
  if (amountCents <= 0 || !Number.isFinite(amountCents)) {
    return { success: false, error: "Montant invalide." };
  }
  const paymentMode =
    validEventType === "mensuel"
      ? "full"
      : paymentModeRaw === "split"
        ? "split"
        : "full";
  const upfrontAmountCents = Math.round(
    parseFloat((upfrontAmountStr || amountStr).replace(",", ".")) * 100
  );
  if (!Number.isFinite(upfrontAmountCents) || upfrontAmountCents <= 0) {
    return { success: false, error: "Acompte invalide." };
  }
  if (paymentMode === "split" && upfrontAmountCents >= amountCents) {
    return {
      success: false,
      error: "L'acompte doit être inférieur au montant total pour un paiement fractionné.",
    };
  }
  if (paymentMode === "full" && upfrontAmountCents !== amountCents) {
    return { success: false, error: "En paiement complet, l'acompte doit être égal au montant." };
  }
  const balanceAmountCents = Math.max(0, amountCents - upfrontAmountCents);
  const baseDate = new Date(`${validDateDebut}T10:00:00.000Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() - 7);
  const balanceDueAt =
    paymentMode === "split"
      ? (Number.isNaN(baseDate.getTime()) ? null : baseDate.toISOString())
      : null;
  const eventEndBase = new Date(`${validDateFin}T18:00:00.000Z`);
  const eventEndAt = Number.isNaN(eventEndBase.getTime()) ? null : eventEndBase.toISOString();
  const incidentDeadlineAt =
    eventEndAt ? new Date(new Date(eventEndAt).getTime() + 48 * 60 * 60 * 1000).toISOString() : null;
  const ownerPayoutDueAt =
    eventEndAt ? new Date(new Date(eventEndAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : null;
  const depositReleaseDueAt =
    eventEndAt ? new Date(new Date(eventEndAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
  const depositAmountCents = Math.round(parseFloat((depositAmountStr || "0").replace(",", ".")) * 100);
  if (!Number.isFinite(depositAmountCents) || depositAmountCents < 0) {
    return { success: false, error: "Caution invalide." };
  }

  const expiresDate = new Date(expiresAt);
  if (expiresDate < new Date()) {
    return { success: false, error: "La date d'expiration doit être dans le futur." };
  }

  const adminSupabase = createAdminClient();
  const serviceFeeCents = await getPlatformFeeCents({
    adminSupabase,
    eventType: validEventType,
  });

  const { data: conv } = await adminSupabase
    .from("conversations")
    .select("owner_id, seeker_id, demande_id")
    .eq("id", conversationId)
    .single();

  const convRow = conv as { owner_id: string; seeker_id: string | null; demande_id: string | null } | null;
  if (!convRow || convRow.owner_id !== user.id || !convRow.seeker_id) {
    return { success: false, error: "Conversation introuvable ou accès refusé." };
  }
  const seekerId = convRow.seeker_id;
  const conversationDemandeId = convRow.demande_id;

  const { data: existingPending } = await adminSupabase
    .from("offers")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return { success: false, error: "Une offre est déjà en attente pour cette conversation." };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!(profile as { stripe_account_id?: string } | null)?.stripe_account_id) {
    return { success: false, error: "Activez les paiements avant d'envoyer une offre." };
  }

  const { data: salleRow } = await adminSupabase
    .from("salles")
    .select("name, city, address, listing_kind, gear_category, gear_brand, gear_model, features")
    .eq("id", salleId)
    .maybeSingle();

  const sr = salleRow as {
    name?: string;
    city?: string;
    address?: string | null;
    listing_kind?: string | null;
    gear_category?: string | null;
    gear_brand?: string | null;
    gear_model?: string | null;
    features?: unknown;
  } | null;

  const listingSnapshot: OfferListingSnapshotV1 = {
    v: OFFER_LISTING_SNAPSHOT_VERSION,
    captured_at: new Date().toISOString(),
    listing: {
      salle_id: salleId,
      title: sr?.name?.trim() || "Annonce matériel",
      city: sr?.city?.trim() || "",
      address: sr?.address ?? null,
      listing_kind: sr?.listing_kind ?? null,
      gear_category: sr?.gear_category ?? null,
      gear_brand: sr?.gear_brand ?? null,
      gear_model: sr?.gear_model ?? null,
      feature_labels: featureLabelsFromSalle(sr?.features),
    },
    rental_period: {
      date_debut: validDateDebut,
      date_fin: validDateFin,
      event_type: validEventType,
    },
    money: {
      amount_cents: amountCents,
      deposit_cents: depositAmountCents,
      service_fee_cents: serviceFeeCents,
      payment_mode: paymentMode,
      upfront_cents: upfrontAmountCents,
      balance_cents: balanceAmountCents,
      cancellation_policy: cancellationPolicy,
    },
    logistics: {
      mode: parseFulfillmentMode(fulfillmentModeRaw),
      notes: fulfillmentNotes,
      accessories_notes: accessoriesNotes,
    },
  };

  const { data: offer, error } = await adminSupabase
    .from("offers")
    .insert({
      conversation_id: conversationId,
      demande_id: conversationDemandeId,
      owner_id: user.id,
      seeker_id: seekerId,
      salle_id: salleId,
      amount_cents: amountCents,
      payment_mode: paymentMode,
      upfront_amount_cents: upfrontAmountCents,
      balance_amount_cents: balanceAmountCents,
      balance_due_at: balanceDueAt,
      payment_plan_status: "pending_deposit",
      deposit_amount_cents: depositAmountCents,
      service_fee_cents: serviceFeeCents,
      deposit_refunded_cents: 0,
      deposit_status: "none",
      cancellation_policy: cancellationPolicy,
      contract_acceptance_version: "v2026-02",
      event_end_at: eventEndAt,
      incident_deadline_at: incidentDeadlineAt,
      owner_payout_due_at: ownerPayoutDueAt,
      owner_payout_status: "scheduled",
      deposit_release_due_at: depositReleaseDueAt,
      incident_status: "none",
      no_show_reported_by: "none",
      cancellation_outcome_status: "none",
      expires_at: expiresAt,
      status: "pending",
      message,
      event_type: validEventType,
      date_debut: validDateDebut,
      date_fin: validDateFin,
      listing_snapshot: listingSnapshot,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createOffer error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, offerId: (offer as { id: string }).id };
}

export async function requestOfferDepositClaimAction(
  offerId: string,
  amountEur: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const _unused = { offerId, amountEur, reason };
  void _unused;
  return {
    success: false,
    error:
      "La retenue directe est désactivée. Ouvrez un litige depuis les états des lieux, puis l'admin tranchera dans la section Litiges.",
  };
}

export async function releaseOfferDepositAction(
  offerId: string
): Promise<{ success: boolean; error?: string }> {
  const _unused = offerId;
  void _unused;
  return {
    success: false,
    error:
      "La libération directe est désactivée. Ouvrez un litige depuis les états des lieux, puis l'admin tranchera dans la section Litiges.",
  };
}

export async function refuseOfferAction(offerId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const adminSupabase = createAdminClient();

  const { data: offer } = await adminSupabase
    .from("offers")
    .select("id, seeker_id, status")
    .eq("id", offerId)
    .single();

  if (!offer) return { success: false, error: "Offre introuvable." };

  const offerRow = offer as { seeker_id: string; status: string };
  if (offerRow.seeker_id !== user.id) {
    return { success: false, error: "Vous n'êtes pas autorisé à refuser cette offre." };
  }

  if (offerRow.status !== "pending") {
    return { success: false, error: "Cette offre n'est plus disponible." };
  }

  const { data: offerFull } = await adminSupabase
    .from("offers")
    .select("conversation_id")
    .eq("id", offerId)
    .single();

  const { error } = await adminSupabase
    .from("offers")
    .update({ status: "refused", updated_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) {
    console.error("refuseOffer error:", error);
    return { success: false, error: error.message };
  }

  if (offerFull) {
    const convId = (offerFull as { conversation_id: string }).conversation_id;
    const msgContent = "A refusé l'offre.";
    await adminSupabase.from("messages").insert({
      conversation_id: convId,
      sender_id: user.id,
      content: msgContent,
    });
    await adminSupabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: msgContent,
      updated_at: new Date().toISOString(),
    }).eq("id", convId);
  }

  return { success: true };
}
