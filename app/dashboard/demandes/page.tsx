import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";

import { ContactProprietaireDemandeButton } from "@/components/demandes/contact-proprietaire-demande-button";
import { ContactVisiteSeekerButton } from "@/components/demandes/contact-visite-seeker-button";
import { ReprogrammationVisiteActions } from "@/components/demandes/reprogrammation-visite-actions";
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
  pending: "En attente",
  refused: "Refusée",
  reschedule_proposed: "Reprogrammation proposée",
};

const STATUT_BADGE: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  viewed: "bg-amber-100 text-amber-700",
  replied: "bg-gs-orange/10 text-black",
  accepted: "bg-gs-orange/10 text-black",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  refused: "bg-red-100 text-red-700",
  reschedule_proposed: "bg-sky-100 text-sky-700",
};

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

type DemandeFilterStatus = "viewed" | "replied" | "rejected";
function matchesFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "viewed")
    return ["sent", "viewed", "pending", "reschedule_proposed"].includes(status);
  if (filter === "replied") return ["replied", "accepted"].includes(status);
  if (filter === "rejected") return ["rejected", "refused"].includes(status);
  return false;
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

  const { data: demandesData } = await supabase
    .from("demandes")
    .select(
      "id, salle_id, date_debut, date_fin, nb_personnes, type_evenement, status, created_at, replied_at, heure_debut_souhaitee, heure_fin_souhaitee"
    )
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false });

  const TYPE_EVENEMENT_LABEL: Record<string, string> = {
    "culte-regulier": "Culte régulier",
    conference: "Conférence",
    celebration: "Célébration",
    bapteme: "Baptême",
    retraite: "Retraite",
  };
  let demandesVisiteData: { id: string; salle_id: string; date_visite: string; heure_debut: string; heure_fin: string; type_evenement: string | null; status: string; created_at: string }[] | null = null;
  try {
    const res = await supabase
      .from("demandes_visite")
      .select("id, salle_id, date_visite, heure_debut, heure_fin, type_evenement, status, created_at")
      .eq("seeker_id", user.id)
      .order("created_at", { ascending: false });
    demandesVisiteData = res.data;
  } catch {
    // Table demandes_visite peut ne pas exister si migration non exécutée
  }

  const demandes = demandesData ?? [];
  const demandesVisite = demandesVisiteData ?? [];
  const allSalleIds = [
    ...new Set([
      ...demandes.map((d) => d.salle_id).filter(Boolean),
      ...demandesVisite.map((d) => d.salle_id).filter(Boolean),
    ]),
  ];

  const { data: sallesData } =
    allSalleIds.length > 0
      ? await supabase
          .from("salles")
          .select("id, name, city, images, capacity, slug")
          .in("id", allSalleIds)
      : { data: [] };
  const salleMap = new Map((sallesData ?? []).map((s) => [s.id, s]));

  type ListItem =
    | { kind: "demande"; id: string; salle_id: string; status: string; created_at: string; salle?: { id: string; name: string; city: string; images?: unknown; capacity?: number; slug: string } | undefined } & Record<string, unknown>
    | { kind: "visite"; id: string; salle_id: string; status: string; created_at: string; date_visite: string; heure_debut: string; heure_fin: string; type_evenement: string | null; salle?: { id: string; name: string; city: string; images?: unknown; capacity?: number; slug: string } | undefined };

  const demandesWithSalle: ListItem[] = demandes.map((d) => ({
    kind: "demande" as const,
    ...d,
    salle: salleMap.get(d.salle_id),
  }));

  const visitesWithSalle: ListItem[] = demandesVisite.map((d) => ({
    kind: "visite" as const,
    id: d.id,
    salle_id: d.salle_id,
    status: d.status,
    created_at: d.created_at,
    date_visite: d.date_visite,
    heure_debut: d.heure_debut ?? "",
    heure_fin: d.heure_fin ?? "",
    type_evenement: d.type_evenement ? (TYPE_EVENEMENT_LABEL[d.type_evenement] ?? d.type_evenement) : null,
    salle: salleMap.get(d.salle_id),
  }));

  const merged = [...demandesWithSalle, ...visitesWithSalle].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filtered = merged.filter((d) => matchesFilter(d.status, statusFilter));
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (page - 1) * PAGE_SIZE;
  const list = filtered.slice(from, from + PAGE_SIZE);

  const counts = {
    all: merged.length,
    sent: merged.filter((d) => d.status === "sent").length,
    viewed: merged.filter((d) =>
      ["sent", "viewed", "pending", "reschedule_proposed"].includes(d.status)
    ).length,
    replied: merged.filter((d) => ["replied", "accepted"].includes(d.status)).length,
    rejected: merged.filter((d) => ["rejected", "refused"].includes(d.status)).length,
  };

  const tabs = [
    { key: "all" as const, label: "Toutes", count: counts.all },
    { key: "viewed" as const, label: "En attente", count: counts.viewed },
    { key: "replied" as const, label: "Répondues", count: counts.replied },
    { key: "rejected" as const, label: "Refusées", count: counts.rejected },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Mes demandes et visites</h1>
        <p className="mt-1 text-slate-500">Suivez l&apos;état de vos demandes de location et de vos visites.</p>
      </div>

      <div className="mb-6 -mx-4 overflow-x-auto border-b border-slate-200 px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
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
              ? "Aucune demande envoyée"
              : `Aucune demande ${STATUT_LABEL[statusFilter] ?? statusFilter}`}
          </p>
          <Link href="/rechercher">
            <Button className="mt-4 bg-gs-orange hover:brightness-95">
              Rechercher une salle
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((d) => {
              const salle = d.salle;
              const img =
                salle?.images && Array.isArray(salle.images) && salle.images[0]
                  ? String(salle.images[0])
                  : "/img.png";
              const isVisite = d.kind === "visite";
              const hDebut = isVisite
                ? formatTime((d as { heure_debut: string }).heure_debut ?? null)
                : formatTime((d as { heure_debut_souhaitee?: string }).heure_debut_souhaitee ?? null);
              const hFin = isVisite
                ? formatTime((d as { heure_fin: string }).heure_fin ?? null)
                : formatTime((d as { heure_fin_souhaitee?: string }).heure_fin_souhaitee ?? null);
              const horaires = hDebut && hFin ? `${hDebut}-${hFin}` : hDebut || "";
              const dateRaw = isVisite
                ? (d as { date_visite: string }).date_visite
                : (d as { date_debut?: string }).date_debut;
              const dateStr = dateRaw
                ? format(new Date(dateRaw + (isVisite ? "T12:00:00" : "")), "d MMMM yyyy", {
                    locale: fr,
                  })
                : "—";
              const dateDisplay = horaires ? `${dateStr}, ${horaires}` : dateStr;

              return (
                <article key={`${d.kind}-${d.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <Image src={img} alt="" fill className="object-cover" sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={isVisite ? `/dashboard/demandes/visite/${d.id}` : `/dashboard/demandes/${d.id}`}
                        className="block truncate text-base font-semibold text-black hover:underline"
                      >
                        {salle?.name ?? "—"}
                      </Link>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {isVisite ? ((d as { type_evenement?: string | null }).type_evenement ?? "Visite") : ((d as { type_evenement?: string }).type_evenement ?? "—")}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">{salle?.city ?? "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-600">{dateDisplay}</p>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUT_BADGE[d.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUT_LABEL[d.status] ?? d.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isVisite && d.status === "reschedule_proposed" ? (
                      <ReprogrammationVisiteActions demandeVisiteId={d.id} compact />
                    ) : isVisite ? (
                      <ContactVisiteSeekerButton demandeVisiteId={d.id} status={d.status} />
                    ) : (
                      <ContactProprietaireDemandeButton demandeId={d.id} />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Salle</th>
                  <th className="px-4 py-3">Type d&apos;événement</th>
                  <th className="px-4 py-3">Date</th>
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
                  const isVisite = d.kind === "visite";
                  const hDebut = isVisite
                    ? formatTime((d as { heure_debut: string }).heure_debut ?? null)
                    : formatTime((d as { heure_debut_souhaitee?: string }).heure_debut_souhaitee ?? null);
                  const hFin = isVisite
                    ? formatTime((d as { heure_fin: string }).heure_fin ?? null)
                    : formatTime((d as { heure_fin_souhaitee?: string }).heure_fin_souhaitee ?? null);
                  const horaires = hDebut && hFin ? `${hDebut}-${hFin}` : hDebut || "";
                  const dateRaw = isVisite
                    ? (d as { date_visite: string }).date_visite
                    : (d as { date_debut?: string }).date_debut;
                  const dateStr = dateRaw
                    ? format(new Date(dateRaw + (isVisite ? "T12:00:00" : "")), "d MMMM yyyy", {
                        locale: fr,
                      })
                    : "—";
                  const dateDisplay = horaires ? `${dateStr}, ${horaires}` : dateStr;

                  return (
                    <tr key={`${d.kind}-${d.id}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                          </div>
                          <div>
                            <Link
                              href={
                                isVisite
                                  ? `/dashboard/demandes/visite/${d.id}`
                                  : `/dashboard/demandes/${d.id}`
                              }
                              className="font-medium text-black hover:underline"
                            >
                              {salle?.name ?? "—"}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {isVisite ? "Visite" : `Capacité ${salle?.capacity ?? "—"} pers.`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {isVisite ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {(d as { type_evenement?: string | null }).type_evenement ?? "Visite"}
                          </span>
                        ) : (
                          (d as { type_evenement?: string }).type_evenement ?? "—"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{dateDisplay}</td>
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
                              ["sent", "pending"].includes(d.status)
                                ? "bg-emerald-500"
                                : ["viewed", "reschedule_proposed"].includes(d.status)
                                  ? "bg-amber-500"
                                  : ["replied", "accepted"].includes(d.status)
                                    ? "bg-gs-orange"
                                    : "bg-red-500"
                            }`}
                          />
                          {STATUT_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {isVisite && d.status === "reschedule_proposed" ? (
                          <ReprogrammationVisiteActions
                            demandeVisiteId={d.id}
                            compact
                          />
                        ) : isVisite ? (
                          <ContactVisiteSeekerButton
                            demandeVisiteId={d.id}
                            status={d.status}
                          />
                        ) : (
                          <ContactProprietaireDemandeButton demandeId={d.id} />
                        )}
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
