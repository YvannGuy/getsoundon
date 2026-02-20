import Link from "next/link";
import { redirect } from "next/navigation";

import { AddSalleButton } from "@/components/proprietaire/add-salle-modal";
import { createClient } from "@/lib/supabase/server";
import { AnnoncesClient } from "./annonces-client";

const PAGE_SIZE = 9;

const STATUT_SALLE_LABEL: Record<string, string> = {
  approved: "Active",
  pending: "En validation",
  rejected: "Refusée",
};

const STATUT_SALLE_BADGE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default async function AnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const statusFilter: StatusFilter =
    statusParam === "approved" || statusParam === "pending" || statusParam === "rejected"
      ? statusParam
      : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  let query = supabase
    .from("salles")
    .select("id, slug, name, city, images, status", { count: "exact" })
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: salles, count: totalCount } = await query.range(from, to);

  const counts = await Promise.all([
    supabase
      .from("salles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id),
    supabase
      .from("salles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "approved"),
    supabase
      .from("salles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("salles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "rejected"),
  ]);

  const total = totalCount ?? 0;
  const totalAll = counts[0].count ?? 0;
  const totalActive = counts[1].count ?? 0;
  const totalPending = counts[2].count ?? 0;
  const totalRejected = counts[3].count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const currentPage = Math.min(page, totalPages);
  const baseUrl = "/proprietaire/annonces";
  const statusQ = statusFilter !== "all" ? `&status=${statusFilter}` : "";

  const tabs = [
    { key: "all" as const, label: "Tous", count: totalAll },
    { key: "approved" as const, label: "Actives", count: totalActive },
    { key: "pending" as const, label: "En validation", count: totalPending },
    { key: "rejected" as const, label: "Refusées", count: totalRejected },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Mes annonces</h1>
          <p className="mt-1 text-slate-500">Gérez et modifiez vos salles</p>
        </div>
        <AddSalleButton className="bg-[#213398] hover:bg-[#1a2980]">
          Ajouter une salle
        </AddSalleButton>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map((tab) => {
          const isActive =
            (tab.key === "all" && statusFilter === "all") ||
            (tab.key !== "all" && statusFilter === tab.key);
          const href = `${baseUrl}?page=1${tab.key === "all" ? "" : `&status=${tab.key}`}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#213398] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-black"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs ${
                  isActive ? "bg-white/20" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {(salles ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500">
            {statusFilter === "all"
              ? "Aucune annonce pour le moment"
              : `Aucune annonce ${STATUT_SALLE_LABEL[statusFilter] ?? statusFilter.toLowerCase()}`}
          </p>
          {statusFilter === "all" && (
            <AddSalleButton className="mt-4 bg-[#213398] hover:bg-[#1a2980]">
              Ajouter une salle
            </AddSalleButton>
          )}
        </div>
      ) : (
        <>
          <AnnoncesClient salles={salles ?? []} />

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <Link
                href={currentPage <= 1 ? "#" : `${baseUrl}?page=${currentPage - 1}${statusQ}`}
                className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  currentPage <= 1
                    ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Précédent
              </Link>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) {
                    p = i + 1;
                  } else if (currentPage <= 4) {
                    p = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    p = totalPages - 6 + i;
                  } else {
                    p = currentPage - 3 + i;
                  }
                  return (
                    <Link
                      key={p}
                      href={`${baseUrl}?page=${p}${statusQ}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === currentPage
                          ? "bg-[#213398] text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>
              <Link
                href={currentPage >= totalPages ? "#" : `${baseUrl}?page=${currentPage + 1}${statusQ}`}
                className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  currentPage >= totalPages
                    ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Suivant
              </Link>
            </nav>
          )}
        </>
      )}

    </div>
  );
}
