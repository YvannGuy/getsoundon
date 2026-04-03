import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import {
  canAccessOwnerDashboard,
  getEffectiveUserType,
  getPublishMaterialListingHref,
} from "@/lib/auth-utils";
import { EMPTY_BADGE_COUNTS, getSeekerBadgeCounts } from "@/lib/notification-counts";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tableau de bord | GetSoundOn",
  robots: { index: false, follow: false },
};
/** Rafraîchit les compteurs de badges à chaque requête (pas de cache layout). */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended, full_name, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { suspended?: boolean } | null)?.suspended) {
    redirect("/auth?suspended=1");
  }

  const userType = isAdminByEnv
    ? "admin"
    : await getEffectiveUserType(user, async () => ({
        user_type: (profile as { user_type?: string | null } | null)?.user_type ?? "seeker",
      }));
  if (userType === "admin") redirect("/admin");

  const { data: myListings } = await supabase
    .from("gs_listings")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);
  const hasCatalogListings = (myListings ?? []).length > 0;
  const canAccessOwner = canAccessOwnerDashboard(userType, hasCatalogListings);
  const publishMaterialHref = getPublishMaterialListingHref(userType, hasCatalogListings, true);

  if (userType === "owner") {
    const cookieStore = await cookies();
    const dashboardView = cookieStore.get("dashboard_view")?.value;
    if (dashboardView !== "seeker") {
      redirect("/proprietaire");
    }
  }

  const displayName = (profile as { full_name?: string | null } | null)?.full_name ?? user.user_metadata?.full_name ?? "Utilisateur";

  let materielUnreadCount: number;
  try {
    const c = await getSeekerBadgeCounts(supabase, user.id);
    materielUnreadCount = c.materielUnreadCount;
  } catch (err: unknown) {
    console.error("[layout] app/dashboard/layout.tsx getSeekerBadgeCounts outer catch", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    materielUnreadCount = EMPTY_BADGE_COUNTS.materielUnreadCount;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gs-beige lg:flex-row">
      <DashboardSidebar
        user={{ ...user, displayName }}
        materielUnreadCount={materielUnreadCount}
        canAccessOwner={canAccessOwner}
        publishMaterialHref={publishMaterialHref}
      />
      <main className="font-landing-body flex-1 overflow-auto text-gs-dark">{children}</main>
    </div>
  );
}
