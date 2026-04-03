import type { SupabaseClient } from "@supabase/supabase-js";

import { getGsMaterialUnreadTotalCount } from "@/lib/gs-material-messages";

/** Compteurs badges nav — flux matériel `gs_*` uniquement (legacy offres / messagerie retirés). */
export type BadgeCounts = {
  demandeCount: number;
  visiteCount: number;
  messageCount: number;
  materielUnreadCount: number;
  paymentCount: number;
  reservationCount: number;
  edlCount: number;
  cautionCount: number;
  contractCount: number;
};

export const EMPTY_BADGE_COUNTS: BadgeCounts = {
  demandeCount: 0,
  visiteCount: 0,
  messageCount: 0,
  materielUnreadCount: 0,
  paymentCount: 0,
  reservationCount: 0,
  edlCount: 0,
  cautionCount: 0,
  contractCount: 0,
};

function logBadgeFailure(fn: string, err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`[notification-counts] ${fn} failed`, {
    message: e.message,
    name: e.name,
    stack: e.stack,
  });
}

export async function getSeekerBadgeCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCounts> {
  try {
    const materielUnreadCount = await getGsMaterialUnreadTotalCount(userId);
    return {
      demandeCount: 0,
      visiteCount: 0,
      messageCount: materielUnreadCount,
      materielUnreadCount,
      paymentCount: 0,
      reservationCount: 0,
      edlCount: 0,
      cautionCount: 0,
      contractCount: 0,
    };
  } catch (err: unknown) {
    logBadgeFailure("getSeekerBadgeCounts", err);
    return { ...EMPTY_BADGE_COUNTS };
  }
}

export async function getOwnerBadgeCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCounts> {
  try {
    const [{ data: mySalles }, { data: profile }, materielUnreadCount] = await Promise.all([
      supabase.from("salles").select("id").eq("owner_id", userId),
      supabase.from("profiles").select("stripe_account_id").eq("id", userId).maybeSingle(),
      getGsMaterialUnreadTotalCount(userId),
    ]);

    const salleIds = (mySalles ?? []).map((s) => s.id);
    let contractCount = 0;
    if (salleIds.length > 0) {
      try {
        const { count } = await supabase
          .from("salles")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", userId)
          .eq("has_contract_template", false);
        contractCount = count ?? 0;
      } catch {
        contractCount = 0;
      }
    }
    const hasStripeAccount = !!(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;
    const paymentCount = salleIds.length > 0 && !hasStripeAccount ? 1 : 0;

    return {
      demandeCount: 0,
      visiteCount: 0,
      messageCount: materielUnreadCount,
      materielUnreadCount,
      paymentCount,
      reservationCount: 0,
      edlCount: 0,
      cautionCount: 0,
      contractCount,
    };
  } catch (err: unknown) {
    logBadgeFailure("getOwnerBadgeCounts", err);
    return { ...EMPTY_BADGE_COUNTS };
  }
}
