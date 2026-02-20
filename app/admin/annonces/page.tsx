import { createAdminClient } from "@/lib/supabase/admin";
import { AnnoncesClient } from "./annonces-client";

export default async function AdminAnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<{ salleId?: string }>;
}) {
  const { salleId } = await searchParams;
  const supabase = createAdminClient();

  const [
    { data: salles },
    { data: viewsData },
    { data: demandesData },
  ] = await Promise.all([
    supabase
      .from("salles")
      .select("id, slug, name, city, address, capacity, price_per_day, images, status, owner_id")
      .order("created_at", { ascending: false }),
    supabase.from("salle_views").select("salle_id"),
    supabase.from("demandes").select("salle_id"),
  ]);

  const viewsBySalle = new Map<string, number>();
  (viewsData ?? []).forEach((v) => {
    if (v.salle_id) {
      viewsBySalle.set(v.salle_id, (viewsBySalle.get(v.salle_id) ?? 0) + 1);
    }
  });

  const demandesBySalle = new Map<string, number>();
  (demandesData ?? []).forEach((d) => {
    if (d.salle_id) {
      demandesBySalle.set(d.salle_id, (demandesBySalle.get(d.salle_id) ?? 0) + 1);
    }
  });

  const ownerIds = [...new Set((salles ?? []).map((s) => s.owner_id).filter(Boolean))];
  const { data: profiles } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const sallesWithCounts = (salles ?? []).map((s) => ({
    ...s,
    views_count: viewsBySalle.get(s.id) ?? 0,
    demandes_count: demandesBySalle.get(s.id) ?? 0,
    owner: s.owner_id ? profileMap.get(s.owner_id) : undefined,
  }));

  const stats = {
    active: salles?.filter((s) => s.status === "approved").length ?? 0,
    pending: salles?.filter((s) => s.status === "pending").length ?? 0,
    rejected: salles?.filter((s) => s.status === "rejected").length ?? 0,
  };

  return (
    <div className="p-6 md:p-8">
      <AnnoncesClient salles={sallesWithCounts} stats={stats} highlightSalleId={salleId} />
    </div>
  );
}
