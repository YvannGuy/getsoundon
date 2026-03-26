import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createBookingSchema = z.object({
  listingId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  depositAmount: z.number().nonnegative().optional(),
});

function daysBetween(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export async function POST(request: Request) {
  try {
    const payload = createBookingSchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { data: customerProfile } = await supabase
      .from("gs_users_profile")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const customerRole = (customerProfile as { role?: string } | null)?.role;
    if (customerRole !== "customer" && customerRole !== "admin") {
      return NextResponse.json({ error: "Role customer requis." }, { status: 403 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("gs_listings")
      .select("id, owner_id, price_per_day, is_active")
      .eq("id", payload.listingId)
      .maybeSingle();

    if (listingError) {
      return NextResponse.json({ error: "Impossible de verifier le listing." }, { status: 500 });
    }
    if (!listing || !(listing as { is_active?: boolean }).is_active) {
      return NextResponse.json({ error: "Listing introuvable ou inactif." }, { status: 404 });
    }

    const totalDays = daysBetween(payload.startDate, payload.endDate);
    if (totalDays <= 0) {
      return NextResponse.json({ error: "Periode invalide." }, { status: 400 });
    }

    const totalPrice = Number((Number((listing as { price_per_day?: number }).price_per_day ?? 0) * totalDays).toFixed(2));

    const { data, error } = await supabase
      .from("gs_bookings")
      .insert({
        listing_id: payload.listingId,
        customer_id: user.id,
        provider_id: (listing as { owner_id: string }).owner_id,
        start_date: payload.startDate,
        end_date: payload.endDate,
        total_price: totalPrice,
        deposit_amount: Number((payload.depositAmount ?? 0).toFixed(2)),
        status: "pending",
      })
      .select("id, listing_id, customer_id, provider_id, start_date, end_date, total_price, deposit_amount, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Creation de booking impossible." }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
