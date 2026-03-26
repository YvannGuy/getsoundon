import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ConciergeStatusForm } from "@/components/admin/concierge-status-form";
import { Pagination } from "@/components/ui/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 15;

const STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  contacted: "Contactée",
  in_progress: "En cours",
  resolved: "Traité",
};

const SOURCE_LABELS: Record<string, string> = {
  homepage: "Homepage",
  search_zero_results: "0 résultat recherche",
  other: "Autre",
};

export default async function AdminConciergeriePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const statusFilter = statusParam && STATUS_LABELS[statusParam] ? statusParam : "all";

  const admin = createAdminClient();

  let query = admin
    .from("concierge_requests")
    .select("id, user_id, email, phone, status, source, payload, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: requests, count: totalCount } = await query.range(from, from + PAGE_SIZE - 1);
  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  const userIds = [...new Set((requests ?? []).map((r) => r.user_id).filter(Boolean))];
  const { data: profiles } =
    userIds.length > 0
      ? await admin.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const [{ count: newCount }, { count: totalAll }] = await Promise.all([
    admin.from("concierge_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("concierge_requests").select("id", { count: "exact", head: true }),
  ]);

  const tabs = [
    { key: "all", label: "Toutes", count: totalAll ?? 0 },
    { key: "new", label: "Nouvelles", count: newCount ?? 0 },
    { key: "contacted", label: "Contactées", count: 0 },
    { key: "in_progress", label: "En cours", count: 0 },
    { key: "resolved", label: "Traitée", count: 0 },
  ];

  const [contactedCount, inProgressCount, resolvedCount] = await Promise.all([
    admin.from("concierge_requests").select("id", { count: "exact", head: true }).eq("status", "contacted"),
    admin.from("concierge_requests").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    admin.from("concierge_requests").select("id", { count: "exact", head: true }).eq("status", "resolved"),
  ]);

  tabs[2]!.count = contactedCount?.count ?? 0;
  tabs[3]!.count = inProgressCount?.count ?? 0;
  tabs[4]!.count = resolvedCount?.count ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Demandes conciergerie"
        subtitle="Briefs de recherche confiés par les utilisateurs"
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/admin/conciergerie" : `/admin/conciergerie?status=${tab.key}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === tab.key
                ? "bg-gs-orange text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Contact</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Source</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Message</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((req) => {
                const payload = (req.payload ?? {}) as Record<string, unknown>;
                const msg = String(payload.message ?? "").slice(0, 80);
                const profile = req.user_id ? profileMap.get(req.user_id) : undefined;
                const contact = profile?.email ?? req.email ?? req.phone ?? "—";
                return (
                  <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600">
                      <Link
                        href={`/admin/conciergerie/${req.id}`}
                        className="text-gs-orange font-medium hover:underline"
                      >
                        {format(new Date(req.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {profile?.full_name && (
                        <span className="text-slate-700">{profile.full_name}</span>
                      )}
                      <br />
                      <span className="text-slate-500 text-xs">{contact}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {SOURCE_LABELS[req.source] ?? req.source}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-600" title={String(payload.message ?? "")}>
                      {msg}
                    </td>
                    <td className="px-4 py-3">
                      <ConciergeStatusForm id={req.id} currentStatus={req.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!requests || requests.length === 0) && (
          <p className="px-4 py-12 text-center text-slate-500">Aucune demande</p>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          baseUrl="/admin/conciergerie"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          queryParams={statusFilter !== "all" ? `&status=${statusFilter}` : ""}
        />
      )}
    </div>
  );
}
