import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimitByRequest } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const statusSchema = z.object({
  status: z.enum(["accepted", "refused", "cancelled", "completed"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = paramsSchema.parse(await context.params);
    const { status } = statusSchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const tooMany = await rateLimitByRequest(request, {
      limiterPrefix: "api-booking-status-patch",
      max: 40,
      keySuffix: user.id,
    });
    if (tooMany) return tooMany;

    const { data: booking, error: bookingError } = await supabase
      .from("gs_bookings")
      .select("id, customer_id, provider_id, status")
      .eq("id", id)
      .maybeSingle();

    if (bookingError) {
      return NextResponse.json({ error: "Impossible de recuperer ce booking." }, { status: 500 });
    }
    if (!booking) {
      return NextResponse.json({ error: "Booking introuvable." }, { status: 404 });
    }

    const isProvider = (booking as { provider_id: string }).provider_id === user.id;
    const isCustomer = (booking as { customer_id: string }).customer_id === user.id;
    if (!isProvider && !isCustomer) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    if (status === "accepted" || status === "refused" || status === "completed") {
      if (!isProvider) {
        return NextResponse.json({ error: "Seul le provider peut appliquer ce statut." }, { status: 403 });
      }
    }
    if (status === "cancelled") {
      if (!isCustomer && !isProvider) {
        return NextResponse.json({ error: "Seules les parties peuvent annuler." }, { status: 403 });
      }
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gs_bookings")
      .update({ status })
      .eq("id", id)
      .select("id, status, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Mise a jour du statut impossible." }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
