import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getEffectiveUserType } from "@/lib/auth-utils";
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
  if (userType === "owner") redirect("/proprietaire");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? "Utilisateur";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <DashboardSidebar user={{ ...user, displayName }} />
      <main className="min-h-screen flex-1 overflow-auto">{children}</main>
    </div>
  );
}
