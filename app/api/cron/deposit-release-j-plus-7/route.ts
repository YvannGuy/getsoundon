import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserNotification } from "@/lib/user-notifications";
import { verifyCronRequest } from "@/lib/cron/auth";

/**
 * Lot D — Libération cautions matériel uniquement (bloc legacy `offers` retiré).
 */
export async function POST(request: Request) {
  const authorized = await verifyCronRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const stripe = getStripe();

  const { data: gsBookings } = await admin
    .from("gs_bookings")
    .select("id, customer_id, provider_id, deposit_payment_intent_id, incident_status, deposit_claim_status")
    .eq("deposit_hold_status", "authorized")
    .lte("deposit_release_due_at", nowIso)
    .limit(100);

  let gsReleased = 0;
  let gsSkipped = 0;

  for (const raw of gsBookings ?? []) {
    const gsRow = raw as {
      id: string;
      customer_id: string;
      provider_id: string;
      deposit_payment_intent_id: string | null;
      incident_status: string | null;
      deposit_claim_status: string | null;
    };

    if (gsRow.incident_status === "open") {
      gsSkipped += 1;
      continue;
    }

    if (gsRow.deposit_claim_status && gsRow.deposit_claim_status !== "released_auto") {
      gsSkipped += 1;
      continue;
    }

    if (!gsRow.deposit_payment_intent_id) {
      gsSkipped += 1;
      continue;
    }

    try {
      await stripe.paymentIntents.cancel(gsRow.deposit_payment_intent_id);
      await admin
        .from("gs_bookings")
        .update({
          deposit_hold_status: "released",
          deposit_claim_status: "released_auto",
          deposit_decision_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", gsRow.id);
      gsReleased += 1;
      await sendUserNotification({
        userId: gsRow.customer_id,
        telegramText: `Caution libérée pour ta location matériel (réservation ${gsRow.id}).`,
        sendEmail: async () => Promise.resolve(),
      });
    } catch {
      gsSkipped += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    gs_bookings: { processed: (gsBookings ?? []).length, released: gsReleased, skipped: gsSkipped },
  });
}
