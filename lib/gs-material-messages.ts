import { createAdminClient } from "@/lib/supabase/admin";

/** Messages reçus (sender ≠ user) encore sans read_at, pour les réservations où user est participant. */
export async function getGsMaterialUnreadTotalCount(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data: bookings, error: bErr } = await admin
      .from("gs_bookings")
      .select("id")
      .or(`customer_id.eq.${userId},provider_id.eq.${userId}`);
    if (bErr || !bookings?.length) return 0;

    const ids = (bookings as { id: string }[]).map((b) => b.id);
    const { count, error } = await admin
      .from("gs_messages")
      .select("id", { count: "exact", head: true })
      .in("booking_id", ids)
      .neq("sender_id", userId)
      .is("read_at", null);
    if (error) return 0;
    return count ?? 0;
  } catch {
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
    if (error || !data) return out;
    for (const row of data as { booking_id: string }[]) {
      const bid = row.booking_id;
      out[bid] = (out[bid] ?? 0) + 1;
    }
    return out;
  } catch {
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
