"use server";

import { revalidatePath } from "next/cache";

import { computeCancellationRefund, type CancellationActor } from "@/lib/cancellation-policy";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CancelReservationResult = {
  success: boolean;
  error?: string;
  refundCents?: number;
  ownerKeepsCents?: number;
};

async function resolveActor(userId: string, email?: string | null): Promise<CancellationActor | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("user_type")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.user_type === "admin") return "admin";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (email && adminEmails.includes(email.toLowerCase())) return "admin";
  return null;
}

export async function cancelReservationAction(
  offerId: string,
  reason: string
): Promise<CancelReservationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select(
      "id, owner_id, seeker_id, status, date_debut, cancellation_policy, stripe_payment_intent_id, no_show_reported_by"
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { success: false, error: "Offre introuvable." };

  const row = offer as {
    id: string;
    owner_id: string;
    seeker_id: string;
    status: string;
    date_debut: string | null;
    cancellation_policy: "strict" | "moderate" | "flexible" | null;
    stripe_payment_intent_id: string | null;
    no_show_reported_by: "none" | "owner" | "seeker" | null;
  };
  if (row.status !== "paid") {
    return { success: false, error: "Seules les réservations payées peuvent être annulées." };
  }

  let actor: CancellationActor | null = null;
  if (user.id === row.owner_id) actor = "owner";
  else if (user.id === row.seeker_id) actor = "seeker";
  else actor = await resolveActor(user.id, user.email);
  if (!actor) return { success: false, error: "Accès refusé." };

  const { data: payments } = await admin
    .from("payments")
    .select("id, amount")
    .eq("offer_id", offerId)
    .eq("product_type", "reservation")
    .eq("status", "paid");
  const amountPaidCents = (payments ?? []).reduce((sum, p) => sum + Math.max(0, (p.amount as number) ?? 0), 0);
  if (amountPaidCents <= 0) {
    return { success: false, error: "Aucun paiement remboursable trouvé." };
  }

  const eventStart = row.date_debut ? new Date(`${row.date_debut}T10:00:00.000Z`) : new Date();
  const outcome = computeCancellationRefund({
    actor,
    policy: row.cancellation_policy ?? "strict",
    eventStartAt: eventStart,
    now: new Date(),
    amountPaidCents,
    noShowReportedBy: row.no_show_reported_by ?? "none",
  });

  if (outcome.refundCents > 0) {
    if (!row.stripe_payment_intent_id) {
      return { success: false, error: "PaymentIntent Stripe introuvable pour rembourser." };
    }
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: row.stripe_payment_intent_id,
      amount: outcome.refundCents,
      metadata: {
        offer_id: offerId,
        actor,
        reason_code: outcome.reasonCode,
        policy: outcome.policyApplied,
      },
    });
  }

  const nowIso = new Date().toISOString();
  await admin
    .from("offers")
    .update({
      cancellation_outcome_status: "applied",
      incident_status: "resolved",
      updated_at: nowIso,
    })
    .eq("id", offerId);

  const primaryPaymentId = (payments?.[0] as { id?: string } | undefined)?.id ?? null;
  await admin.from("refund_cases").insert({
    payment_id: primaryPaymentId,
    offer_id: offerId,
    requested_by_role: actor === "admin" ? "admin" : actor,
    side: actor === "owner" ? "owner" : actor === "seeker" ? "seeker" : "none",
    case_type: outcome.refundCents >= amountPaidCents ? "refund_full" : "refund_partial",
    status: "resolved",
    amount_cents: outcome.refundCents,
    reason: reason || `Annulation (${outcome.reasonCode})`,
    evidence_required: false,
    created_by: user.id,
    created_at: nowIso,
    resolved_at: nowIso,
    updated_at: nowIso,
  });

  if (outcome.refundCents >= amountPaidCents) {
    await admin
      .from("payments")
      .update({ status: "refunded" })
      .eq("offer_id", offerId)
      .eq("product_type", "reservation")
      .eq("status", "paid");
  }

  revalidatePath("/dashboard/reservations");
  revalidatePath("/proprietaire/reservations");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/paiements");

  return {
    success: true,
    refundCents: outcome.refundCents,
    ownerKeepsCents: outcome.ownerKeepsCents,
  };
}
