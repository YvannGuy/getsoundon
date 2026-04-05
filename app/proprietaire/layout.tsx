import type { Metadata } from "next";

import { OwnerSidebar } from "@/components/dashboard/owner-sidebar";
import { assertProprietaireAreaOrRedirect } from "@/lib/auth/guards";
import { EMPTY_BADGE_COUNTS, getOwnerBadgeCounts } from "@/lib/notification-counts";

export const metadata: Metadata = {
  title: "Tableau de bord | GetSoundOn",
  robots: { index: false, follow: false },
};
/** Rafraîchit les compteurs de badges à chaque requête (pas de cache layout). */
export const dynamic = "force-dynamic";

export default async function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase, profile } = await assertProprietaireAreaOrRedirect();

  const displayName =
    profile?.full_name?.trim() ||
    profile?.first_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    "Utilisateur";
  let materielUnreadCount: number;
  let paymentCount: number;
  let contractCount: number;
  // Compteurs badges
  let reservationPending = 0;
  let reservationAccepted = 0;
  let reservationRefused = 0;
  let listingOnline = 0;
  let listingPending = 0;
  let listingExpired = 0;

  try {
    const c = await getOwnerBadgeCounts(supabase, user.id);
    materielUnreadCount = c.materielUnreadCount;
    paymentCount = c.paymentCount;
    contractCount = c.contractCount;
  } catch (err: unknown) {
    console.error("[layout] app/proprietaire/layout.tsx getOwnerBadgeCounts outer catch", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    materielUnreadCount = EMPTY_BADGE_COUNTS.materielUnreadCount;
    paymentCount = EMPTY_BADGE_COUNTS.paymentCount;
    contractCount = EMPTY_BADGE_COUNTS.contractCount;
  }

  try {
    const [
      { count: pendingCount },
      { count: acceptedCount },
      { count: refusedCount },
      { count: onlineCount },
      { count: pendingListingCount },
      { count: expiredCount },
    ] = await Promise.all([
      supabase
        .from("gs_bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("gs_bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", user.id)
        .eq("status", "accepted"),
      supabase
        .from("gs_bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", user.id)
        .in("status", ["refused", "cancelled"]),
      supabase
        .from("gs_listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_active", true),
      supabase
        .from("gs_listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .is("is_active", null),
      supabase
        .from("gs_listings")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_active", false),
    ]);
    reservationPending = pendingCount ?? 0;
    reservationAccepted = acceptedCount ?? 0;
    reservationRefused = refusedCount ?? 0;
    listingOnline = onlineCount ?? 0;
    listingPending = pendingListingCount ?? 0;
    listingExpired = expiredCount ?? 0;
  } catch (err: unknown) {
    console.error("[layout] app/proprietaire/layout.tsx badge counts bookings/listings", err);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gs-beige lg:flex-row">
      <OwnerSidebar
        user={{ ...user, displayName }}
        materielUnreadCount={materielUnreadCount}
        paymentCount={paymentCount}
        contractCount={contractCount}
        canAccessSeeker={false}
        reservationCounts={{
          pending: reservationPending,
          accepted: reservationAccepted,
          refused: reservationRefused,
        }}
        listingCounts={{
          online: listingOnline,
          pending: listingPending,
          expired: listingExpired,
        }}
      />
      <main className="font-landing-body flex-1 overflow-auto text-gs-dark">{children}</main>
    </div>
  );
}
