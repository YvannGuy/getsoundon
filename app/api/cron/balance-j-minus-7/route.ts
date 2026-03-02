import { NextResponse } from "next/server";

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/stripe/process-balance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_BALANCE_CRON_SECRET ?? ""}`,
    },
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, source: "process-balance", payload }, { status: res.status });
}
