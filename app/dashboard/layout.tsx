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

  const [{ count: demandeCount }, { data: demandesForMessagerie }] = await Promise.all([
    supabase.from("demandes").select("id", { count: "exact", head: true }).eq("seeker_id", user.id),
    supabase.from("demandes").select("id").eq("seeker_id", user.id),
  ]);

  let messageCount = 0;
  const demandeIds = (demandesForMessagerie ?? []).map((d) => d.id);
  if (demandeIds.length > 0) {
    const convsRes = await supabase
      .from("conversations")
      .select("id")
      .in("demande_id", demandeIds);
    if (!convsRes.error && (convsRes.data ?? []).length > 0) {
      const convIds = (convsRes.data ?? []).map((c) => c.id);
      const msgRes = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .is("read_at", null);
      if (!msgRes.error) messageCount = msgRes.count ?? 0;
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 lg:flex-row">
      <DashboardSidebar
        user={{ ...user, displayName }}
        demandeCount={demandeCount ?? 0}
        messageCount={messageCount}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
