import { NextResponse } from "next/server";

import { generateInvoicesForCompletedBookings } from "@/app/actions/generate-invoices";

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
