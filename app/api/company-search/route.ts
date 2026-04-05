import { NextResponse } from "next/server";

import { searchCompany } from "@/lib/company/company.service";
import { rateLimitByRequest } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ipLimited = await rateLimitByRequest(req, {
    limiterPrefix: "api-company-search-ip",
    max: 45,
  });
  if (ipLimited) return ipLimited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = parseInt(searchParams.get("limit") ?? "8", 10);

  if (!q) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }
  if (q.length < 2) {
    return NextResponse.json({ error: "query_too_short" }, { status: 400 });
  }

  try {
    const result = await searchCompany({ q, limit: Number.isFinite(limit) && limit > 0 ? limit : 8 });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "search_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
