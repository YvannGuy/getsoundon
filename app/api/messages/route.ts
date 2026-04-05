import { NextResponse } from "next/server";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { getAuthUserEmail } from "@/lib/auth-user-email";
import { sendGsBookingThreadMessageEmail } from "@/lib/email";
import { rateLimitByKey, rateLimitByRequest } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendUserNotification } from "@/lib/user-notifications";

const sendMessageSchema = z.object({
  bookingId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

const querySchema = z.object({
  bookingId: z.string().uuid(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

type BookingParticipants = {
  customer_id: string;
  provider_id: string;
} | null;

async function getBookingParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string
): Promise<BookingParticipants> {
  const { data: booking, error } = await supabase
    .from("gs_bookings")
    .select("id, customer_id, provider_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return null;
  return booking as { customer_id: string; provider_id: string };
}

export async function GET(request: Request) {
  try {
    const ipLimited = await rateLimitByRequest(request, {
      limiterPrefix: "api-messages-get-ip",
      max: 200,
    });
    if (ipLimited) return ipLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const userLimited = await rateLimitByKey(user.id, {
      limiterPrefix: "api-messages-get-user",
      max: 120,
    });
    if (userLimited) return userLimited;

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.parse({
      bookingId: searchParams.get("bookingId"),
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const participants = await getBookingParticipants(supabase, parsedQuery.bookingId);
    if (!participants || (participants.customer_id !== user.id && participants.provider_id !== user.id)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const limit = parsedQuery.limit ?? 50;
    let dbQuery = supabase
      .from("gs_messages")
      .select("id, booking_id, sender_id, content, created_at, updated_at, read_at")
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

    // Enrichir avec les noms des participants
    const senderIds = [...new Set(ordered.map((m) => (m as { sender_id: string }).sender_id))];
    const nameMap: Record<string, string> = {};

    if (senderIds.length > 0) {
      const admin = createAdminClient();
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);

      for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
        nameMap[p.id] = p.full_name ?? "Utilisateur";
      }
    }

    const enriched = ordered.map((m) => {
      const msg = m as {
        id: string;
        booking_id: string;
        sender_id: string;
        content: string;
        created_at: string;
        updated_at: string;
        read_at: string | null;
      };
      return {
        ...msg,
        sender_name: nameMap[msg.sender_id] ?? "Utilisateur",
        is_me: msg.sender_id === user.id,
      };
    });

    const nextCursor = ordered.length > 0 ? (ordered[0] as { created_at: string }).created_at : null;
    return NextResponse.json({ data: enriched, nextCursor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parametres invalides.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ipLimited = await rateLimitByRequest(request, {
      limiterPrefix: "api-messages-post-ip",
      max: 90,
    });
    if (ipLimited) return ipLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const userLimited = await rateLimitByKey(user.id, {
      limiterPrefix: "api-messages-post-user",
      max: 30,
    });
    if (userLimited) return userLimited;

    const payload = sendMessageSchema.parse(await request.json());
    const participants = await getBookingParticipants(supabase, payload.bookingId);
    if (!participants || (participants.customer_id !== user.id && participants.provider_id !== user.id)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("gs_messages")
      .insert({
        booking_id: payload.bookingId,
        sender_id: user.id,
        content: payload.content,
      })
      .select("id, booking_id, sender_id, content, created_at, updated_at, read_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Envoi du message impossible." }, { status: 400 });
    }

    // Notifier l'autre participant (fire-and-forget)
    const recipientId =
      participants.customer_id === user.id ? participants.provider_id : participants.customer_id;

    const preview = payload.content.length > 80 ? payload.content.slice(0, 80) + "…" : payload.content;

    const admin = createAdminClient();
    const { data: bookingRow } = await admin
      .from("gs_bookings")
      .select("listing_id")
      .eq("id", payload.bookingId)
      .maybeSingle();
    const lid = (bookingRow as { listing_id?: string } | null)?.listing_id;
    let listingTitle = "Réservation matériel";
    if (lid) {
      const { data: li } = await admin.from("gs_listings").select("title").eq("id", lid).maybeSingle();
      const t = (li as { title?: string } | null)?.title?.trim();
      if (t) listingTitle = t;
    }
    const siteBase = siteConfig.url.replace(/\/$/, "");
    const bookingUrl =
      recipientId === participants.customer_id
        ? `${siteBase}/dashboard/materiel/${payload.bookingId}`
        : `${siteBase}/proprietaire/materiel/${payload.bookingId}`;

    sendUserNotification({
      userId: recipientId,
      telegramText: `💬 Nouveau message concernant ta location matériel :\n« ${preview} »`,
      sendEmail: async () => {
        const to = await getAuthUserEmail(admin, recipientId);
        if (!to) return;
        await sendGsBookingThreadMessageEmail(to, {
          listingTitle,
          preview: payload.content,
          bookingUrl,
        });
      },
    }).catch(() => null);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
