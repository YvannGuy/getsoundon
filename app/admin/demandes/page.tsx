import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "sent" | "viewed" | "replied" | "accepted" | "rejected";

const STATUT_LABEL: Record<string, string> = {
  sent: "Nouvelle",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const TYPE_EVENEMENT_LABEL: Record<string, string> = {
  "culte-regulier": "Culte régulier",
  conference: "Conférence",
  celebration: "Célébration",
  bapteme: "Baptême",
  retraite: "Retraite",
};

const STATUT_BADGE: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  viewed: "bg-amber-100 text-amber-700",
  replied: "bg-[#213398]/10 text-black",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
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
    statusParam === "sent" || statusParam === "viewed" || statusParam === "replied" || statusParam === "rejected"
      ? statusParam
      : "all";

  const admin = createAdminClient();

  let demandesQuery = admin
    .from("demandes")
    .select(
      "id, seeker_id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, status, message, created_at, replied_at, heure_debut_souhaitee, heure_fin_souhaitee",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    demandesQuery = demandesQuery.eq("status", statusFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: demandesData, count: totalCount } = await demandesQuery.range(from, to);

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

  const { count: totalAll } = await admin
    .from("demandes")
    .select("id", { count: "exact", head: true });
  const allCount = totalAll ?? 0;
  const { count: sentCount } = await admin
    .from("demandes")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");
  const { count: viewedCount } = await admin
    .from("demandes")
    .select("id", { count: "exact", head: true })
    .eq("status", "viewed");
  const { count: repliedCount } = await admin
    .from("demandes")
    .select("id", { count: "exact", head: true })
    .eq("status", "replied");
  const { count: acceptedCount } = await admin
    .from("demandes")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted");
  const { count: rejectedCount } = await admin
    .from("demandes")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected");

  const counts = {
    all: allCount,
    sent: sentCount ?? 0,
    viewed: viewedCount ?? 0,
    replied: repliedCount ?? 0,
    accepted: acceptedCount ?? 0,
    rejected: rejectedCount ?? 0,
  };

  const tabs = [
    { key: "all" as const, label: "Toutes", count: counts.all },
    { key: "sent" as const, label: "Nouvelles", count: counts.sent },
    { key: "viewed" as const, label: "En attente", count: counts.viewed },
    { key: "replied" as const, label: "Répondues", count: counts.replied },
    { key: "accepted" as const, label: "Acceptées", count: counts.accepted },
    { key: "rejected" as const, label: "Refusées", count: counts.rejected },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Demandes</h1>
        <p className="mt-1 text-slate-500">Toutes les demandes envoyées par les organisateurs</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
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

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500">
            {statusFilter === "all"
              ? "Aucune demande"
              : `Aucune demande ${STATUT_LABEL[statusFilter] ?? statusFilter}`}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Organisateur</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Participants</th>
                  <th className="px-4 py-3">Salle / Propriétaire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((d) => {
                  const profile = d.seeker;
                  const salle = d.salle;
                  const hDebut = formatTime(d.heure_debut_souhaitee ?? null);
                  const hFin = formatTime(d.heure_fin_souhaitee ?? null);
                  const horaires = hDebut && hFin ? `${hDebut}-${hFin}` : hDebut || "";
                  const dateStr = d.date_debut
                    ? format(new Date(d.date_debut), "d MMM yyyy", { locale: fr })
                    : "—";

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
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {TYPE_EVENEMENT_LABEL[d.type_evenement ?? ""] ?? d.type_evenement ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-700">{dateStr}</p>
                        {horaires && <p className="text-xs text-slate-500">{horaires}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Users className="h-4 w-4 text-slate-400" />
                          {d.nb_personnes ?? "—"}
                        </span>
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
