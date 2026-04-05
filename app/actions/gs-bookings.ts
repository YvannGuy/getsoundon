"use server";

import { revalidatePath } from "next/cache";

import { siteConfig } from "@/config/site";
import { getAuthUserEmail } from "@/lib/auth-user-email";
import {
  sendGsBookingAcceptedCustomerEmail,
  sendGsBookingIncidentDeclaredCustomerEmail,
  sendGsBookingIncidentDeclaredProviderEmail,
  sendGsBookingIncidentResolvedPartyEmail,
  sendGsBookingRefusedCustomerEmail,
} from "@/lib/email";
import { getPostHogClient } from "@/lib/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendUserNotification } from "@/lib/user-notifications";

type GsBookingRow = {
  id: string;
  customer_id: string;
  provider_id: string;
  listing_id: string;
  status: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPTER / REFUSER — Phase 2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prestataire accepte une demande matériel.
 * Hydrate deposit_amount depuis gs_listings (P2.5).
 */
export async function acceptGsBookingAction(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, customer_id, provider_id, listing_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as GsBookingRow;

  if (row.provider_id !== user.id) return { success: false, error: "Accès refusé." };
  if (row.status !== "pending") return { success: false, error: "Cette demande n'est plus en attente." };

  const { data: listing } = await admin
    .from("gs_listings")
    .select("deposit_amount")
    .eq("id", row.listing_id)
    .maybeSingle();

  const depositAmount = Math.max(
    0,
    Number((listing as { deposit_amount?: number | null } | null)?.deposit_amount ?? 0)
  );

  const { error: updateError } = await admin
    .from("gs_bookings")
    .update({
      status: "accepted",
      deposit_amount: depositAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (updateError) return { success: false, error: updateError.message };

  const { data: listingMeta } = await admin
    .from("gs_listings")
    .select("title")
    .eq("id", row.listing_id)
    .maybeSingle();
  const listingTitle =
    (listingMeta as { title?: string } | null)?.title?.trim() || "Annonce matériel";
  const siteBase = siteConfig.url.replace(/\/$/, "");

  await sendUserNotification({
    userId: row.customer_id,
    telegramText: `✅ Ta demande de location matériel a été acceptée. Tu peux maintenant procéder au paiement sur GetSoundOn.`,
    sendEmail: async () => {
      const to = await getAuthUserEmail(admin, row.customer_id);
      if (!to) return;
      await sendGsBookingAcceptedCustomerEmail(
        to,
        listingTitle,
        `${siteBase}/dashboard/materiel/${bookingId}`
      );
    },
  }).catch(() => null);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "booking_accepted",
    properties: { booking_id: bookingId, listing_id: row.listing_id, customer_id: row.customer_id },
  });
  await posthog.shutdown();

  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

/**
 * Prestataire refuse une demande matériel.
 */
export async function refuseGsBookingAction(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, customer_id, provider_id, listing_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as GsBookingRow;

  if (row.provider_id !== user.id) return { success: false, error: "Accès refusé." };
  if (row.status !== "pending") return { success: false, error: "Cette demande n'est plus en attente." };

  const { error: updateError } = await admin
    .from("gs_bookings")
    .update({ status: "refused", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (updateError) return { success: false, error: updateError.message };

  const { data: listingMetaRef } = await admin
    .from("gs_listings")
    .select("title")
    .eq("id", row.listing_id)
    .maybeSingle();
  const listingTitleRef =
    (listingMetaRef as { title?: string } | null)?.title?.trim() || "Annonce matériel";
  const siteBaseRef = siteConfig.url.replace(/\/$/, "");

  await sendUserNotification({
    userId: row.customer_id,
    telegramText: `❌ Ta demande de location matériel n'a pas pu être acceptée par le prestataire. Tu peux chercher d'autres équipements sur GetSoundOn.`,
    sendEmail: async () => {
      const to = await getAuthUserEmail(admin, row.customer_id);
      if (!to) return;
      await sendGsBookingRefusedCustomerEmail(
        to,
        listingTitleRef,
        `${siteBaseRef}/dashboard/materiel/${bookingId}`
      );
    },
  }).catch(() => null);

  const posthogRefuse = getPostHogClient();
  posthogRefuse.capture({
    distinctId: user.id,
    event: "booking_refused",
    properties: { booking_id: bookingId, listing_id: row.listing_id, customer_id: row.customer_id },
  });
  await posthogRefuse.shutdown();

  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN — Phase 3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prestataire ouvre le check-in d'une réservation matériel payée.
 */
export async function openCheckInAction(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, provider_id, customer_id, status, stripe_payment_intent_id, check_in_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    provider_id: string;
    customer_id: string;
    status: string;
    stripe_payment_intent_id: string | null;
    check_in_status: string | null;
  };

  if (row.provider_id !== user.id) return { success: false, error: "Accès refusé." };
  if (row.status !== "accepted") return { success: false, error: "La réservation n'est pas dans un état payé." };
  if (!row.stripe_payment_intent_id) return { success: false, error: "Paiement non confirmé." };
  if (row.check_in_status) return { success: false, error: "Le check-in est déjà ouvert." };

  const { error } = await admin
    .from("gs_bookings")
    .update({ check_in_status: "opened", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .is("check_in_status", null);

  if (error) return { success: false, error: error.message };

  await sendUserNotification({
    userId: row.customer_id,
    telegramText: `📦 Le prestataire vient d'ouvrir le check-in pour ta location matériel. La remise est en cours de confirmation.`,
    sendEmail: async () => Promise.resolve(),
  }).catch(() => null);

  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

/**
 * Prestataire confirme la remise effective du matériel (check-in validé).
 */
export async function confirmCheckInAction(
  bookingId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, provider_id, customer_id, check_in_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    provider_id: string;
    customer_id: string;
    check_in_status: string | null;
  };

  if (row.provider_id !== user.id) return { success: false, error: "Accès refusé." };
  if (row.check_in_status !== "opened") return { success: false, error: "Le check-in n'est pas encore ouvert." };

  const { error } = await admin
    .from("gs_bookings")
    .update({
      check_in_status: "confirmed",
      check_in_at: new Date().toISOString(),
      check_in_comment: comment?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("check_in_status", "opened");

  if (error) return { success: false, error: error.message };

  await sendUserNotification({
    userId: row.customer_id,
    telegramText: `✅ Le prestataire a confirmé la remise du matériel. Bonne location !`,
    sendEmail: async () => Promise.resolve(),
  }).catch(() => null);

  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-OUT — Phase 3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prestataire clôture le retour du matériel.
 * - Passe status → "completed"
 * - Définit incident_deadline_at = now + 48h
 */
export async function confirmCheckOutAction(
  bookingId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, provider_id, customer_id, status, check_out_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    provider_id: string;
    customer_id: string;
    status: string;
    check_out_status: string | null;
  };

  if (row.provider_id !== user.id) return { success: false, error: "Accès refusé." };
  if (row.status !== "accepted") return { success: false, error: "Réservation non active." };
  if (row.check_out_status) return { success: false, error: "Le retour a déjà été clôturé." };

  const now = new Date();
  const incidentDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("gs_bookings")
    .update({
      check_out_status: "confirmed",
      check_out_at: now.toISOString(),
      check_out_comment: comment?.trim() || null,
      incident_deadline_at: incidentDeadlineAt,
      status: "completed",
      updated_at: now.toISOString(),
    })
    .eq("id", bookingId)
    .is("check_out_status", null);

  if (error) return { success: false, error: error.message };

  await sendUserNotification({
    userId: row.customer_id,
    telegramText: `📦 Le prestataire a clôturé le retour de ton matériel. Ta location est terminée.`,
    sendEmail: async () => Promise.resolve(),
  }).catch(() => null);

  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT — Phase 3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prestataire signale un incident (fenêtre 48h post-checkout).
 * - Bloque automatiquement payout et release caution via incident_status = "open"
 */
export async function reportIncidentAction(
  bookingId: string,
  comment: string,
  amountRequested?: number
): Promise<{ success: boolean; error?: string }> {
  if (!comment.trim()) return { success: false, error: "Un commentaire est requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("gs_bookings")
    .select(
      "id, provider_id, customer_id, listing_id, status, incident_status, incident_deadline_at, end_date"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    provider_id: string;
    customer_id: string;
    listing_id: string;
    status: string;
    incident_status: string | null;
    incident_deadline_at: string | null;
    end_date: string;
  };

  if (row.provider_id !== user.id) return { success: false, error: "Accès refusé." };
  if (row.incident_status) return { success: false, error: "Un incident a déjà été signalé." };

  // Fenêtre 48h : prefer incident_deadline_at stocké (défini au check-out), sinon end_date + 48h
  const deadlineAt = row.incident_deadline_at
    ? new Date(row.incident_deadline_at)
    : new Date(new Date(`${row.end_date}T23:59:59.000Z`).getTime() + 48 * 60 * 60 * 1000);

  if (new Date() > deadlineAt) {
    return { success: false, error: "La fenêtre de signalement de 48h est expirée." };
  }

  const safeAmount =
    amountRequested != null && Number.isFinite(amountRequested) && amountRequested > 0
      ? Math.round(amountRequested * 100) / 100
      : null;

  const { error } = await admin
    .from("gs_bookings")
    .update({
      incident_status: "open",
      incident_at: new Date().toISOString(),
      incident_comment: comment.trim(),
      incident_amount_requested: safeAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .is("incident_status", null);

  if (error) return { success: false, error: error.message };

  const siteBase = siteConfig.url.replace(/\/$/, "");
  let listingTitle = "Annonce";
  const { data: listingRow } = await admin
    .from("gs_listings")
    .select("title")
    .eq("id", row.listing_id)
    .maybeSingle();
  const lt = (listingRow as { title?: string } | null)?.title?.trim();
  if (lt) listingTitle = lt;

  const customerEmail = await getAuthUserEmail(admin, row.customer_id);
  if (customerEmail) {
    await sendGsBookingIncidentDeclaredCustomerEmail(customerEmail, {
      listingTitle,
      bookingUrl: `${siteBase}/dashboard/materiel/${bookingId}`,
    }).catch(() => null);
  }
  const providerEmail = await getAuthUserEmail(admin, user.id);
  if (providerEmail) {
    await sendGsBookingIncidentDeclaredProviderEmail(providerEmail, {
      listingTitle,
      bookingUrl: `${siteBase}/proprietaire/materiel/${bookingId}`,
    }).catch(() => null);
  }

  await sendUserNotification({
    userId: row.customer_id,
    telegramText: `⚠️ Le prestataire a signalé un incident concernant ta location matériel. Un administrateur va examiner le dossier.`,
    sendEmail: async () => Promise.resolve(),
  }).catch(() => null);

  const posthogIncident = getPostHogClient();
  posthogIncident.capture({
    distinctId: user.id,
    event: "incident_reported",
    properties: {
      booking_id: bookingId,
      amount_requested_eur: safeAmount,
      customer_id: row.customer_id,
    },
  });
  await posthogIncident.shutdown();

  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉSOLUTION ADMIN — Phase 4
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin résout ou rejette un incident matériel.
 * `resolved` : incident validé → payout débloqué, caution suit le cycle J+7 normal.
 * `dismissed` : incident rejeté → cycle normal reprend immédiatement.
 * Dans les deux cas, payout_status reset à "pending" si bloqué.
 */
export async function resolveIncidentAdminAction(
  bookingId: string,
  decision: "resolved" | "dismissed"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv = adminEmails.includes(user.email?.toLowerCase() ?? "");

  const admin = createAdminClient();

  if (!isAdminByEnv) {
    const { data: profile } = await admin
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile as { user_type?: string } | null)?.user_type !== "admin") {
      return { success: false, error: "Accès refusé." };
    }
  }

  const { data: booking } = await admin
    .from("gs_bookings")
    .select(
      "id, customer_id, provider_id, listing_id, incident_status, payout_status, deposit_amount, deposit_hold_status, deposit_claim_status"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    customer_id: string;
    provider_id: string;
    listing_id: string;
    incident_status: string | null;
    payout_status: string | null;
    deposit_amount: number | string | null;
    deposit_hold_status: string | null;
    deposit_claim_status: string | null;
  };

  if (row.incident_status !== "open") {
    return { success: false, error: "L'incident n'est pas ouvert ou a déjà été traité." };
  }

  // Si dismissed → payout reprend immédiatement.
  // Si resolved et il y a une caution non encore traitée → payout reste bloqué
  // jusqu'à la décision financière sur la caution (capture ou release admin).
  const depositEur = Number(row.deposit_amount ?? 0);
  const hasActiveDeposit = depositEur > 0 && row.deposit_hold_status === "authorized" && !row.deposit_claim_status;
  const keepBlocked = decision === "resolved" && hasActiveDeposit;

  let newPayoutStatus = row.payout_status;
  if (row.payout_status === "blocked") {
    newPayoutStatus = keepBlocked ? "blocked" : "pending";
  }

  const updatePayload: Record<string, unknown> = {
    incident_status: decision,
    payout_status: newPayoutStatus,
    updated_at: new Date().toISOString(),
  };

  // Si resolved avec caution active → signaler qu'une décision caution est attendue
  if (keepBlocked) {
    updatePayload.deposit_claim_status = "pending_capture";
  }

  const { error } = await admin
    .from("gs_bookings")
    .update(updatePayload)
    .eq("id", bookingId)
    .eq("incident_status", "open");

  if (error) return { success: false, error: error.message };

  const providerMsg =
    decision === "resolved"
      ? keepBlocked
        ? `✅ L'incident que tu as signalé a été validé. Une décision sur la caution est en cours.`
        : `✅ L'incident que tu as signalé a été validé. Le versement va reprendre son cours normal.`
      : `ℹ️ L'incident que tu avais signalé a été examiné et rejeté. Le versement suit son cours normal.`;

  const customerMsg =
    decision === "resolved"
      ? keepBlocked
        ? `✅ L'incident signalé sur ta location matériel a été validé. L'administration va statuer sur ta caution.`
        : `✅ L'incident signalé sur ta location matériel a été traité par l'administration GetSoundOn.`
      : `ℹ️ L'incident signalé sur ta location matériel a été examiné et rejeté. Ta caution sera libérée normalement.`;

  const siteBase = siteConfig.url.replace(/\/$/, "");
  let listingTitleResolved = "Annonce";
  const { data: listingResolved } = await admin
    .from("gs_listings")
    .select("title")
    .eq("id", row.listing_id)
    .maybeSingle();
  const ltr = (listingResolved as { title?: string } | null)?.title?.trim();
  if (ltr) listingTitleResolved = ltr;

  const providerMail = await getAuthUserEmail(admin, row.provider_id);
  if (providerMail) {
    await sendGsBookingIncidentResolvedPartyEmail(providerMail, {
      role: "provider",
      listingTitle: listingTitleResolved,
      bookingUrl: `${siteBase}/proprietaire/materiel/${bookingId}`,
      decision,
      cautionDecisionPending: keepBlocked,
    }).catch(() => null);
  }
  const customerMail = await getAuthUserEmail(admin, row.customer_id);
  if (customerMail) {
    await sendGsBookingIncidentResolvedPartyEmail(customerMail, {
      role: "customer",
      listingTitle: listingTitleResolved,
      bookingUrl: `${siteBase}/dashboard/materiel/${bookingId}`,
      decision,
      cautionDecisionPending: keepBlocked,
    }).catch(() => null);
  }

  await Promise.all([
    sendUserNotification({
      userId: row.provider_id,
      telegramText: providerMsg,
      sendEmail: async () => Promise.resolve(),
    }).catch(() => null),
    sendUserNotification({
      userId: row.customer_id,
      telegramText: customerMsg,
      sendEmail: async () => Promise.resolve(),
    }).catch(() => null),
  ]);

  revalidatePath("/admin/incidents-materiel");
  revalidatePath(`/admin/incidents-materiel/${bookingId}`);
  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉCISION FINANCIÈRE CAUTION — Phase 5
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin libère explicitement la caution d'un gs_booking.
 * Appelle stripe.paymentIntents.cancel sur le deposit PI.
 */
export async function releaseDepositAdminAction(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv = adminEmails.includes(user.email?.toLowerCase() ?? "");

  const admin = createAdminClient();

  if (!isAdminByEnv) {
    const { data: profile } = await admin
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile as { user_type?: string } | null)?.user_type !== "admin") {
      return { success: false, error: "Accès refusé." };
    }
  }

  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, customer_id, provider_id, deposit_payment_intent_id, deposit_hold_status, deposit_claim_status, deposit_amount, payout_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    customer_id: string;
    provider_id: string;
    deposit_payment_intent_id: string | null;
    deposit_hold_status: string | null;
    deposit_claim_status: string | null;
    deposit_amount: number | string | null;
    payout_status: string | null;
  };

  if (!row.deposit_payment_intent_id) {
    return { success: false, error: "Aucune empreinte de caution existante." };
  }

  const terminalStates = ["captured_full", "captured_partial", "released_admin", "released_auto"];
  if (row.deposit_hold_status === "released" || terminalStates.includes(row.deposit_claim_status ?? "")) {
    return { success: false, error: "La caution a déjà été traitée." };
  }

  // Après décision caution, payout peut repartir
  const newPayoutStatus = row.payout_status === "blocked" ? "pending" : row.payout_status;

  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();

    await stripe.paymentIntents.cancel(row.deposit_payment_intent_id);

    await admin
      .from("gs_bookings")
      .update({
        deposit_hold_status: "released",
        deposit_claim_status: "released_admin",
        deposit_decision_at: new Date().toISOString(),
        deposit_decision_reason: reason?.trim() || "Libération admin",
        deposit_captured_amount: 0,
        payout_status: newPayoutStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    await sendUserNotification({
      userId: row.customer_id,
      telegramText: `✅ Ta caution de ${Number(row.deposit_amount ?? 0)} € pour ta location matériel a été libérée. Aucun montant ne sera prélevé.`,
      sendEmail: async () => Promise.resolve(),
    }).catch(() => null);

  } catch (stripeErr) {
    console.error("[releaseDeposit] Stripe error", stripeErr);
    const errMsg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
    if (errMsg.includes("canceled") || errMsg.includes("expired")) {
      await admin
        .from("gs_bookings")
        .update({
          deposit_hold_status: "released",
          deposit_claim_status: "released_admin",
          deposit_decision_at: new Date().toISOString(),
          deposit_decision_reason: reason?.trim() || `Libération admin (PI déjà ${errMsg.includes("canceled") ? "annulé" : "expiré"})`,
          deposit_captured_amount: 0,
          payout_status: newPayoutStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    } else {
      return { success: false, error: `Erreur Stripe : ${errMsg}` };
    }
  }

  revalidatePath("/admin/incidents-materiel");
  revalidatePath(`/admin/incidents-materiel/${bookingId}`);
  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}

/**
 * Admin capture tout ou partie de la caution d'un gs_booking.
 * amountEur = montant en euros à capturer (doit être ≤ deposit_amount autorisé).
 * Utilise stripe.paymentIntents.capture avec amount_to_capture.
 */
export async function captureDepositAdminAction(
  bookingId: string,
  amountEur: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(amountEur) || amountEur <= 0) {
    return { success: false, error: "Le montant doit être un nombre positif." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv = adminEmails.includes(user.email?.toLowerCase() ?? "");

  const admin = createAdminClient();

  if (!isAdminByEnv) {
    const { data: profile } = await admin
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile as { user_type?: string } | null)?.user_type !== "admin") {
      return { success: false, error: "Accès refusé." };
    }
  }

  const { data: booking } = await admin
    .from("gs_bookings")
    .select("id, customer_id, provider_id, deposit_payment_intent_id, deposit_hold_status, deposit_claim_status, deposit_amount, payout_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Réservation introuvable." };

  const row = booking as {
    id: string;
    customer_id: string;
    provider_id: string;
    deposit_payment_intent_id: string | null;
    deposit_hold_status: string | null;
    deposit_claim_status: string | null;
    deposit_amount: number | string | null;
    payout_status: string | null;
  };

  if (!row.deposit_payment_intent_id) {
    return { success: false, error: "Aucune empreinte de caution existante." };
  }

  const capTerminal = ["captured_full", "captured_partial", "released_admin", "released_auto"];
  if (row.deposit_hold_status === "released" || capTerminal.includes(row.deposit_claim_status ?? "")) {
    return { success: false, error: "La caution a déjà été traitée." };
  }

  const authorizedEur = Number(row.deposit_amount ?? 0);
  if (amountEur > authorizedEur) {
    return {
      success: false,
      error: `Le montant (${amountEur} €) dépasse le montant autorisé (${authorizedEur} €).`,
    };
  }

  const captureCents = Math.round(amountEur * 100);
  const isPartial = amountEur < authorizedEur;
  const newPayoutStatus = row.payout_status === "blocked" ? "pending" : row.payout_status;

  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();

    await stripe.paymentIntents.capture(row.deposit_payment_intent_id, {
      amount_to_capture: captureCents,
    });

    await admin
      .from("gs_bookings")
      .update({
        deposit_hold_status: "captured",
        deposit_claim_status: isPartial ? "captured_partial" : "captured_full",
        deposit_captured_amount: amountEur,
        deposit_decision_at: new Date().toISOString(),
        deposit_decision_reason: reason?.trim() || `Capture ${isPartial ? "partielle" : "totale"} admin`,
        payout_status: newPayoutStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    await sendUserNotification({
      userId: row.customer_id,
      telegramText: `⚠️ Suite à l'incident signalé sur ta location matériel, un montant de ${amountEur} € a été prélevé sur ta caution.`,
      sendEmail: async () => Promise.resolve(),
    }).catch(() => null);

    await sendUserNotification({
      userId: row.provider_id,
      telegramText: `✅ La caution de ${amountEur} € a été capturée pour l'incident sur ta location matériel.`,
      sendEmail: async () => Promise.resolve(),
    }).catch(() => null);

  } catch (stripeErr) {
    console.error("[captureDeposit] Stripe error", stripeErr);
    const errMsg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
    return { success: false, error: `Erreur Stripe : ${errMsg}` };
  }

  revalidatePath("/admin/incidents-materiel");
  revalidatePath(`/admin/incidents-materiel/${bookingId}`);
  revalidatePath("/proprietaire/materiel");
  revalidatePath("/dashboard/materiel");
  return { success: true };
}
