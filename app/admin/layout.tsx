import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/dashboard/admin-header";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/admin");
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminByEnv =
    adminEmails.length > 0 && adminEmails.includes(user.email?.toLowerCase() ?? "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminByProfile = profile?.user_type === "admin";

  if (!isAdminByEnv && !isAdminByProfile) {
    redirect("/auth/admin");
  }

  let pendingCount = 0;
  const notifications: { id: string; type: "user" | "annonce" | "paiement"; label: string; href: string; date: string }[] = [];

  try {
    const admin = createAdminClient();
    const [{ count }, { data: recentProfiles }, { data: recentSalles }, { data: recentPayments }] =
      await Promise.all([
        admin.from("salles").select("*", { count: "exact", head: true }).eq("status", "pending"),
        admin
          .from("profiles")
          .select("id, full_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        admin
          .from("salles")
          .select("id, name, slug, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        admin
          .from("payments")
          .select("id, amount, product_type, created_at")
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    pendingCount = count ?? 0;

    (recentProfiles ?? []).forEach((p) => {
      notifications.push({
        id: `user-${p.id}`,
        type: "user",
        label: `Nouvel utilisateur : ${p.full_name || p.email || "—"}`,
        href: `/admin/utilisateurs?userId=${p.id}`,
        date: p.created_at ?? "",
      });
    });
    (recentSalles ?? []).forEach((s) => {
      notifications.push({
        id: `annonce-${s.id}`,
        type: "annonce",
        label: `Nouvelle annonce : ${s.name ?? "—"}`,
        href: s.status === "pending"
          ? `/admin/annonces-a-valider?salleId=${s.id}`
          : `/admin/annonces?salleId=${s.id}`,
        date: s.created_at ?? "",
      });
    });
    (recentPayments ?? []).forEach((p) => {
      const productLabels: Record<string, string> = {
        pass_24h: "Pass 24h",
        pass_48h: "Pass 48h",
        abonnement: "Abonnement",
        autre: "Autre",
      };
      notifications.push({
        id: `paiement-${p.id}`,
        type: "paiement",
        label: `Nouveau paiement : ${(p.amount ?? 0) / 100}€ - ${productLabels[p.product_type ?? ""] ?? p.product_type}`,
        href: `/admin/paiements?paymentId=${p.id}`,
        date: p.created_at ?? "",
      });
    });

    notifications.sort((a, b) => (b.date < a.date ? -1 : 1));
    notifications.splice(15);
  } catch {
    // Ignore if admin client fails (e.g. missing SUPABASE_SERVICE_ROLE_KEY)
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar pendingCount={pendingCount} userEmail={user.email} />
      <div className="flex flex-1 flex-col overflow-auto">
        <AdminHeader pendingCount={pendingCount} notifications={notifications} />
        <main className="flex-1 pl-14 lg:pl-0">{children}</main>
      </div>
    </div>
  );
}
