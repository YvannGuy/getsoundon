import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OwnerSidebar } from "@/components/dashboard/owner-sidebar";
import { canAccessOwnerDashboard, getEffectiveUserType } from "@/lib/auth-utils";
import { getOwnerBadgeCounts } from "@/lib/notification-counts";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Espace propriétaire",
  robots: { index: false, follow: false },
};

export default async function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await getUserOrNull();

  if (!user) {
    redirect("/auth");
  }

  const { data: suspendedCheck } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();

  if ((suspendedCheck as { suspended?: boolean } | null)?.suspended) {
    redirect("/auth?suspended=1");
  }

  const getProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle();
    return data;
  };
  const userType = await getEffectiveUserType(user, getProfile);
  if (userType === "admin") redirect("/admin");

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id);
  const hasSalles = (mySalles ?? []).length > 0;
  const canAccessOwner = canAccessOwnerDashboard(userType, hasSalles);
  if (!canAccessOwner) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? "Utilisateur";
  const { visiteCount, reservationCount, messageCount, paymentCount, edlCount, cautionCount, contractCount } =
    await getOwnerBadgeCounts(supabase, user.id);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 lg:flex-row">
      <OwnerSidebar
        user={{ ...user, displayName }}
        demandeCount={0}
        visiteCount={visiteCount ?? 0}
        reservationCount={reservationCount ?? 0}
        messageCount={messageCount}
        paymentCount={paymentCount}
        edlCount={edlCount ?? 0}
        cautionCount={cautionCount ?? 0}
        contractCount={contractCount}
        canAccessSeeker={true}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
