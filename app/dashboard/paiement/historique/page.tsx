import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 15;

const PRODUCT_LABEL: Record<string, string> = {
  pass_24h: "Pass 24h",
  pass_48h: "Pass 48h",
  abonnement: "Abonnement mensuel",
  reservation: "Réservation",
  autre: "Autre",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Payé",
  active: "Actif",
  canceled: "Annulé",
  pending: "En cours",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-600",
  active: "text-emerald-600",
  canceled: "text-slate-500",
  pending: "text-amber-600",
  failed: "text-red-600",
  refunded: "text-slate-500",
};

export default async function HistoriquePaiementPage({
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

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: payments, count } = await supabase
    .from("payments")
    .select("id, product_type, amount, status, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href="/dashboard/paiement"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au paiement
      </Link>

      <h1 className="text-2xl font-bold text-black">Historique des transactions</h1>
      <p className="mt-2 text-slate-500">Toutes vos transactions passées</p>

      <Card className="mt-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <p className="py-12 text-center text-slate-500">Aucune transaction</p>
          ) : (
            <>
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="pb-3 pr-3">Date</th>
                      <th className="pb-3 pr-3">Type</th>
                      <th className="pb-3 pr-3">Montant</th>
                      <th className="pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {PRODUCT_LABEL[p.product_type] ?? p.product_type}
                        </td>
                        <td className="py-3 pr-3 text-sm text-slate-600">
                          {(p.amount / 100).toFixed(2)} €
                        </td>
                        <td className="py-3">
                          <span className={`text-sm font-medium ${STATUS_COLOR[p.status] ?? "text-slate-600"}`}>
                            • {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <Pagination
                  baseUrl="/dashboard/paiement/historique"
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={count ?? 0}
                  pageSize={PAGE_SIZE}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
