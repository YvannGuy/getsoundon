import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserNotification } from "@/lib/user-notifications";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: offers } = await admin
    .from("offers")
    .select(
      "id, owner_id, seeker_id, deposit_payment_intent_id, deposit_hold_status, deposit_release_due_at, incident_status"
    )
    .eq("status", "paid")
    .eq("deposit_hold_status", "authorized")
    .lte("deposit_release_due_at", nowIso)
    .limit(100);

  const stripe = getStripe();
  let released = 0;
  let skipped = 0;

  for (const raw of offers ?? []) {
    const row = raw as {
      id: string;
      owner_id: string;
      seeker_id: string;
      deposit_payment_intent_id: string | null;
      incident_status: "none" | "reported" | "under_review" | "resolved" | null;
    };

    const { data: openCase } = await admin
      .from("refund_cases")
      .select("id")
      .eq("offer_id", row.id)
      .eq("case_type", "dispute")
      .eq("status", "open")
      .maybeSingle();
    if (openCase || row.incident_status === "reported" || row.incident_status === "under_review") {
      skipped += 1;
      continue;
    }
    if (!row.deposit_payment_intent_id) {
      skipped += 1;
      continue;
    }

    try {
      await stripe.paymentIntents.cancel(row.deposit_payment_intent_id);
      await admin
        .from("offers")
        .update({
          deposit_hold_status: "released",
          deposit_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      released += 1;
      await sendUserNotification({
        userId: row.seeker_id,
        telegramText: `Caution libérée pour la réservation ${row.id}.`,
        sendEmail: async () => Promise.resolve(),
      });
      await sendUserNotification({
        userId: row.owner_id,
        telegramText: `Caution libérée pour la réservation ${row.id}.`,
        sendEmail: async () => Promise.resolve(),
      });
    } catch {
      skipped += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (offers ?? []).length, released, skipped });
}
