import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/dashboard/admin-header";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { isUserAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
/** Rafraîchit les compteurs de badges à chaque requête (pas de cache layout). */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await getUserOrNull();

  if (!user) {
    redirect("/auth/admin");
  }

  if (!(await isUserAdmin(user, supabase))) {
    redirect("/auth/admin");
  }

  const badgeCounts = {
    utilisateurs: 0,
    conciergeRequests: 0,
    incidentsMateriel: 0,
    reportsNew: 0,
  };

  try {
    const admin = createAdminClient();
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: newUsersCount }, { count: openIncidents }] = await Promise.all([
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso),
      admin.from("gs_bookings").select("id", { count: "exact", head: true }).eq("incident_status", "open"),
    ]);

    badgeCounts.utilisateurs = newUsersCount ?? 0;
    badgeCounts.incidentsMateriel = openIncidents ?? 0;

    try {
      const { count: newReports } = await admin
        .from("gs_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      badgeCounts.reportsNew = newReports ?? 0;
    } catch {
      badgeCounts.reportsNew = 0;
    }

    try {
      const { count } = await admin
        .from("concierge_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      badgeCounts.conciergeRequests = count ?? 0;
    } catch {
      // Table concierge_requests peut ne pas exister
    }
  } catch {
    // Ignore if admin client fails
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
