import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OwnerSidebar } from "@/components/dashboard/owner-sidebar";
import { canAccessOwnerDashboard, getEffectiveUserType } from "@/lib/auth-utils";
import { fetchAuthProfileRow } from "@/lib/fetch-auth-profile";
import { EMPTY_BADGE_COUNTS, getOwnerBadgeCounts } from "@/lib/notification-counts";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Espace prestataire | GetSoundOn",
  robots: { index: false, follow: false },
};
/** Rafraîchit les compteurs de badges à chaque requête (pas de cache layout). */
export const dynamic = "force-dynamic";

export default async function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await getUserOrNull();

  if (!user) {
    redirect("/auth");
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const profile = await fetchAuthProfileRow(user.id, supabase);

  if (profile?.suspended) {
    redirect("/auth?suspended=1");
  }

  const userType = isAdminByEnv
    ? "admin"
    : await getEffectiveUserType(user, async () =>
        profile ? { user_type: profile.user_type } : null,
      );
  if (userType === "admin") redirect("/admin");

  const { data: myListings } = await supabase
    .from("gs_listings")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);
  const hasCatalogListings = (myListings ?? []).length > 0;
  const canAccessOwner = canAccessOwnerDashboard(userType, hasCatalogListings);
  if (!canAccessOwner) redirect("/dashboard");

  const displayName =
    profile?.full_name?.trim() ||
    profile?.first_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    "Utilisateur";
  let materielUnreadCount: number;
  let paymentCount: number;
  let contractCount: number;
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gs-beige lg:flex-row">
      <OwnerSidebar
        user={{ ...user, displayName }}
        materielUnreadCount={materielUnreadCount}
        paymentCount={paymentCount}
        contractCount={contractCount}
        canAccessSeeker={true}
      />
      <main className="font-landing-body flex-1 overflow-auto text-gs-dark">{children}</main>
    </div>
  );
}
