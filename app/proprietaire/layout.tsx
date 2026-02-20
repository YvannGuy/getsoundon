import { redirect } from "next/navigation";

import { OwnerSidebar } from "@/components/dashboard/owner-sidebar";
import { getEffectiveUserType } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";

export default async function ProprietaireLayout({
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
  if (userType === "seeker") redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? "Utilisateur";

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id);
  const salleIds = (mySalles ?? []).map((s) => s.id);
  const [{ count: demandeCount }, { data: demandesForMessagerie }] = await Promise.all([
    salleIds.length > 0
      ? supabase
          .from("demandes")
          .select("id", { count: "exact", head: true })
          .in("salle_id", salleIds)
      : { count: 0 },
    salleIds.length > 0
      ? supabase.from("demandes").select("id").in("salle_id", salleIds)
      : { data: [] },
  ]);

  let messageCount = 0;
  const demandeIdsForConv = (demandesForMessagerie ?? []).map((d) => d.id);
  if (demandeIdsForConv.length > 0) {
    const convsRes = await supabase
      .from("conversations")
      .select("id")
      .in("demande_id", demandeIdsForConv);
    if (!convsRes.error) {
      const convIds = (convsRes.data ?? []).map((c) => c.id);
      if (convIds.length > 0) {
        const msgRes = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .is("read_at", null);
        if (!msgRes.error) messageCount = msgRes.count ?? 0;
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 lg:flex-row">
      <OwnerSidebar
        user={{ ...user, displayName }}
        demandeCount={demandeCount ?? 0}
        messageCount={messageCount}
      />
      <main className="min-h-screen flex-1 overflow-auto">{children}</main>
    </div>
  );
}
