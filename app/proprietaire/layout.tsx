import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OwnerSidebar } from "@/components/dashboard/owner-sidebar";
import { canAccessOwnerDashboard, getEffectiveUserType } from "@/lib/auth-utils";
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

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id);
  const hasSalles = (mySalles ?? []).length > 0;
  const canAccessOwner = canAccessOwnerDashboard(userType, hasSalles);
  if (!canAccessOwner) redirect("/dashboard");

  const displayName =
    (profile as { full_name?: string | null } | null)?.full_name ??
    user.user_metadata?.full_name ??
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
