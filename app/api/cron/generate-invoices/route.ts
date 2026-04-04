import { NextResponse } from "next/server";

import { generateInvoicesForCompletedBookings } from "@/app/actions/generate-invoices";
import { verifyCronRequest } from "@/lib/cron/auth";

export async function POST(request: Request) {
  const authorized = await verifyCronRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { generated, skipped, scanned } = await generateInvoicesForCompletedBookings();
    return NextResponse.json({
      ok: true,
      scanned,
      generated,
      skipped,
    });
  } catch (error) {
    console.error("[cron] generate-invoices error", error);
    return NextResponse.json({ ok: false, error: "generate-invoices failed" }, { status: 500 });
  }
}
