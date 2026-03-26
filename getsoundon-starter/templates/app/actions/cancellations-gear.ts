"use server";

import { computeCancellationRefundGear, type CancellationActor } from "@/lib/cancellation-policy-gear";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CancelRentalResult = {
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

export async function cancelRentalOrderAction(
  offerId: string,
  reason: string
): Promise<CancelRentalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("rental_offers")
    .select("id, owner_id, seeker_id, status, payment_mode, stripe_payment_intent_id, expires_at")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { success: false, error: "Offre introuvable." };

  const row = offer as {
    id: string;
    owner_id: string;
    seeker_id: string;
    status: string;
    payment_mode: "full" | "split";
    stripe_payment_intent_id: string | null;
    expires_at: string | null;
  };
  if (row.status !== "paid") {
    return { success: false, error: "Seules les locations payees peuvent etre annulees." };
  }

  let actor: CancellationActor | null = null;
  if (user.id === row.owner_id) actor = "owner";
  else if (user.id === row.seeker_id) actor = "seeker";
  else actor = await resolveActor(user.id, user.email);
  if (!actor) return { success: false, error: "Acces refuse." };

  const { data: payments } = await admin
    .from("rental_payments")
    .select("id, amount")
    .eq("offer_id", offerId)
    .eq("product_type", "rental_order")
    .eq("status", "paid");
  const amountPaidCents = (payments ?? []).reduce(
    (sum, p) => sum + Math.max(0, (p.amount as number) ?? 0),
    0
  );
  if (amountPaidCents <= 0) {
    return { success: false, error: "Aucun paiement remboursable trouve." };
  }

  const eventStart = row.expires_at ? new Date(row.expires_at) : new Date();
  const outcome = computeCancellationRefundGear({
    actor,
    policy: "strict",
    eventStartAt: eventStart,
    now: new Date(),
    amountPaidCents,
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
    .from("rental_offers")
    .update({
      status: "expired",
      incident_status: "resolved",
      updated_at: nowIso,
    })
    .eq("id", offerId);

  const primaryPaymentId = (payments?.[0] as { id?: string } | undefined)?.id ?? null;
  await admin.from("rental_incident_cases").insert({
    payment_id: primaryPaymentId,
    offer_id: offerId,
    requested_by_role: actor === "admin" ? "admin" : actor,
    side: actor === "owner" ? "owner" : "seeker",
    case_type: outcome.refundCents >= amountPaidCents ? "refund" : "dispute",
    status: "resolved",
    amount_cents: outcome.refundCents,
    reason: reason || `Annulation (${outcome.reasonCode})`,
    created_by: user.id,
    created_at: nowIso,
    updated_at: nowIso,
  });

  return {
    success: true,
    refundCents: outcome.refundCents,
    ownerKeepsCents: outcome.ownerKeepsCents,
  };
}
