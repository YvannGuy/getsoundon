import type { SupabaseClient } from "@supabase/supabase-js";

import { getGsMaterialUnreadTotalCount } from "@/lib/gs-material-messages";

type BadgeCounts = {
  demandeCount: number;
  visiteCount: number;
  /**
   * Legacy + matériel agrégé (conversations/messages + gs_messages).
   * Réservé aux usages non-UI ; les badges navigation utilisent uniquement `materielUnreadCount`.
   */
  messageCount: number;
  /** Non lus messagerie matériel (gs_messages) — seul compteur messagerie exposé dans les sidebars. */
  materielUnreadCount: number;
  paymentCount: number;
  reservationCount: number;
  edlCount: number;
  cautionCount: number;
  contractCount: number;
};

/** Compteurs à zéro si le calcul des badges échoue (évite de casser les layouts). */
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

/**
 * Messagerie legacy (`messages`) : filtre `.is("read_at", null)` pour les non lus.
 * Si la colonne `read_at` n’existe pas sur `messages`, PostgREST renvoie une erreur → compteur 0.
 */
async function getUnreadMessageCount(
  supabase: SupabaseClient,
  userId: string,
  roleField: "seeker_id" | "owner_id"
): Promise<number> {
  const { data: convs, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq(roleField, userId);
  if (convError || !convs?.length) return 0;

  const convIds = convs.map((c) => c.id);
  const { count, error: msgError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (msgError) {
    console.error("[notification-counts] getUnreadMessageCount supabase error", {
      message: msgError.message,
      code: msgError.code,
      details: msgError.details,
      hint: msgError.hint,
    });
    return 0;
  }
  return count ?? 0;
}

export async function getSeekerBadgeCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCounts> {
  try {
  const [
    { count: demandesCount },
    { count: visitesActionCount },
    legacyMessageUnread,
    materielUnreadCount,
    { count: paymentActionCount },
    { data: paidOffers },
  ] = await Promise.all([
      supabase
        .from("demandes")
        .select("id", { count: "exact", head: true })
        .eq("seeker_id", userId)
        .in("status", ["sent", "viewed"]),
      (async () => {
        try {
          return await supabase
            .from("demandes_visite")
            .select("id", { count: "exact", head: true })
            .eq("seeker_id", userId)
            .in("status", ["pending", "reschedule_proposed"]);
        } catch {
          return { count: 0 };
        }
      })(),
      getUnreadMessageCount(supabase, userId, "seeker_id"),
      getGsMaterialUnreadTotalCount(userId),
      supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("seeker_id", userId)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString()),
      supabase
        .from("offers")
        .select("id, deposit_amount_cents, deposit_hold_status")
        .eq("seeker_id", userId)
        .eq("status", "paid")
        .limit(200),
    ]);

  const messageCount = legacyMessageUnread + materielUnreadCount;

  const paidOfferRows = (paidOffers ?? []) as {
    id: string;
    deposit_amount_cents: number | null;
    deposit_hold_status: string | null;
  }[];
  const paidOfferIds = paidOfferRows.map((o) => o.id);

  let reservationCount = 0;
  let edlCount = 0;

  if (paidOfferIds.length > 0) {
    try {
      const [{ data: edlRows }, { data: caseRows }] = await Promise.all([
        supabase
          .from("etat_des_lieux")
          .select("offer_id, role, phase")
          .in("offer_id", paidOfferIds),
        supabase
          .from("refund_cases")
          .select("offer_id, case_type, status")
          .in("offer_id", paidOfferIds),
      ]);

      const edlSet = new Set(
        (edlRows ?? []).map(
          (r) =>
            `${(r as { offer_id: string; role: "owner" | "seeker"; phase: "before" | "after" }).offer_id}:${
              (r as { offer_id: string; role: "owner" | "seeker"; phase: "before" | "after" }).role
            }:${(r as { offer_id: string; role: "owner" | "seeker"; phase: "before" | "after" }).phase}`
        )
      );
      const openDisputeOffers = new Set(
        (caseRows ?? [])
          .filter(
            (c) =>
              (c as { case_type: "refund_full" | "refund_partial" | "dispute"; status: "open" | "resolved" | "rejected" })
                .case_type === "dispute" &&
              (c as { case_type: "refund_full" | "refund_partial" | "dispute"; status: "open" | "resolved" | "rejected" })
                .status === "open"
          )
          .map((c) => (c as { offer_id: string | null }).offer_id)
      );

      reservationCount = paidOfferIds.filter((offerId) => {
        const beforeDone = edlSet.has(`${offerId}:seeker:before`);
        const afterDone = edlSet.has(`${offerId}:seeker:after`);
        const edlIncomplete = !beforeDone || !afterDone;
        const litigeOuvert = openDisputeOffers.has(offerId);
        return edlIncomplete || litigeOuvert;
      }).length;

      edlCount = paidOfferIds.filter((offerId) => {
        const beforeDone = edlSet.has(`${offerId}:seeker:before`);
        const afterDone = edlSet.has(`${offerId}:seeker:after`);
        return !beforeDone || !afterDone;
      }).length;
    } catch {
      reservationCount = 0;
      edlCount = 0;
    }
  }

  const cautionCount = paidOfferRows.filter(
    (o) => (o.deposit_amount_cents ?? 0) > 0 && o.deposit_hold_status === "claim_requested"
  ).length;

  return {
    demandeCount: (demandesCount ?? 0) + (visitesActionCount ?? 0),
    visiteCount: 0,
    messageCount,
    materielUnreadCount,
    paymentCount: paymentActionCount ?? 0,
    reservationCount,
    edlCount,
    cautionCount,
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
  const [{ data: mySalles }, { data: profile }, { data: paidOffers }] = await Promise.all([
    supabase
      .from("salles")
      .select("id")
      .eq("owner_id", userId),
    supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("offers")
      .select("id, deposit_hold_status")
      .eq("owner_id", userId)
      .eq("status", "paid")
      .limit(200),
  ]);
  const salleIds = (mySalles ?? []).map((s) => s.id);
  const paidOfferIds = ((paidOffers ?? []) as { id: string; deposit_hold_status: string | null }[]).map((o) => o.id);
  const cautionCount = ((paidOffers ?? []) as { id: string; deposit_hold_status: string | null }[]).filter(
    (o) => o.deposit_hold_status === "claim_requested"
  ).length;

  let demandeCount = 0;
  if (salleIds.length > 0) {
    try {
      const { count } = await supabase
        .from("demandes")
        .select("id", { count: "exact", head: true })
        .in("salle_id", salleIds)
        .in("status", ["sent", "viewed"]);
      demandeCount = count ?? 0;
    } catch {
      demandeCount = 0;
    }
  }

  let visiteCount = 0;
  if (salleIds.length > 0) {
    try {
      const { count } = await supabase
        .from("demandes_visite")
        .select("id", { count: "exact", head: true })
        .in("salle_id", salleIds)
        .eq("status", "pending");
      visiteCount = count ?? 0;
    } catch {
      visiteCount = 0;
    }
  }

  const [legacyMessageUnread, materielUnreadCount] = await Promise.all([
    getUnreadMessageCount(supabase, userId, "owner_id"),
    getGsMaterialUnreadTotalCount(userId),
  ]);
  const messageCount = legacyMessageUnread + materielUnreadCount;
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
      // Compat migration: si la colonne n'existe pas encore, on garde 0.
      contractCount = 0;
    }
  }
  const hasStripeAccount = !!(profile as { stripe_account_id?: string | null } | null)?.stripe_account_id;
  const paymentCount = salleIds.length > 0 && !hasStripeAccount ? 1 : 0;
  let reservationCount = 0;
  let edlCount = 0;

  if (paidOfferIds.length > 0) {
    try {
      const [{ data: edlRows }, { data: caseRows }] = await Promise.all([
        supabase
          .from("etat_des_lieux")
          .select("offer_id, role, phase")
          .in("offer_id", paidOfferIds),
        supabase
          .from("refund_cases")
          .select("offer_id, case_type, status")
          .in("offer_id", paidOfferIds),
      ]);

      const edlSet = new Set(
        (edlRows ?? []).map(
          (r) =>
            `${(r as { offer_id: string; role: "owner" | "seeker"; phase: "before" | "after" }).offer_id}:${
              (r as { offer_id: string; role: "owner" | "seeker"; phase: "before" | "after" }).role
            }:${(r as { offer_id: string; role: "owner" | "seeker"; phase: "before" | "after" }).phase}`
        )
      );
      const openDisputeOffers = new Set(
        (caseRows ?? [])
          .filter(
            (c) =>
              (c as { case_type: "refund_full" | "refund_partial" | "dispute"; status: "open" | "resolved" | "rejected" })
                .case_type === "dispute" &&
              (c as { case_type: "refund_full" | "refund_partial" | "dispute"; status: "open" | "resolved" | "rejected" })
                .status === "open"
          )
          .map((c) => (c as { offer_id: string | null }).offer_id)
      );

      reservationCount = (paidOffers ?? []).filter((offer) => {
        const offerId = (offer as { id: string }).id;
        const beforeDone = edlSet.has(`${offerId}:owner:before`);
        const afterDone = edlSet.has(`${offerId}:owner:after`);
        const edlIncomplete = !beforeDone || !afterDone;
        const litigeOuvert = openDisputeOffers.has(offerId);
        const cautionAArbitrer = (offer as { deposit_hold_status: string | null }).deposit_hold_status === "claim_requested";
        return edlIncomplete || litigeOuvert || cautionAArbitrer;
      }).length;

      edlCount = paidOfferIds.filter((offerId) => {
        const beforeDone = edlSet.has(`${offerId}:owner:before`);
        const afterDone = edlSet.has(`${offerId}:owner:after`);
        return !beforeDone || !afterDone;
      }).length;
    } catch {
      reservationCount = 0;
      edlCount = 0;
    }
  }

  return {
    demandeCount,
    visiteCount,
    messageCount,
    materielUnreadCount,
    paymentCount,
    reservationCount,
    edlCount,
    cautionCount,
    contractCount,
  };
  } catch (err: unknown) {
    logBadgeFailure("getOwnerBadgeCounts", err);
    return { ...EMPTY_BADGE_COUNTS };
  }
}
