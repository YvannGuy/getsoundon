import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type BadgeCounts = {
  demandeCount: number;
  visiteCount: number;
  messageCount: number;
  paymentCount: number;
  reservationCount: number;
  edlCount: number;
  cautionCount: number;
  contractCount: number;
};

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

  if (msgError) return 0;
  return count ?? 0;
}

export async function getSeekerBadgeCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCounts> {
  const [{ count: demandesCount }, { count: visitesActionCount }, messageCount, { count: paymentActionCount }, { data: paidOffers }] =
    await Promise.all([
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
    paymentCount: paymentActionCount ?? 0,
    reservationCount,
    edlCount,
    cautionCount,
    contractCount: 0,
  };
}

async function ownerMissingContractCount(salleIds: string[]): Promise<number> {
  if (salleIds.length === 0) return 0;
  const admin = createAdminClient();
  let missing = 0;
  for (const salleId of salleIds) {
    const { error } = await admin.storage
      .from("contrats")
      .download(`salles/${salleId}/modele.pdf`);
    if (error) missing += 1;
  }
  return missing;
}

export async function getOwnerBadgeCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCounts> {
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

  const messageCount = await getUnreadMessageCount(supabase, userId, "owner_id");
  const contractCount = await ownerMissingContractCount(salleIds);
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
    demandeCount: 0,
    visiteCount,
    messageCount,
    paymentCount,
    reservationCount,
    edlCount,
    cautionCount,
    contractCount,
  };
}
