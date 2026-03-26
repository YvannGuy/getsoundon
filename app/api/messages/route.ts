import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const sendMessageSchema = z.object({
  bookingId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

const querySchema = z.object({
  bookingId: z.string().uuid(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

async function ensureBookingParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  userId: string
) {
  const { data: booking, error } = await supabase
    .from("gs_bookings")
    .select("id, customer_id, provider_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return false;
  const b = booking as { customer_id: string; provider_id: string };
  return b.customer_id === userId || b.provider_id === userId;
}

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
    const parsedQuery = querySchema.parse({
      bookingId: searchParams.get("bookingId"),
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const isParticipant = await ensureBookingParticipant(supabase, parsedQuery.bookingId, user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const limit = parsedQuery.limit ?? 50;
    let dbQuery = supabase
      .from("gs_messages")
      .select("id, booking_id, sender_id, content, created_at, updated_at")
      .eq("booking_id", parsedQuery.bookingId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (parsedQuery.cursor) {
      dbQuery = dbQuery.lt("created_at", parsedQuery.cursor);
    }

    const { data, error } = await dbQuery;
    if (error) {
      return NextResponse.json({ error: "Impossible de recuperer les messages." }, { status: 500 });
    }

    const ordered = [...(data ?? [])].reverse();
    const nextCursor = ordered.length > 0 ? ordered[0]?.created_at : null;
    return NextResponse.json({ data: ordered, nextCursor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parametres invalides.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
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

    const payload = sendMessageSchema.parse(await request.json());
    const isParticipant = await ensureBookingParticipant(supabase, payload.bookingId, user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("gs_messages")
      .insert({
        booking_id: payload.bookingId,
        sender_id: user.id,
        content: payload.content,
      })
      .select("id, booking_id, sender_id, content, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Envoi du message impossible." }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
