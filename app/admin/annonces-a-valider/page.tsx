import { createAdminClient } from "@/lib/supabase/admin";
import { AnnoncesAValiderClient } from "./annonces-a-valider-client";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 15;

export default async function AnnoncesAValiderPage({
  searchParams,
}: {
  searchParams: Promise<{ salleId?: string; page?: string }>;
}) {
  const { salleId, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const supabase = createAdminClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: salles, count: totalCount } = await supabase
    .from("salles")
    .select("id, slug, name, city, address, capacity, price_per_day, price_per_hour, price_per_month, description, images, video_url, features, conditions, pricing_inclusions, horaires_par_jour, jours_ouverture, created_at, owner_id", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(from, to);

  const ownerIds = [...new Set((salles ?? []).map((s) => s.owner_id).filter(Boolean))];
  const { data: profiles } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const sallesWithOwner = (salles ?? []).map((s) => ({
    ...s,
    owner: s.owner_id ? profileMap.get(s.owner_id) : undefined,
  }));

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="p-4 pb-24 md:p-8 md:pb-8">
      <AnnoncesAValiderClient salles={sallesWithOwner} highlightSalleId={salleId} />
      <Pagination
        baseUrl="/admin/annonces-a-valider"
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        queryParams={salleId ? `&salleId=${salleId}` : ""}
      />
    </div>
  );
}
