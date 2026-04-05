import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimitByKey } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { markGsMaterialMessagesRead } from "@/lib/gs-material-messages";

const bodySchema = z.object({
  bookingId: z.string().uuid(),
});

async function getBookingParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string
): Promise<{ customer_id: string; provider_id: string } | null> {
  const { data: booking, error } = await supabase
    .from("gs_bookings")
    .select("id, customer_id, provider_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) return null;
  return booking as { customer_id: string; provider_id: string };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const tooMany = await rateLimitByKey(user.id, {
      limiterPrefix: "api-messages-read-user",
      max: 45,
    });
    if (tooMany) return tooMany;

    const payload = bodySchema.parse(await request.json());
    const participants = await getBookingParticipants(supabase, payload.bookingId);
    if (
      !participants ||
      (participants.customer_id !== user.id && participants.provider_id !== user.id)
    ) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const { error } = await markGsMaterialMessagesRead(payload.bookingId, user.id);
    if (error) {
      return NextResponse.json({ error: "Impossible de marquer les messages comme lus." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
