import { NextResponse } from "next/server";

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
    .select("id, owner_id, seeker_id, owner_payout_due_at, owner_payout_status, incident_status, no_show_reported_by")
    .eq("status", "paid")
    .in("owner_payout_status", ["pending", "scheduled", "blocked"])
    .lte("owner_payout_due_at", nowIso)
    .limit(100);

  let paid = 0;
  let blocked = 0;
  for (const raw of offers ?? []) {
    const row = raw as {
      id: string;
      owner_id: string;
      seeker_id: string;
      owner_payout_status: string | null;
      incident_status: "none" | "reported" | "under_review" | "resolved" | null;
      no_show_reported_by: "none" | "owner" | "seeker" | null;
    };
    const hasBlockingIncident =
      row.incident_status === "reported" || row.incident_status === "under_review";
    const isNoShowSeeker = row.no_show_reported_by === "owner";
    const nextStatus = hasBlockingIncident ? "blocked" : "paid";
    await admin
      .from("offers")
      .update({ owner_payout_status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (nextStatus === "paid") {
      paid += 1;
      await sendUserNotification({
        userId: row.owner_id,
        telegramText: `Versement confirmé pour la réservation ${row.id}.`,
        sendEmail: async () => Promise.resolve(),
      });
      if (!isNoShowSeeker) {
        await sendUserNotification({
          userId: row.seeker_id,
          telegramText: `Votre paiement a été versé au propriétaire pour la réservation ${row.id}.`,
          sendEmail: async () => Promise.resolve(),
        });
      }
    } else {
      blocked += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (offers ?? []).length, paid, blocked });
}
