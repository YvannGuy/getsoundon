import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const supabase = createAdminClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: demandes, count: totalCount } = await supabase
    .from("demandes")
    .select("id, date_debut, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Demandes</h1>
      <div className="space-y-3">
        {demandes?.length ? (
          demandes.map((d) => (
            <Card key={d.id}>
              <CardContent className="py-4">
                <p className="text-sm text-slate-600">
                  {new Date(d.date_debut).toLocaleDateString("fr-FR")} · {d.status}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Aucune demande
            </CardContent>
          </Card>
        )}
      </div>
      <Pagination
        baseUrl="/admin/demandes"
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
