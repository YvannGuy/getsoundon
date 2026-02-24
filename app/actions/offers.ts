"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

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
  const seekerId = formData.get("seekerId") as string | null;
  const amountStr = formData.get("amount") as string | null;
  const depositAmountStr = formData.get("depositAmount") as string | null;
  const eventType = (formData.get("eventType") as string | null) || "ponctuel";
  const dateDebut = formData.get("dateDebut") as string | null;
  const dateFin = formData.get("dateFin") as string | null;
  const expiresAt = formData.get("expiresAt") as string | null;
  const message = (formData.get("message") as string | null)?.trim() || null;

  if (!conversationId || !demandeId || !salleId || !seekerId || !amountStr || !expiresAt) {
    return { success: false, error: "Données manquantes." };
  }

  const validEventType = eventType === "mensuel" ? "mensuel" : "ponctuel";
  const validDateDebut = dateDebut || expiresAt;
  const validDateFin = dateFin || dateDebut || expiresAt;

  const amountCents = Math.round(parseFloat(amountStr) * 100);
  if (amountCents <= 0 || !Number.isFinite(amountCents)) {
    return { success: false, error: "Montant invalide." };
  }
  const depositAmountCents = Math.round(parseFloat((depositAmountStr || "0").replace(",", ".")) * 100);
  if (!Number.isFinite(depositAmountCents) || depositAmountCents < 0) {
    return { success: false, error: "Caution invalide." };
  }

  const expiresDate = new Date(expiresAt);
  if (expiresDate < new Date()) {
    return { success: false, error: "La date d'expiration doit être dans le futur." };
  }

  const adminSupabase = createAdminClient();

  const { data: conv } = await adminSupabase
    .from("conversations")
    .select("owner_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (conv as { owner_id: string }).owner_id !== user.id) {
    return { success: false, error: "Conversation introuvable ou accès refusé." };
  }

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

  const { data: offer, error } = await adminSupabase
    .from("offers")
    .insert({
      conversation_id: conversationId,
      demande_id: demandeId,
      owner_id: user.id,
      seeker_id: seekerId,
      salle_id: salleId,
      amount_cents: amountCents,
      deposit_amount_cents: depositAmountCents,
      service_fee_cents: 1500,
      deposit_refunded_cents: 0,
      deposit_status: "none",
      expires_at: expiresAt,
      status: "pending",
      message,
      event_type: validEventType,
      date_debut: validDateDebut,
      date_fin: validDateFin,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select(
      "id, owner_id, status, deposit_amount_cents, deposit_hold_status"
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { success: false, error: "Offre introuvable" };

  const offerRow = offer as {
    id: string;
    owner_id: string;
    status: string;
    deposit_amount_cents: number | null;
    deposit_hold_status: string | null;
  };
  if (offerRow.owner_id !== user.id) return { success: false, error: "Accès refusé" };
  if (offerRow.status !== "paid") return { success: false, error: "Offre non payée" };

  const depositTotal = Math.max(0, offerRow.deposit_amount_cents ?? 0);
  if (depositTotal <= 0) {
    return { success: false, error: "Aucune caution sur cette offre" };
  }
  if (offerRow.deposit_hold_status !== "authorized") {
    return { success: false, error: "Empreinte non active" };
  }
  const requestedAmountCents = Math.round(amountEur * 100);
  if (!Number.isFinite(requestedAmountCents) || requestedAmountCents <= 0) {
    return { success: false, error: "Montant invalide" };
  }
  if (requestedAmountCents > depositTotal) {
    return { success: false, error: "Montant supérieur à la caution" };
  }
  if (!reason.trim()) {
    return { success: false, error: "Motif requis" };
  }

  const { error } = await admin
    .from("offers")
    .update({
      deposit_hold_status: "claim_requested",
      deposit_claim_amount_cents: requestedAmountCents,
      deposit_claim_reason: reason.trim(),
      deposit_claim_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", offerId);
  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function releaseOfferDepositAction(
  offerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté" };

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select("id, owner_id, status, deposit_payment_intent_id, deposit_hold_status")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { success: false, error: "Offre introuvable" };

  const row = offer as {
    owner_id: string;
    status: string;
    deposit_payment_intent_id: string | null;
    deposit_hold_status: string | null;
  };
  if (row.owner_id !== user.id) return { success: false, error: "Accès refusé" };
  if (row.status !== "paid") return { success: false, error: "Offre non payée" };
  if (!row.deposit_payment_intent_id) return { success: false, error: "Empreinte introuvable" };
  if (!["authorized", "claim_requested"].includes(row.deposit_hold_status ?? "")) {
    return { success: false, error: "Empreinte déjà traitée" };
  }

  try {
    const stripe = getStripe();
    await stripe.paymentIntents.cancel(row.deposit_payment_intent_id);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur libération caution",
    };
  }

  const { error } = await admin
    .from("offers")
    .update({
      deposit_hold_status: "released",
      deposit_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", offerId);
  if (error) return { success: false, error: error.message };

  return { success: true };
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
