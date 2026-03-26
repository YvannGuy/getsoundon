import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getUserOrNull } from "@/lib/supabase/server";
import { CalendarDays, TrendingUp } from "lucide-react";

import { CalendrierVisitesManager } from "@/components/proprietaire/calendrier-visites-manager";
import { VisitesTable } from "@/components/proprietaire/visites-table";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "viewed" | "replied" | "rejected";

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}h${m[2]}` : "";
}

function matchesFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "viewed") return ["pending", "reschedule_proposed"].includes(status);
  if (filter === "replied") return status === "accepted";
  if (filter === "rejected") return status === "refused";
  return false;
}

const STATUT_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  reschedule_proposed: "Reprogrammation proposée",
};

const TYPE_EVENEMENT_LABEL: Record<string, string> = {
  "culte-regulier": "Culte régulier",
  conference: "Conférence",
  celebration: "Célébration",
  bapteme: "Baptême",
  retraite: "Retraite",
};

const STATUT_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-700",
  reschedule_proposed: "bg-sky-100 text-sky-700",
};

export default async function VisitesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; tab?: string }>;
}) {
  const { user, supabase } = await getUserOrNull();
  if (!user) redirect("/auth");

  const { status: statusParam, page: pageParam, tab: tabParam } = await searchParams;
  const tab = tabParam === "calendar" ? "calendar" : "requests";
  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);
  const statusFilter: StatusFilter =
    statusParam === "viewed" || statusParam === "replied" || statusParam === "rejected"
      ? statusParam
      : "all";

  const { data: mySalles } = await supabase
    .from("salles")
    .select(
      "id, name, slug, city, images, horaires_par_jour, jours_visite, visite_dates, visite_heure_debut, visite_heure_fin, visite_horaires_par_date"
    )
    .eq("owner_id", user.id);
  const salleIds = (mySalles ?? []).map((s) => s.id);
  const salleMap = new Map((mySalles ?? []).map((s) => [s.id, s]));

  if (salleIds.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-black">Demandes de visites</h1>
        <p className="mt-4 text-slate-600">Aucune annonce. Les demandes de visite apparaîtront ici.</p>
        <Link href="/onboarding/salle" className="mt-4 inline-block text-gs-orange hover:underline">
          Ajouter une salle →
        </Link>
      </div>
    );
  }

  let demandes: { id: string; salle_id: string; seeker_id: string; date_visite: string; heure_debut: string; heure_fin: string; type_evenement: string | null; message: string | null; status: string; created_at: string }[] = [];
  try {
    const res = await supabase
      .from("demandes_visite")
      .select("id, salle_id, seeker_id, date_visite, heure_debut, heure_fin, type_evenement, message, status, created_at")
      .in("salle_id", salleIds)
      .order("created_at", { ascending: false });
    demandes = (res.data ?? []) as typeof demandes;
  } catch {
    // Table peut ne pas exister si migration non exécutée
  }

  const seekerIds = [...new Set(demandes.map((d) => d.seeker_id))];
  const { data: profiles } = seekerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", seekerIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [(p as { id: string }).id, p]));

  const filtered = demandes.filter((d) => matchesFilter(d.status, statusFilter));
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const list = filtered.slice(from, from + PAGE_SIZE);

  const counts = {
    all: demandes.length,
    viewed: demandes.filter((d) => ["pending", "reschedule_proposed"].includes(d.status)).length,
    replied: demandes.filter((d) => d.status === "accepted").length,
    rejected: demandes.filter((d) => d.status === "refused").length,
  };

  const totalWithReply = demandes.filter((d) => ["accepted", "refused"].includes(d.status)).length;
  const tauxReponse =
    demandes.length > 0 ? Math.round((totalWithReply / demandes.length) * 100) : 0;

  const tabs = [
    { key: "all" as const, label: "Toutes", count: counts.all },
    { key: "viewed" as const, label: "En attente", count: counts.viewed },
    { key: "replied" as const, label: "Répondues", count: counts.replied },
    { key: "rejected" as const, label: "Refusées", count: counts.rejected },
  ];

  const listWithDetails = list.map((d) => {
    const salle = salleMap.get(d.salle_id) as { name: string; slug?: string; city?: string; images?: unknown } | undefined;
    const profile = profileMap.get(d.seeker_id) as { full_name?: string } | undefined;
    const hDebut = formatTime(d.heure_debut ?? null);
    const hFin = formatTime(d.heure_fin ?? null);
    const dateStr = d.date_visite
      ? format(new Date(d.date_visite + "T12:00:00"), "d MMMM yyyy", { locale: fr })
      : "—";
    const horaires = hDebut && hFin ? `${hDebut}-${hFin}` : hDebut || "";
    const dateDisplay = horaires ? `${dateStr}, ${horaires}` : dateStr;
    const img =
      salle?.images && Array.isArray(salle.images) && salle.images[0]
        ? String(salle.images[0])
        : "/img.png";

    const typeEvenementLabel = d.type_evenement
      ? (TYPE_EVENEMENT_LABEL as Record<string, string>)[d.type_evenement] ?? d.type_evenement
      : "Visite";
    return {
      id: d.id,
      salleName: salle?.name ?? "—",
      salleSlug: salle?.slug,
      salleCity: salle?.city ?? "—",
      salleImage: img,
      seekerName: profile?.full_name ?? "Locataire",
      dateDisplay,
      typeEvenement: typeEvenementLabel,
      message: d.message,
      status: d.status,
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Demandes de visites</h1>
        <p className="mt-1 text-slate-500">Gérez vos demandes et votre calendrier de visites</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <Link
          href="/proprietaire/visites"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "requests" ? "bg-gs-orange text-white" : "text-slate-600 hover:bg-slate-100 hover:text-black"
          }`}
        >
          Demandes
        </Link>
        <Link
          href="/proprietaire/visites?tab=calendar"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "calendar" ? "bg-gs-orange text-white" : "text-slate-600 hover:bg-slate-100 hover:text-black"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Calendrier visites
        </Link>
      </div>

      {tab === "calendar" ? (
        <CalendrierVisitesManager
          salles={(mySalles ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            city: s.city ?? null,
            horaires_par_jour:
              (s as { horaires_par_jour?: Record<string, { debut: string; fin: string }> | null }).horaires_par_jour ??
              null,
            jours_visite: (s as { jours_visite?: string[] | null }).jours_visite ?? null,
            visite_dates: (s as { visite_dates?: string[] | null }).visite_dates ?? null,
            visite_heure_debut: (s as { visite_heure_debut?: string | null }).visite_heure_debut ?? null,
            visite_heure_fin: (s as { visite_heure_fin?: string | null }).visite_heure_fin ?? null,
            visite_horaires_par_date:
              (s as { visite_horaires_par_date?: Record<string, { debut: string; fin: string }> | null })
                .visite_horaires_par_date ?? null,
          }))}
        />
      ) : (
        <>

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
              ? "Bonne réactivité"
              : "Répondez aux demandes pour améliorer vos statistiques"}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map((tab) => {
          const isActive =
            (tab.key === "all" && statusFilter === "all") || (tab.key !== "all" && statusFilter === tab.key);
          const href =
            tab.key === "all"
              ? "/proprietaire/visites?page=1"
              : `/proprietaire/visites?page=1&status=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500">
            {statusFilter === "all"
              ? "Aucune demande de visite"
              : `Aucune demande ${statusFilter === "viewed" ? "en attente" : statusFilter === "replied" ? "répondue" : "refusée"}`}
          </p>
        </div>
      ) : (
        <>
          <VisitesTable list={listWithDetails} />
          <Pagination
            baseUrl="/proprietaire/visites"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            queryParams={statusFilter !== "all" ? `&status=${statusFilter}` : ""}
          />
        </>
      )}
        </>
      )}
    </div>
  );
}
