import { FileText, Receipt } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function DashboardContratPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count: totalCount } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("seeker_id", user.id)
    .eq("status", "paid");

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: offers } = await supabase
    .from("offers")
    .select("id, salle_id, owner_id, amount_cents, created_at, status")
    .eq("seeker_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .range(from, to);

  const salleIds = [...new Set((offers ?? []).map((o) => o.salle_id))];
  const ownerIds = [...new Set((offers ?? []).map((o) => o.owner_id))];
  const [{ data: salles }, { data: owners }] = await Promise.all([
    salleIds.length
      ? supabase.from("salles").select("id, name, city").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string; city: string }[] }),
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);
  const salleMap = new Map((salles ?? []).map((s) => [s.id, s]));
  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.full_name || o.email || "Propriétaire"]));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Contrat & facture</h1>
      <p className="mt-2 text-slate-500">
        Retrouvez vos contrats et factures PDF après paiement de vos réservations.
      </p>

      {!offers || offers.length === 0 ? (
        <Card className="mt-8 border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-16 w-16 text-slate-300" />
            <p className="text-slate-600">Aucune réservation payée pour le moment.</p>
            <Link href="/dashboard/messagerie" className="mt-4 text-sm font-medium text-gs-orange hover:underline">
              Ouvrir la messagerie →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-8 space-y-6">
            {(offers ?? []).map((offer) => {
              const salle = salleMap.get(offer.salle_id);
              return (
                <Card key={offer.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      {salle?.name ?? "Salle"}
                    </CardTitle>
                    <CardDescription>
                      {(salle?.city ?? "—")} • Propriétaire: {ownerMap.get(offer.owner_id) ?? "—"} •{" "}
                      {(offer.amount_cents / 100).toFixed(2)} €
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/contract/${offer.id}`} download target="_blank" rel="noopener noreferrer">
                        <span className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          <FileText className="h-4 w-4" />
                          Contrat PDF
                        </span>
                      </a>
                      <a href={`/api/invoice/offer/${offer.id}`} download target="_blank" rel="noopener noreferrer">
                        <span className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          <Receipt className="h-4 w-4" />
                          Facture PDF
                        </span>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {totalPages > 1 && (
            <Pagination
              baseUrl="/dashboard/contrat"
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
            />
          )}
        </>
      )}
    </div>
  );
}
