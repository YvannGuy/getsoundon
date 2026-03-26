import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Zap, Users } from "lucide-react";

import { ContactLocataireDemandeButton } from "@/components/demandes/contact-locataire-demande-button";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "sent" | "viewed" | "replied" | "rejected";

const STATUT_LABEL: Record<string, string> = {
  sent: "Nouvelle",
  viewed: "En attente",
  replied: "Répondue",
  accepted: "Répondue",
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
  replied: "bg-gs-orange/10 text-black",
  accepted: "bg-gs-orange/10 text-black",
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

  const { data: mySalles } = await supabase
    .from("salles")
    .select("id")
    .eq("owner_id", user.id);
  const salleIds = (mySalles ?? []).map((s) => s.id);

  if (salleIds.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-black">Demandes reçues</h1>
        <p className="mt-2 text-slate-500">Consultez et gérez vos demandes</p>
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500">Aucune demande pour le moment.</p>
          <p className="mt-1 text-sm text-slate-400">
            Les demandes apparaîtront ici lorsque des locataires contacteront vos salles.
          </p>
        </div>
      </div>
    );
  }

  let demandesQuery = supabase
    .from("demandes")
    .select(
      "id, seeker_id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, status, created_at, replied_at, heure_debut_souhaitee, heure_fin_souhaitee",
      { count: "exact" }
    )
    .in("salle_id", salleIds)
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

  const allDemandes =
    salleIds.length > 0
      ? await supabase
          .from("demandes")
          .select("id, status, created_at, replied_at")
          .in("salle_id", salleIds)
      : { data: [] };

  const all = allDemandes.data ?? [];

  const counts = {
    all: all.length,
    sent: all.filter((d) => d.status === "sent").length,
    viewed: all.filter((d) => d.status === "viewed").length,
    replied: all.filter((d) => ["replied", "accepted"].includes(d.status)).length,
    rejected: all.filter((d) => d.status === "rejected").length,
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const repliedLast30 = all.filter(
    (d) =>
      d.replied_at &&
      new Date(d.replied_at) >= thirtyDaysAgo &&
      ["replied", "accepted", "rejected"].includes(d.status)
  );
  const avgResponseMs =
    repliedLast30.length > 0
      ? repliedLast30.reduce((acc, d) => {
          const created = new Date(d.created_at).getTime();
          const replied = d.replied_at ? new Date(d.replied_at).getTime() : created;
          return acc + (replied - created);
        }, 0) / repliedLast30.length
      : 0;
  const avgResponseHours = Math.round(avgResponseMs / (1000 * 60 * 60));

  const seekerIds = [...new Set((demandesData ?? []).map((d) => d.seeker_id).filter(Boolean))];
  const salleIdsForDemandes = [...new Set((demandesData ?? []).map((d) => d.salle_id).filter(Boolean))];

  const adminSupabase = createAdminClient();
  const [profilesRes, sallesRes] = await Promise.all([
    seekerIds.length > 0
      ? adminSupabase.from("profiles").select("id, full_name, email").in("id", seekerIds)
      : { data: [] },
    salleIdsForDemandes.length > 0
      ? supabase.from("salles").select("id, name").in("id", salleIdsForDemandes)
      : { data: [] },
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const salleMap = new Map((sallesRes.data ?? []).map((s) => [s.id, s]));

  const list = (demandesData ?? []).map((d) => ({
    ...d,
    seeker: d.seeker_id ? profileMap.get(d.seeker_id) : undefined,
    salle: d.salle_id ? salleMap.get(d.salle_id) : undefined,
  }));

  const tabs = [
    { key: "all" as const, label: "Toutes", count: counts.all },
    { key: "sent" as const, label: "Nouvelles", count: counts.sent },
    { key: "viewed" as const, label: "En attente", count: counts.viewed },
    { key: "replied" as const, label: "Répondues", count: counts.replied },
    { key: "rejected" as const, label: "Refusées", count: counts.rejected },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Demandes reçues</h1>
        <p className="mt-1 text-slate-500">Consultez et gérez vos demandes</p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Temps de réponse moyen</p>
            <p className="text-2xl font-bold text-black">
              {avgResponseHours >= 24
                ? `${Math.round(avgResponseHours / 24)}j`
                : `${avgResponseHours}h`}
            </p>
            <p className="text-xs text-slate-500">Dernières 30 jours</p>
          </div>
          <p className="max-w-[260px] text-sm text-slate-500 sm:ml-auto sm:text-right">
            Votre réactivité impressionne vos clients
          </p>
        </div>
      </div>

      <div className="mb-6 -mx-4 overflow-x-auto border-b border-slate-200 px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const isActive =
              (tab.key === "all" && statusFilter === "all") ||
              (tab.key !== "all" && statusFilter === tab.key);
            const href =
              tab.key === "all"
                ? "/proprietaire/demandes?page=1"
                : `/proprietaire/demandes?page=1&status=${tab.key}`;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gs-orange text-white"
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
              ? "Aucune demande"
              : `Aucune demande ${STATUT_LABEL[statusFilter] ?? statusFilter}`}
          </p>
        </div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {list.map((d) => {
            const profile = d.seeker;
            const salle = d.salle;
            const hDebut = formatTime(d.heure_debut_souhaitee ?? null);
            const hFin = formatTime(d.heure_fin_souhaitee ?? null);
            const horaires = hDebut && hFin ? `${hDebut}-${hFin}` : hDebut || "";
            const dateStr = d.date_debut
              ? format(new Date(d.date_debut), "d MMMM yyyy", { locale: fr })
              : "—";
            const typeEvenement = TYPE_EVENEMENT_LABEL[d.type_evenement ?? ""] ?? d.type_evenement ?? "—";

            return (
              <article key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-black">{profile?.full_name ?? "—"}</p>
                    <p className="truncate text-sm text-slate-500">{profile?.email ?? "—"}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      STATUT_BADGE[d.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STATUT_LABEL[d.status] ?? d.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>{typeEvenement}</p>
                  <p>{dateStr}{horaires ? `, ${horaires}` : ""}</p>
                  <p className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    {d.nb_personnes ?? "—"} participants
                  </p>
                  <p className="font-medium text-slate-700">{salle?.name ?? d.salle_id ?? "—"}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/proprietaire/demandes/${d.id}`}>
                    <Button variant="outline" size="sm" className="h-9">
                      Voir
                    </Button>
                  </Link>
                  <ContactLocataireDemandeButton demandeId={d.id} />
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
                <th className="px-4 py-3">Type d&apos;événement</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Participants</th>
                <th className="px-4 py-3">Salle</th>
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
                  ? format(new Date(d.date_debut), "d MMMM yyyy", { locale: fr })
                  : "—";
                const dateDisplay = horaires ? `${dateStr}\n${horaires}` : dateStr;

                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                          {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-black">
                            {profile?.full_name ?? "—"}
                          </p>
                          <p className="text-sm text-slate-500">{profile?.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-600">
                          {TYPE_EVENEMENT_LABEL[d.type_evenement ?? ""] ?? d.type_evenement ?? "—"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-700">{dateStr}</p>
                      {horaires && (
                        <p className="text-xs text-slate-500">{horaires}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Users className="h-4 w-4 text-slate-400" />
                        {d.nb_personnes ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {salle?.name ?? d.salle_id ?? "—"}
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
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/proprietaire/demandes/${d.id}`}>
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                        <ContactLocataireDemandeButton demandeId={d.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          baseUrl="/proprietaire/demandes"
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
