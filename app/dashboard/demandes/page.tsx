import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "sent" | "viewed" | "replied" | "rejected";

const STATUT_LABEL: Record<string, string> = {
  sent: "Envoyée",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUT_COLOR: Record<string, string> = {
  sent: "text-emerald-600",
  viewed: "text-amber-600",
  replied: "text-sky-600",
  accepted: "text-emerald-600",
  rejected: "text-red-600",
};

const STATUT_BADGE: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  viewed: "bg-amber-100 text-amber-700",
  replied: "bg-sky-100 text-sky-700",
  accepted: "bg-sky-100 text-sky-700",
  rejected: "bg-red-100 text-red-700",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

export default async function DemandesPage({
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  let demandesQuery = supabase
    .from("demandes")
    .select(
      "id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, status, created_at, replied_at, heure_debut_souhaitee, heure_fin_souhaitee",
      { count: "exact" }
    )
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter === "replied") {
    demandesQuery = demandesQuery.in("status", ["replied", "accepted"]);
  } else if (statusFilter !== "all") {
    demandesQuery = demandesQuery.eq("status", statusFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: demandesData, count: totalCount } = await demandesQuery.range(from, to);

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);

  const { data: allDemandes } = await supabase
    .from("demandes")
    .select("id, status, replied_at")
    .eq("seeker_id", user.id);

  const all = allDemandes ?? [];
  const repliedCount = all.filter((d) => ["replied", "accepted", "rejected"].includes(d.status)).length;
  const totalWithReply = all.length;
  const tauxReponse = totalWithReply > 0 ? Math.round((repliedCount / totalWithReply) * 100) : 0;

  const counts = {
    all: all.length,
    sent: all.filter((d) => d.status === "sent").length,
    viewed: all.filter((d) => d.status === "viewed").length,
    replied: all.filter((d) => ["replied", "accepted"].includes(d.status)).length,
    rejected: all.filter((d) => d.status === "rejected").length,
  };

  const salleIds = [...new Set((demandesData ?? []).map((d) => d.salle_id).filter(Boolean))];

  const { data: sallesData } =
    salleIds.length > 0
      ? await supabase
          .from("salles")
          .select("id, name, city, images, capacity, slug")
          .in("id", salleIds)
      : { data: [] };

  const salleMap = new Map((sallesData ?? []).map((s) => [s.id, s]));

  const { data: convsData } =
    (demandesData ?? []).length > 0
      ? await supabase
          .from("conversations")
          .select("demande_id, id")
          .in("demande_id", (demandesData ?? []).map((d) => d.id))
      : { data: [] };

  const convByDemande = new Map((convsData ?? []).map((c) => [c.demande_id, c]));

  const list = (demandesData ?? []).map((d) => {
    const salle = d.salle_id ? salleMap.get(d.salle_id) : undefined;
    const conv = convByDemande.get(d.id);
    return {
      ...d,
      salle,
      conversationId: conv?.id ?? null,
    };
  });

  const tabs = [
    { key: "all" as const, label: "Toutes", count: counts.all },
    { key: "viewed" as const, label: "En attente", count: counts.sent + counts.viewed },
    { key: "replied" as const, label: "Répondues", count: counts.replied },
    { key: "rejected" as const, label: "Refusées", count: counts.rejected },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mes demandes</h1>
        <p className="mt-1 text-slate-500">Suivez l&apos;état de vos demandes</p>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <TrendingUp className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Taux de réponse</p>
          <p className="text-2xl font-bold text-emerald-700">{tauxReponse}%</p>
        </div>
        <p className="ml-auto max-w-[240px] text-right text-sm text-slate-600">
          {tauxReponse >= 80
            ? "Excellente performance sur la plateforme"
            : tauxReponse >= 50
              ? "Bonne réactivité des propriétaires"
              : "Les propriétaires prennent le temps de répondre"}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map((tab) => {
          const isActive =
            (tab.key === "all" && statusFilter === "all") ||
            (tab.key !== "all" && statusFilter === tab.key);
          const href =
            tab.key === "all"
              ? "/dashboard/demandes?page=1"
              : `/dashboard/demandes?page=1&status=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#6366f1] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
              ? "Aucune demande envoyée"
              : `Aucune demande ${STATUT_LABEL[statusFilter] ?? statusFilter}`}
          </p>
          <Link href="/rechercher">
            <Button className="mt-4 bg-[#6366f1] hover:bg-[#4f46e5]">
              Rechercher une salle
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Salle</th>
                  <th className="px-4 py-3">Type d&apos;événement</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Participants</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((d) => {
                  const salle = d.salle;
                  const img =
                    salle?.images && Array.isArray(salle.images) && salle.images[0]
                      ? String(salle.images[0])
                      : "/img.png";
                  const hDebut = formatTime(d.heure_debut_souhaitee ?? null);
                  const hFin = formatTime(d.heure_fin_souhaitee ?? null);
                  const horaires = hDebut && hFin ? `${hDebut}-${hFin}` : hDebut || "";
                  const dateStr = d.date_debut
                    ? format(new Date(d.date_debut), "d MMMM yyyy", { locale: fr })
                    : "—";
                  const dateDisplay = horaires ? `${dateStr}, ${horaires}` : dateStr;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{salle?.name ?? "—"}</p>
                            <p className="text-xs text-slate-500">
                              Capacité {salle?.capacity ?? "—"} pers.
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {d.type_evenement ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{dateDisplay}</td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Users className="h-4 w-4 text-slate-400" />
                          {d.nb_personnes ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {salle?.city ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUT_BADGE[d.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              d.status === "sent"
                                ? "bg-emerald-500"
                                : d.status === "viewed"
                                  ? "bg-amber-500"
                                  : d.status === "replied" || d.status === "accepted"
                                    ? "bg-sky-500"
                                    : "bg-red-500"
                            }`}
                          />
                          {STATUT_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/demandes/${d.id}`}
                            className="text-sm font-medium text-[#6366f1] hover:underline"
                          >
                            Voir la demande
                          </Link>
                          {d.conversationId && (
                            <Link
                              href="/dashboard/messagerie"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#6366f1]"
                              title="Ouvrir la conversation"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            baseUrl="/dashboard/demandes"
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
