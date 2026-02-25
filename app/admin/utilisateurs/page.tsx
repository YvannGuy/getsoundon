import { createAdminClient } from "@/lib/supabase/admin";
import { UtilisateursClient } from "./utilisateurs-client";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 25;

export default async function AdminUtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; page?: string }>;
}) {
  const { userId, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const supabase = createAdminClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [
    { data: profiles, count: totalCount },
    { data: sallesByOwner },
    { data: demandesBySeeker },
    { count: totalActifs },
    { count: totalOwners },
    { count: nouveaux7jCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, user_type, created_at, suspended, stripe_account_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase.from("salles").select("owner_id"),
    supabase.from("demandes_visite").select("seeker_id"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).is("suspended", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "owner"),
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", d.toISOString());
    })(),
  ]);

  const sallesCount = new Map<string, number>();
  (sallesByOwner ?? []).forEach((s) => {
    if (s.owner_id) {
      sallesCount.set(s.owner_id, (sallesCount.get(s.owner_id) ?? 0) + 1);
    }
  });
  const demandesCount = new Map<string, number>();
  (demandesBySeeker ?? []).forEach((d) => {
    if (d.seeker_id) {
      demandesCount.set(d.seeker_id, (demandesCount.get(d.seeker_id) ?? 0) + 1);
    }
  });

  const profilesList = (profiles ?? []).map((p) => ({
    ...p,
    salles_count: sallesCount.get(p.id) ?? 0,
    demandes_count: demandesCount.get(p.id) ?? 0,
  }));

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  const stats = {
    total,
    actifs: totalActifs ?? 0,
    owners: totalOwners ?? 0,
    nouveaux7j: nouveaux7jCount ?? 0,
  };

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      <UtilisateursClient users={profilesList} stats={stats} highlightUserId={userId} />
      <Pagination
        baseUrl="/admin/utilisateurs"
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        queryParams={userId ? `&userId=${userId}` : ""}
      />
    </div>
  );
}
