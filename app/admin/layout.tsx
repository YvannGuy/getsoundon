import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/dashboard/admin-header";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await getUserOrNull();

  if (!user) {
    redirect("/auth/admin");
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminByProfile = profile?.user_type === "admin";

  if (!isAdminByEnv && !isAdminByProfile) {
    redirect("/auth/admin");
  }

  const badgeCounts = {
    pendingAnnonces: 0,
    signalements: 0,
    demandesVisite: 0,
    reservations: 0,
    utilisateurs: 0,
    paiements: 0,
    cautions: 0,
    etatsDesLieux: 0,
    litiges: 0,
  };

  try {
    const admin = createAdminClient();
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: pendingAnnoncesCount },
      { count: demandesPendingCount },
      { count: newUsersCount },
      { count: newPaymentsCount },
      { count: cautionsCount },
      { data: paidOffers },
    ] = await Promise.all([
      admin.from("salles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin
        .from("demandes_visite")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "reschedule_proposed"]),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso),
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .in("status", ["paid", "active"])
        .gte("created_at", sevenDaysAgoIso),
      admin
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("deposit_hold_status", "claim_requested"),
      admin
        .from("offers")
        .select("id, deposit_hold_status")
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    badgeCounts.pendingAnnonces = pendingAnnoncesCount ?? 0;
    badgeCounts.demandesVisite = demandesPendingCount ?? 0;
    badgeCounts.utilisateurs = newUsersCount ?? 0;
    badgeCounts.paiements = newPaymentsCount ?? 0;
    badgeCounts.cautions = cautionsCount ?? 0;

    try {
      const { count } = await admin
        .from("salles_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      badgeCounts.signalements = count ?? 0;
    } catch {
      // Table salles_reports peut ne pas exister
    }

    const paidOfferRows = (paidOffers ?? []) as { id: string; deposit_hold_status: string | null }[];
    const paidOfferIds = paidOfferRows.map((o) => o.id);

    if (paidOfferIds.length > 0) {
      try {
        const [{ data: edlRows }, { data: caseRows }] = await Promise.all([
          admin.from("etat_des_lieux").select("offer_id, role, phase").in("offer_id", paidOfferIds),
          admin.from("refund_cases").select("offer_id, case_type, status").in("offer_id", paidOfferIds),
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

        badgeCounts.reservations = paidOfferRows.filter((offer) => {
          const offerId = offer.id;
          const ownerBefore = edlSet.has(`${offerId}:owner:before`);
          const ownerAfter = edlSet.has(`${offerId}:owner:after`);
          const seekerBefore = edlSet.has(`${offerId}:seeker:before`);
          const seekerAfter = edlSet.has(`${offerId}:seeker:after`);
          const edlIncomplete = !ownerBefore || !ownerAfter || !seekerBefore || !seekerAfter;
          const litigeOuvert = openDisputeOffers.has(offerId);
          const cautionAArbitrer = offer.deposit_hold_status === "claim_requested";
          return edlIncomplete || litigeOuvert || cautionAArbitrer;
        }).length;

        badgeCounts.etatsDesLieux = paidOfferRows.filter((offer) => {
          const offerId = offer.id;
          const ownerBefore = edlSet.has(`${offerId}:owner:before`);
          const ownerAfter = edlSet.has(`${offerId}:owner:after`);
          const seekerBefore = edlSet.has(`${offerId}:seeker:before`);
          const seekerAfter = edlSet.has(`${offerId}:seeker:after`);
          return !ownerBefore || !ownerAfter || !seekerBefore || !seekerAfter;
        }).length;

        badgeCounts.litiges = (caseRows ?? []).filter(
          (c) =>
            (c as { case_type: "refund_full" | "refund_partial" | "dispute"; status: "open" | "resolved" | "rejected" })
              .case_type === "dispute" &&
            (c as { case_type: "refund_full" | "refund_partial" | "dispute"; status: "open" | "resolved" | "rejected" })
              .status === "open"
        ).length;
      } catch {
        // Tables EDL/refund_cases peuvent ne pas exister
      }
    }

  } catch {
    // Ignore if admin client fails (e.g. missing SUPABASE_SERVICE_ROLE_KEY)
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar badgeCounts={badgeCounts} userEmail={user.email} />
      <div className="flex flex-1 flex-col overflow-auto">
        <AdminHeader />
        <main className="flex-1 pl-14 lg:pl-0">{children}</main>
      </div>
    </div>
  );
}
