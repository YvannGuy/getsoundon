import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserNotification } from "@/lib/user-notifications";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${secret}`;
}

function hoursUntil(target: Date, now: Date): number {
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, owner_id, seeker_id, date_debut")
    .eq("status", "paid")
    .not("date_debut", "is", null)
    .limit(300);

  const now = new Date();
  let sent = 0;
  for (const raw of offers ?? []) {
    const row = raw as {
      id: string;
      owner_id: string;
      seeker_id: string;
      date_debut: string;
    };
    const visitDate = new Date(`${row.date_debut}T10:00:00.000Z`);
    if (Number.isNaN(visitDate.getTime())) continue;
    const diff = hoursUntil(visitDate, now);

    const inWindowJ1 = diff >= 23 && diff <= 25;
    const inWindowOwnerH4 = diff >= 3.5 && diff <= 4.5;
    const inWindowSeekerH1 = diff >= 0.5 && diff <= 1.5;
    if (!inWindowJ1 && !inWindowOwnerH4 && !inWindowSeekerH1) continue;

    if (inWindowJ1) {
      await sendUserNotification({
        userId: row.owner_id,
        telegramText: `Rappel J-1: réservation ${row.id} demain.`,
        sendEmail: async () => Promise.resolve(),
      });
      await sendUserNotification({
        userId: row.seeker_id,
        telegramText: `Rappel J-1: votre réservation ${row.id} est prévue demain.`,
        sendEmail: async () => Promise.resolve(),
      });
      sent += 2;
    }
    if (inWindowOwnerH4) {
      await sendUserNotification({
        userId: row.owner_id,
        telegramText: `Rappel H-4: réservation ${row.id} dans 4h.`,
        sendEmail: async () => Promise.resolve(),
      });
      sent += 1;
    }
    if (inWindowSeekerH1) {
      await sendUserNotification({
        userId: row.seeker_id,
        telegramText: `Rappel H-1: réservation ${row.id} dans 1h.`,
        sendEmail: async () => Promise.resolve(),
      });
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, scanned: (offers ?? []).length, sent });
}
