import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabase
      .from("gs_bookings")
      .select("id, listing_id, customer_id, provider_id, start_date, end_date, total_price, deposit_amount, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (role === "provider") {
      dbQuery = dbQuery.eq("provider_id", user.id);
    } else if (role === "customer") {
      dbQuery = dbQuery.eq("customer_id", user.id);
    } else {
      dbQuery = dbQuery.or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`);
    }

    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: "Impossible de recuperer les bookings." }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
