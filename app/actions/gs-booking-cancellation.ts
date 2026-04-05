"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { isUserAdmin } from "@/lib/admin-access";
import { getAuthUserEmail } from "@/lib/auth-user-email";
import {
  sendGsBookingCancellationDecisionEmail,
  sendGsBookingCancellationRequestedCustomerEmail,
  sendGsBookingCancellationRequestedProviderEmail,
  type GsCancellationDecisionKind,
} from "@/lib/email";
import {
  adminPolicyGuidanceText,
  evaluateCancellationRequestEligibility,
  normalizeCancellationPolicy,
  type AdminDecisionType,
  type GsBookingForCancellationEligibility,
  type GsCancellationRequestRow,
} from "@/lib/gs-booking-cancellation";
import { getCheckoutTotalPaidCents } from "@/lib/gs-booking-platform-fee";
import { getPostHogClient } from "@/lib/posthog-server";
import { auditLog } from "@/lib/security/audit-log";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";
import { sendUserNotification } from "@/lib/user-notifications";

const requestSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().min(10, "Merci de préciser la raison (10 caractères minimum).").max(4000),
});

const decideSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["reject", "approve_no_refund", "approve_partial", "approve_full"]),
  adminNote: z.string().trim().max(4000).optional(),
  partialRefundEur: z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined || s.trim() === "") return undefined;
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n : undefined;
    }),
});

export type GsCancellationActionState = { error?: string; ok?: boolean };

export async function requestGsBookingCancellation(
  _prev: GsCancellationActionState,
  formData: FormData,
): Promise<GsCancellationActionState> {
  const parsed = requestSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "Données invalides." };
  }

  const { user, supabase } = await getUserOrNull();
  if (!user) return { error: "Non connecté." };

  const admin = createAdminClient();
  const { data: bookingRaw } = await admin
    .from("gs_bookings")
    .select(
      "id, customer_id, provider_id, listing_id, status, stripe_payment_intent_id, check_in_status, check_out_status, incident_status, payout_status",
    )
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (!bookingRaw || (bookingRaw as { customer_id: string }).customer_id !== user.id) {
    return { error: "Réservation introuvable." };
  }

  const booking = bookingRaw as GsBookingForCancellationEligibility;

  const { data: existingRaw } = await admin
    .from("gs_booking_cancellation_requests")
    .select("id, booking_id, status, reason, requested_at, decided_at, admin_note, refund_amount_eur, stripe_refund_id")
    .eq("booking_id", booking.id);

  const existing = (existingRaw ?? []) as GsCancellationRequestRow[];

  const elig = evaluateCancellationRequestEligibility(booking, existing);
  if (!elig.ok) {
    return { error: elig.message };
  }

  const { error: insErr } = await admin.from("gs_booking_cancellation_requests").insert({
    booking_id: booking.id,
    customer_id: user.id,
    status: "pending",
    reason: parsed.data.reason,
  });

  if (insErr) {
    console.error("[requestGsBookingCancellation]", insErr);
    return { error: "Impossible d’enregistrer la demande. Réessayez ou contactez le support." };
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "booking_cancellation_requested",
    properties: { booking_id: booking.id, booking_status: booking.status },
  });
  await posthog.shutdown();

  const b = booking as GsBookingForCancellationEligibility & {
    provider_id: string;
    listing_id: string;
  };
  const { data: listingRow } = await admin
    .from("gs_listings")
    .select("title")
    .eq("id", b.listing_id)
    .maybeSingle();
  const listingTitle =
    (listingRow as { title?: string } | null)?.title?.trim() || "Annonce matériel";
  const siteBase = siteConfig.url.replace(/\/$/, "");

  await Promise.all([
    sendUserNotification({
      userId: b.provider_id,
      telegramText: `⚠️ Demande d’annulation pour « ${listingTitle} ». L’administration va examiner la demande.`,
      sendEmail: async () => {
        const to = await getAuthUserEmail(admin, b.provider_id);
        if (!to) return;
        await sendGsBookingCancellationRequestedProviderEmail(to, {
          listingTitle,
          bookingUrl: `${siteBase}/proprietaire/materiel/${b.id}`,
          reasonPreview: parsed.data.reason,
        });
      },
    }).catch(() => null),
    sendUserNotification({
      userId: user.id,
      telegramText:
        "✅ Ta demande d’annulation a bien été enregistrée. Tu seras informé(e) de la décision par email ou sur ton canal de notification.",
      sendEmail: async () => {
        const to = await getAuthUserEmail(admin, user.id);
        if (!to) return;
        await sendGsBookingCancellationRequestedCustomerEmail(to, {
          listingTitle,
          bookingUrl: `${siteBase}/dashboard/materiel/${b.id}`,
        });
      },
    }).catch(() => null),
  ]);

  revalidatePath("/dashboard/materiel");
  revalidatePath(`/dashboard/materiel/${booking.id}`);
  revalidatePath("/proprietaire/commandes");
  revalidatePath(`/proprietaire/commandes/${booking.id}`);
  revalidatePath("/admin/materiel-annulations");
  return { ok: true };
}

async function cancelDepositHoldIfAny(
  stripe: ReturnType<typeof getStripe>,
  depositPaymentIntentId: string | null,
  depositHoldStatus: string | null,
): Promise<void> {
  if (!depositPaymentIntentId || depositHoldStatus !== "authorized") return;
  try {
    await stripe.paymentIntents.cancel(depositPaymentIntentId);
  } catch (e) {
    console.error("[gs-booking-cancel] deposit PI cancel", e);
  }
}

export async function decideGsBookingCancellationRequest(
  _prev: GsCancellationActionState,
  formData: FormData,
): Promise<GsCancellationActionState> {
  const parsed = decideSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    adminNote: formData.get("adminNote") || undefined,
    partialRefundEur: formData.get("partialRefundEur") || undefined,
  });
  if (!parsed.success) {
    return { error: "Données de décision invalides." };
  }

  const { user, supabase } = await getUserOrNull();
  if (!user || !(await isUserAdmin(user, supabase))) {
    return { error: "Accès refusé." };
  }

  const admin = createAdminClient();
  const { data: reqRow } = await admin
    .from("gs_booking_cancellation_requests")
    .select("id, booking_id, customer_id, status, stripe_refund_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  if (!reqRow || (reqRow as { status: string }).status !== "pending") {
    return { error: "Demande introuvable ou déjà traitée." };
  }

  const request = reqRow as {
    id: string;
    booking_id: string;
    customer_id: string;
    status: string;
    stripe_refund_id: string | null;
  };

  if (request.stripe_refund_id) {
    return { error: "Un remboursement Stripe est déjà enregistré pour cette demande." };
  }

  const { data: bookingRaw } = await admin
    .from("gs_bookings")
    .select(
      "id, customer_id, provider_id, listing_id, total_price, checkout_total_eur, payout_status, stripe_payment_intent_id, deposit_payment_intent_id, deposit_hold_status, status",
    )
    .eq("id", request.booking_id)
    .maybeSingle();

  if (!bookingRaw) return { error: "Réservation introuvable." };

  const booking = bookingRaw as {
    id: string;
    customer_id: string;
    provider_id: string;
    listing_id: string;
    total_price: number | string;
    checkout_total_eur?: number | string | null;
    payout_status: string | null;
    stripe_payment_intent_id: string | null;
    deposit_payment_intent_id: string | null;
    deposit_hold_status: string | null;
    status: string;
  };

  const totalCents =
    getCheckoutTotalPaidCents({
      total_price: booking.total_price,
      checkout_total_eur: booking.checkout_total_eur,
    }) ?? 0;
  if (totalCents <= 0) {
    return { error: "Montant encaissé invalide pour cette réservation." };
  }
  const totalEur = totalCents / 100;
  const now = new Date().toISOString();
  const stripe = getStripe();

  const decision = parsed.data.decision as AdminDecisionType;
  let newStatus: GsCancellationRequestRow["status"] = "rejected";
  let refundEur: number | null = null;
  let stripeRefundId: string | null = null;

  if (decision === "reject") {
    newStatus = "rejected";
    const { error } = await admin
      .from("gs_booking_cancellation_requests")
      .update({
        status: newStatus,
        decided_at: now,
        decided_by: user.id,
        admin_note: parsed.data.adminNote ?? null,
        updated_at: now,
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (error) return { error: error.message };

    const { data: listingRowRej } = await admin
      .from("gs_listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();
    const listingTitleRej =
      (listingRowRej as { title?: string } | null)?.title?.trim() || "Annonce matériel";
    const siteBaseRej = siteConfig.url.replace(/\/$/, "");
    await Promise.all([
      sendUserNotification({
        userId: booking.customer_id,
        telegramText: `ℹ️ Ta demande d’annulation pour « ${listingTitleRej} » n’a pas été acceptée.`,
        sendEmail: async () => {
          const to = await getAuthUserEmail(admin, booking.customer_id);
          if (!to) return;
          await sendGsBookingCancellationDecisionEmail(to, {
            listingTitle: listingTitleRej,
            bookingUrl: `${siteBaseRej}/dashboard/materiel/${booking.id}`,
            role: "customer",
            decision: "reject",
            refundEur: null,
          });
        },
      }).catch(() => null),
      sendUserNotification({
        userId: booking.provider_id,
        telegramText: `ℹ️ La demande d’annulation client pour « ${listingTitleRej} » a été refusée par l’administration.`,
        sendEmail: async () => {
          const to = await getAuthUserEmail(admin, booking.provider_id);
          if (!to) return;
          await sendGsBookingCancellationDecisionEmail(to, {
            listingTitle: listingTitleRej,
            bookingUrl: `${siteBaseRej}/proprietaire/materiel/${booking.id}`,
            role: "provider",
            decision: "reject",
            refundEur: null,
          });
        },
      }).catch(() => null),
    ]);

    revalidatePath("/admin/materiel-annulations");
    revalidatePath(`/dashboard/materiel/${booking.id}`);
    revalidatePath(`/proprietaire/commandes/${booking.id}`);
    auditLog({
      action: "decide_gs_booking_cancellation",
      actorUserId: user.id,
      actorRole: "admin",
      targetType: "gs_booking_cancellation_request",
      targetId: request.id,
      subject: `gs_booking_cancellation_request:${request.id}`,
      meta: {
        bookingId: booking.id,
        requestId: request.id,
        decision: "reject",
      },
    });
    return { ok: true };
  }

  if (decision === "approve_no_refund") {
    newStatus = "approved_no_refund";
    refundEur = 0;
  } else if (decision === "approve_full") {
    newStatus = "approved_full_refund";
    refundEur = totalEur;
  } else {
    newStatus = "approved_partial_refund";
    const partial = parsed.data.partialRefundEur;
    if (partial === undefined || partial <= 0) {
      return { error: "Indiquez un montant de remboursement partiel (€)." };
    }
    if (partial >= totalEur) {
      return { error: "Pour un remboursement total, choisissez l’option correspondante." };
    }
    refundEur = Math.round(partial * 100) / 100;
  }

  const refundCents =
    newStatus === "approved_no_refund" ? 0 : Math.round((refundEur ?? 0) * 100);

  if (refundCents > 0) {
    if (booking.payout_status === "paid") {
      return {
        error:
          "Le versement prestataire (Connect) est déjà effectué. Remboursement automatique désactivé — à traiter manuellement (reverse transfer / support Stripe).",
      };
    }
    if (!booking.stripe_payment_intent_id) {
      return { error: "Aucun paiement Stripe sur cette réservation : remboursement impossible." };
    }
    if (refundCents > totalCents) {
      return { error: "Le remboursement dépasse le montant encaissé." };
    }

    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      const received = pi.amount_received ?? pi.amount ?? 0;
      if (refundCents > received) {
        return { error: `Montant remboursable max. : ${(received / 100).toFixed(2)} €.` };
      }

      const refund = await stripe.refunds.create(
        {
          payment_intent: booking.stripe_payment_intent_id,
          ...(refundCents >= received ? {} : { amount: refundCents }),
        },
        { idempotencyKey: `gs-booking-cancel-${request.id}` },
      );
      stripeRefundId = refund.id;
    } catch (e) {
      console.error("[decideGsBookingCancellation] Stripe refund", e);
      return { error: "Échec du remboursement Stripe. Vérifiez le paiement dans Stripe." };
    }

    await cancelDepositHoldIfAny(stripe, booking.deposit_payment_intent_id, booking.deposit_hold_status);

    const { error: payUpdErr } = await admin
      .from("gs_payments")
      .update({
        status: refundCents >= totalCents ? "refunded" : "paid",
        updated_at: now,
      })
      .eq("booking_id", booking.id);

    if (payUpdErr) {
      console.warn("[decideGsBookingCancellation] gs_payments update", payUpdErr.message);
    }
  } else {
    await cancelDepositHoldIfAny(stripe, booking.deposit_payment_intent_id, booking.deposit_hold_status);
  }

  const { error: reqUpdErr } = await admin
    .from("gs_booking_cancellation_requests")
    .update({
      status: newStatus,
      decided_at: now,
      decided_by: user.id,
      admin_note: parsed.data.adminNote ?? null,
      refund_amount_eur: refundEur,
      stripe_refund_id: stripeRefundId,
      updated_at: now,
    })
    .eq("id", request.id)
    .eq("status", "pending");

  if (reqUpdErr) return { error: reqUpdErr.message };

  const { error: bookErr } = await admin
    .from("gs_bookings")
    .update({
      status: "cancelled",
      payout_status: "cancelled",
      updated_at: now,
    })
    .eq("id", booking.id);

  if (bookErr) {
    console.error("[decideGsBookingCancellation] booking update", bookErr);
    return { error: "Demande enregistrée mais mise à jour réservation échouée — vérifier en admin." };
  }

  let decisionKind: GsCancellationDecisionKind = "approve_no_refund";
  if (newStatus === "approved_full_refund") decisionKind = "approve_full";
  else if (newStatus === "approved_partial_refund") decisionKind = "approve_partial";

  const { data: listingRowDec } = await admin
    .from("gs_listings")
    .select("title")
    .eq("id", booking.listing_id)
    .maybeSingle();
  const listingTitleDec =
    (listingRowDec as { title?: string } | null)?.title?.trim() || "Annonce matériel";
  const siteBaseDec = siteConfig.url.replace(/\/$/, "");

  await Promise.all([
    sendUserNotification({
      userId: booking.customer_id,
      telegramText: `📋 Décision sur ton annulation pour « ${listingTitleDec} » : consulte ton email ou ton espace réservation.`,
      sendEmail: async () => {
        const to = await getAuthUserEmail(admin, booking.customer_id);
        if (!to) return;
        await sendGsBookingCancellationDecisionEmail(to, {
          listingTitle: listingTitleDec,
          bookingUrl: `${siteBaseDec}/dashboard/materiel/${booking.id}`,
          role: "customer",
          decision: decisionKind,
          refundEur: refundEur,
        });
      },
    }).catch(() => null),
    sendUserNotification({
      userId: booking.provider_id,
      telegramText: `📋 Annulation traitée pour « ${listingTitleDec} ». Vérifie les détails dans ton espace.`,
      sendEmail: async () => {
        const to = await getAuthUserEmail(admin, booking.provider_id);
        if (!to) return;
        await sendGsBookingCancellationDecisionEmail(to, {
          listingTitle: listingTitleDec,
          bookingUrl: `${siteBaseDec}/proprietaire/materiel/${booking.id}`,
          role: "provider",
          decision: decisionKind,
          refundEur: refundEur,
        });
      },
    }).catch(() => null),
  ]);

  revalidatePath("/admin/materiel-annulations");
  revalidatePath(`/dashboard/materiel/${booking.id}`);
  revalidatePath("/dashboard/materiel");
  revalidatePath(`/proprietaire/commandes/${booking.id}`);
  revalidatePath("/proprietaire/commandes");
  revalidatePath("/proprietaire/materiel");
  auditLog({
    action: "decide_gs_booking_cancellation",
    actorUserId: user.id,
    actorRole: "admin",
    targetType: "gs_booking_cancellation_request",
    targetId: request.id,
    subject: `gs_booking_cancellation_request:${request.id}`,
    meta: {
      bookingId: booking.id,
      requestId: request.id,
      newStatus,
      refundEur,
      stripeRefundId: stripeRefundId ?? null,
    },
  });
  return { ok: true };
}

export type AdminCancellationRow = {
  id: string;
  booking_id: string;
  customer_id: string;
  status: string;
  reason: string;
  requested_at: string;
  decided_at: string | null;
  admin_note: string | null;
  refund_amount_eur: number | null;
  stripe_refund_id: string | null;
  booking: {
    start_date: string;
    end_date: string;
    total_price: number | string;
    checkout_total_eur?: number | string | null;
    status: string;
    stripe_payment_intent_id: string | null;
    check_in_status: string | null;
    check_out_status: string | null;
    incident_status: string | null;
    payout_status: string | null;
    listing_id: string;
  };
  listingTitle: string;
  cancellationPolicy: ReturnType<typeof normalizeCancellationPolicy>;
  policyGuidance: string;
};

/** Données admin : liste des demandes + booking + listing policy */
export async function getGsCancellationRequestsForAdmin(): Promise<AdminCancellationRow[]> {
  const { user, supabase } = await getUserOrNull();
  if (!user || !(await isUserAdmin(user, supabase))) return [];

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("gs_booking_cancellation_requests")
    .select(
      "id, booking_id, customer_id, status, reason, requested_at, decided_at, admin_note, refund_amount_eur, stripe_refund_id",
    )
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("[getGsCancellationRequestsForAdmin]", error);
    return [];
  }

  const list = rows ?? [];
  if (list.length === 0) return [];

  const bookingIds = [...new Set(list.map((r) => (r as { booking_id: string }).booking_id))];
  const { data: bookings } = await admin
    .from("gs_bookings")
    .select(
      "id, start_date, end_date, total_price, checkout_total_eur, status, stripe_payment_intent_id, check_in_status, check_out_status, incident_status, payout_status, listing_id",
    )
    .in("id", bookingIds);

  const bookingMap = new Map<string, AdminCancellationRow["booking"]>();
  for (const b of bookings ?? []) {
    const row = b as AdminCancellationRow["booking"] & { id: string };
    bookingMap.set(row.id, {
      start_date: row.start_date,
      end_date: row.end_date,
      total_price: row.total_price,
      checkout_total_eur: row.checkout_total_eur,
      status: row.status,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      check_in_status: row.check_in_status,
      check_out_status: row.check_out_status,
      incident_status: row.incident_status,
      payout_status: row.payout_status,
      listing_id: row.listing_id,
    });
  }

  const listingIds = [...new Set([...bookingMap.values()].map((b) => b.listing_id))];
  const listingMap = new Map<string, { title: string; cancellation_policy: string | null }>();
  if (listingIds.length > 0) {
    const { data: listings } = await admin
      .from("gs_listings")
      .select("id, title, cancellation_policy")
      .in("id", listingIds);
    for (const l of listings ?? []) {
      const row = l as { id: string; title: string; cancellation_policy: string | null };
      listingMap.set(row.id, { title: row.title, cancellation_policy: row.cancellation_policy });
    }
  }

  const out: AdminCancellationRow[] = [];
  for (const r of list) {
    const row = r as {
      id: string;
      booking_id: string;
      customer_id: string;
      status: string;
      reason: string;
      requested_at: string;
      decided_at: string | null;
      admin_note: string | null;
      refund_amount_eur: number | null;
      stripe_refund_id: string | null;
    };
    const b = bookingMap.get(row.booking_id);
    if (!b) continue;
    const li = listingMap.get(b.listing_id);
    const policy = normalizeCancellationPolicy(li?.cancellation_policy ?? undefined);
    const guidance = adminPolicyGuidanceText(policy, b.start_date, Number(b.total_price));
    out.push({
      ...row,
      booking: b,
      listingTitle: li?.title ?? "—",
      cancellationPolicy: policy,
      policyGuidance: guidance,
    });
  }
  return out;
}
