import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "pending" | "accepted" | "refused" | "reschedule_proposed";

const STATUT_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  reschedule_proposed: "Reprogrammation proposée",
};

const STATUT_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  refused: "bg-red-100 text-red-700",
  reschedule_proposed: "bg-sky-100 text-sky-700",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const statusFilter: StatusFilter =
    statusParam === "pending" || statusParam === "accepted" || statusParam === "refused" || statusParam === "reschedule_proposed"
      ? statusParam
      : "all";

  const admin = createAdminClient();

  let query = admin
    .from("demandes_visite")
    .select(
      "id, seeker_id, salle_id, date_visite, heure_debut, heure_fin, message, status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: demandesData, count: totalCount } = await query.range(from, to);

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  const seekerIds = [...new Set((demandesData ?? []).map((d) => d.seeker_id).filter(Boolean))];
  const salleIds = [...new Set((demandesData ?? []).map((d) => d.salle_id).filter(Boolean))];

  const [profilesRes, sallesRes] = await Promise.all([
    seekerIds.length > 0
      ? admin.from("profiles").select("id, full_name, email").in("id", seekerIds)
      : { data: [] },
    salleIds.length > 0
      ? admin.from("salles").select("id, name, slug, owner_id").in("id", salleIds)
      : { data: [] },
  ]);

  const ownerIds = [...new Set((sallesRes.data ?? []).map((s) => s.owner_id).filter(Boolean))];
  const { data: ownerProfiles } =
    ownerIds.length > 0
      ? await admin.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] };

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const salleMap = new Map((sallesRes.data ?? []).map((s) => [s.id, s]));
  const ownerMap = new Map((ownerProfiles ?? []).map((p) => [p.id, p]));

  const list = (demandesData ?? []).map((d) => {
    const salle = d.salle_id ? salleMap.get(d.salle_id) : undefined;
    const owner = salle?.owner_id ? ownerMap.get(salle.owner_id) : undefined;
    return {
      ...d,
      seeker: d.seeker_id ? profileMap.get(d.seeker_id) : undefined,
      salle: salle ? { ...salle, owner } : undefined,
    };
  });

  const [{ count: allCount }, { count: pendingCount }, { count: acceptedCount }, { count: refusedCount }, { count: rescheduleCount }] =
    await Promise.all([
      admin.from("demandes_visite").select("id", { count: "exact", head: true }),
      admin.from("demandes_visite").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("demandes_visite").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      admin.from("demandes_visite").select("id", { count: "exact", head: true }).eq("status", "refused"),
      admin.from("demandes_visite").select("id", { count: "exact", head: true }).eq("status", "reschedule_proposed"),
    ]);

  const counts = {
    all: allCount ?? 0,
    pending: pendingCount ?? 0,
    accepted: acceptedCount ?? 0,
    refused: refusedCount ?? 0,
    reschedule_proposed: rescheduleCount ?? 0,
  };

  const tabs = [
    { key: "all" as const, label: "Toutes", count: counts.all },
    { key: "pending" as const, label: "En attente", count: counts.pending },
    { key: "accepted" as const, label: "Acceptées", count: counts.accepted },
    { key: "refused" as const, label: "Refusées", count: counts.refused },
    { key: "reschedule_proposed" as const, label: "Reprogrammation proposée", count: counts.reschedule_proposed },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Demandes de visites</h1>
        <p className="mt-1 text-slate-500">Toutes les demandes de visites envoyées par les locataires</p>
      </div>

      <div className="mb-6 -mx-4 overflow-x-auto border-b border-slate-200 px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const isActive =
              (tab.key === "all" && statusFilter === "all") ||
              (tab.key !== "all" && statusFilter === tab.key);
            const href =
              tab.key === "all"
                ? "/admin/demandes?page=1"
                : `/admin/demandes?page=1&status=${tab.key}`;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
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
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500">
            {statusFilter === "all"
              ? "Aucune demande de visites"
              : `Aucune demande ${STATUT_LABEL[statusFilter] ?? statusFilter}`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((d) => {
              const profile = d.seeker;
              const salle = d.salle;
              const dateStr = d.date_visite
                ? format(new Date(d.date_visite + "T12:00:00"), "d MMM yyyy", { locale: fr })
                : "—";
              const heureStr =
                d.heure_debut && d.heure_fin
                  ? `${formatTime(d.heure_debut)} - ${formatTime(d.heure_fin)}`
                  : "";

              return (
                <article key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">{profile?.full_name ?? "—"}</p>
                      <p className="truncate text-sm text-slate-500">{profile?.email ?? "—"}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUT_BADGE[d.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUT_LABEL[d.status] ?? d.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {dateStr}
                    </p>
                    {heureStr && (
                      <p className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {heureStr}
                      </p>
                    )}
                    <p className="font-medium text-slate-700">{salle?.name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{(salle?.owner as { full_name?: string } | undefined)?.full_name ?? "—"}</p>
                  </div>
                  <div className="mt-3">
                    <Link href={`/admin/demandes/${d.id}`}>
                      <Button size="sm" variant="outline" className="h-9">
                        Voir détail
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Locataire</th>
                  <th className="px-4 py-3">Date / Créneau</th>
                  <th className="px-4 py-3">Salle / Propriétaire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((d) => {
                  const profile = d.seeker;
                  const salle = d.salle;
                  const dateStr = d.date_visite
                    ? format(new Date(d.date_visite + "T12:00:00"), "d MMM yyyy", { locale: fr })
                    : "—";
                  const heureStr =
                    d.heure_debut && d.heure_fin
                      ? `${formatTime(d.heure_debut)} - ${formatTime(d.heure_fin)}`
                      : "";

                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                            {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-black">{profile?.full_name ?? "—"}</p>
                            <p className="text-sm text-slate-500">{profile?.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="flex items-center gap-2 text-sm text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {dateStr}
                        </p>
                        {heureStr && (
                          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {heureStr}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-black">{salle?.name ?? "—"}</p>
                        <p className="text-xs text-slate-500">
                          {(salle?.owner as { full_name?: string } | undefined)?.full_name ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUT_BADGE[d.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {STATUT_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/admin/demandes/${d.id}`}>
                          <Button size="sm" variant="outline">
                            Voir détail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            baseUrl="/admin/demandes"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            queryParams={statusFilter !== "all" ? `&status=${statusFilter}` : ""}
          />
        </>
      )}
    </div>
  );
}
