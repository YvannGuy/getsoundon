import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Compteurs non lus messagerie matériel (`gs_messages`).
 * Dépend de la colonne `read_at` : les requêtes utilisent `.is("read_at", null)`.
 * Sans migration `read_at`, PostgREST renvoie une erreur → compteur 0 (voir logs).
 * Nécessite `SUPABASE_SERVICE_ROLE_KEY` + URL (createAdminClient) ; sinon try/catch → 0.
 */
export async function getGsMaterialUnreadTotalCount(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data: bookings, error: bErr } = await admin
      .from("gs_bookings")
      .select("id")
      .or(`customer_id.eq.${userId},provider_id.eq.${userId}`);
    if (bErr) {
      console.error("[gs-material-messages] getGsMaterialUnreadTotalCount gs_bookings", {
        message: bErr.message,
        code: bErr.code,
      });
      return 0;
    }
    if (!bookings?.length) return 0;

    const ids = (bookings as { id: string }[]).map((b) => b.id);
    const { count, error } = await admin
      .from("gs_messages")
      .select("id", { count: "exact", head: true })
      .in("booking_id", ids)
      .neq("sender_id", userId)
      .is("read_at", null);
    if (error) {
      console.error("[gs-material-messages] getGsMaterialUnreadTotalCount gs_messages count", {
        message: error.message,
        code: error.code,
      });
      return 0;
    }
    return count ?? 0;
  } catch (err: unknown) {
    console.error("[gs-material-messages] getGsMaterialUnreadTotalCount exception", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return 0;
  }
}

/** Compteurs non lus par booking (même logique que le total). */
export async function getGsMaterialUnreadByBookingIds(
  userId: string,
  bookingIds: string[]
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (bookingIds.length === 0) return out;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gs_messages")
      .select("booking_id")
      .in("booking_id", bookingIds)
      .neq("sender_id", userId)
      .is("read_at", null);
    if (error) {
      console.error("[gs-material-messages] getGsMaterialUnreadByBookingIds", {
        message: error.message,
        code: error.code,
      });
      return out;
    }
    if (!data) return out;
    for (const row of data as { booking_id: string }[]) {
      const bid = row.booking_id;
      out[bid] = (out[bid] ?? 0) + 1;
    }
    return out;
  } catch (err: unknown) {
    console.error("[gs-material-messages] getGsMaterialUnreadByBookingIds exception", {
      message: err instanceof Error ? err.message : String(err),
    });
    return out;
  }
}

export async function markGsMaterialMessagesRead(
  bookingId: string,
  readerUserId: string
): Promise<{ error: Error | null }> {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("gs_messages")
      .update({ read_at: now })
      .eq("booking_id", bookingId)
      .neq("sender_id", readerUserId)
      .is("read_at", null);
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("mark read failed") };
  }
}
