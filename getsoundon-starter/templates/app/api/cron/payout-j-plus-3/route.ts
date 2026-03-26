import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const stripe = getStripe();
  const nowIso = new Date().toISOString();

  const { data: offers } = await admin
    .from("rental_offers")
    .select(
      "id, owner_id, seeker_id, amount_cents, payment_plan_status, owner_payout_due_at, owner_payout_status, incident_status"
    )
    .eq("status", "paid")
    .in("owner_payout_status", ["pending", "scheduled", "blocked"])
    .lte("owner_payout_due_at", nowIso)
    .limit(100);

  let paid = 0;
  let blocked = 0;
  let skipped = 0;

  for (const raw of offers ?? []) {
    const row = raw as {
      id: string;
      owner_id: string;
      seeker_id: string;
      amount_cents: number | null;
      payment_plan_status: string | null;
      owner_payout_status: string | null;
      incident_status: "none" | "reported" | "under_review" | "resolved" | null;
    };

    if (row.incident_status === "reported" || row.incident_status === "under_review") {
      blocked += 1;
      await admin
        .from("rental_offers")
        .update({ owner_payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    if (row.payment_plan_status !== "fully_paid") {
      skipped += 1;
      continue;
    }

    const payoutAmountCents = Math.max(0, row.amount_cents ?? 0);
    if (payoutAmountCents <= 0) {
      blocked += 1;
      await admin
        .from("rental_offers")
        .update({ owner_payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", row.owner_id)
      .single();
    const stripeAccountId =
      (ownerProfile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      blocked += 1;
      await admin
        .from("rental_offers")
        .update({ owner_payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    try {
      await stripe.transfers.create(
        {
          amount: payoutAmountCents,
          currency: "eur",
          destination: stripeAccountId,
          metadata: {
            offer_id: row.id,
            owner_id: row.owner_id,
            seeker_id: row.seeker_id,
            source: "cron_j_plus_3",
          },
          description: `Versement provider J+3 offre ${row.id}`,
        },
        { idempotencyKey: `payout-j-plus-3-${row.id}` }
      );

      await admin
        .from("rental_offers")
        .update({ owner_payout_status: "paid", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      paid += 1;
    } catch (error) {
      console.error("[getsoundon payout-j+3] transfer error", row.id, error);
      blocked += 1;
      await admin
        .from("rental_offers")
        .update({ owner_payout_status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ ok: true, processed: (offers ?? []).length, paid, blocked, skipped });
}
