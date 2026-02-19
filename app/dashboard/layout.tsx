import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? "Utilisateur";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar user={{ ...user, displayName }} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
