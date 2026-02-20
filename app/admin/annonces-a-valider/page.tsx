import { createAdminClient } from "@/lib/supabase/admin";
import { AnnoncesAValiderClient } from "./annonces-a-valider-client";

export default async function AnnoncesAValiderPage({
  searchParams,
}: {
  searchParams: Promise<{ salleId?: string }>;
}) {
  const { salleId } = await searchParams;
  const supabase = createAdminClient();
  const { data: salles } = await supabase
    .from("salles")
    .select("id, slug, name, city, address, capacity, price_per_day, description, images, features, conditions, created_at, owner_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

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

  return (
    <div className="p-6 md:p-8">
      <AnnoncesAValiderClient salles={sallesWithOwner} highlightSalleId={salleId} />
    </div>
  );
}
