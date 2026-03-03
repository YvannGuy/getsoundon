import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelReservationButton } from "@/components/dashboard/cancel-reservation-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type OfferRow = {
  id: string;
  salle_id: string;
  owner_id: string;
  amount_cents: number;
  cancellation_policy: "strict" | "moderate" | "flexible" | null;
  date_debut: string | null;
  date_fin: string | null;
  created_at: string;
};

type EDLRow = {
  offer_id: string;
  role: "owner" | "seeker";
  phase: "before" | "after";
};

type CaseRow = {
  offer_id: string | null;
  case_type: "refund_full" | "refund_partial" | "dispute";
  status: "open" | "resolved" | "rejected";
};

type FilterKey = "all" | "a_traiter" | "edl_incomplet" | "litige_ouvert" | "terminees";

export const dynamic = "force-dynamic";

function filterPillClass(active: boolean) {
  return active
    ? "inline-flex h-11 items-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white"
    : "inline-flex h-11 items-center rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200";
}

function policyLabel(value: OfferRow["cancellation_policy"]) {
  if (value === "moderate") return "Modérée";
  if (value === "flexible") return "Flexible";
  return "Stricte";
}

export default async function DashboardReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const currentFilter: FilterKey = ["a_traiter", "edl_incomplet", "litige_ouvert", "terminees"].includes(
    String(statut)
  )
    ? (statut as FilterKey)
    : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, salle_id, owner_id, amount_cents, cancellation_policy, date_debut, date_fin, created_at")
    .eq("seeker_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(120);

  const offerRows = (offers ?? []) as OfferRow[];
  const offerIds = offerRows.map((o) => o.id);
  const salleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const ownerIds = [...new Set(offerRows.map((o) => o.owner_id))];

  const [{ data: salles }, { data: owners }] = await Promise.all([
    salleIds.length
      ? admin.from("salles").select("id, name").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ownerIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  let edlRows: EDLRow[] = [];
  let caseRows: CaseRow[] = [];
  if (offerIds.length > 0) {
    try {
      const [{ data: edl }, { data: cases }] = await Promise.all([
        admin.from("etat_des_lieux").select("offer_id, role, phase").in("offer_id", offerIds),
        admin
          .from("refund_cases")
          .select("offer_id, case_type, status")
          .in("offer_id", offerIds),
      ]);
      edlRows = (edl ?? []) as EDLRow[];
      caseRows = (cases ?? []) as CaseRow[];
    } catch {
      // Table EDL pas encore migrée.
    }
  }

  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.full_name || o.email || "Propriétaire"]));
  const edlSet = new Set(edlRows.map((r) => `${r.offer_id}:${r.role}:${r.phase}`));
  const openDisputeOffers = new Set(
    caseRows.filter((c) => c.case_type === "dispute" && c.status === "open").map((c) => c.offer_id)
  );

  const rows = offerRows.map((offer) => {
    const beforeDone = edlSet.has(`${offer.id}:seeker:before`);
    const afterDone = edlSet.has(`${offer.id}:seeker:after`);
    const edlIncomplete = !beforeDone || !afterDone;
    const litigeOuvert = openDisputeOffers.has(offer.id);
    const aTraiter = edlIncomplete || litigeOuvert;
    return { offer, beforeDone, afterDone, edlIncomplete, litigeOuvert, aTraiter };
  });

  const counts = {
    all: rows.length,
    a_traiter: rows.filter((r) => r.aTraiter).length,
    edl_incomplet: rows.filter((r) => r.edlIncomplete).length,
    litige_ouvert: rows.filter((r) => r.litigeOuvert).length,
    terminees: rows.filter((r) => !r.aTraiter).length,
  };

  const filteredRows = rows.filter((r) => {
    switch (currentFilter) {
      case "a_traiter":
        return r.aTraiter;
      case "edl_incomplet":
        return r.edlIncomplete;
      case "litige_ouvert":
        return r.litigeOuvert;
      case "terminees":
        return !r.aTraiter;
      default:
        return true;
    }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Réservations payées</h1>
      <p className="mt-2 text-slate-600">
        Suivez vos réservations confirmées et les prochaines actions (état des lieux, litige, suivi).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Réservations</p>
            <p className="text-xl font-bold text-black">{counts.all}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700">À traiter</p>
            <p className="text-xl font-bold text-amber-800">{counts.a_traiter}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-red-700">Litiges ouverts</p>
            <p className="text-xl font-bold text-red-800">{counts.litige_ouvert}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700">Terminées</p>
            <p className="text-xl font-bold text-emerald-800">{counts.terminees}</p>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-0 z-10 mt-4 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link href="/dashboard/reservations" className={filterPillClass(currentFilter === "all")}>
          Toutes ({counts.all})
          </Link>
          <Link href="/dashboard/reservations?statut=a_traiter" className={filterPillClass(currentFilter === "a_traiter")}>
          À traiter ({counts.a_traiter})
          </Link>
          <Link
            href="/dashboard/reservations?statut=edl_incomplet"
            className={filterPillClass(currentFilter === "edl_incomplet")}
          >
          Etat des lieux incomplet ({counts.edl_incomplet})
          </Link>
          <Link
            href="/dashboard/reservations?statut=litige_ouvert"
            className={filterPillClass(currentFilter === "litige_ouvert")}
          >
          Litige ouvert ({counts.litige_ouvert})
          </Link>
          <Link href="/dashboard/reservations?statut=terminees" className={filterPillClass(currentFilter === "terminees")}>
          Terminées ({counts.terminees})
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-4 pb-24 md:pb-0">
        {filteredRows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucune réservation pour ce filtre.
            </CardContent>
          </Card>
        ) : (
          filteredRows.map(({ offer, beforeDone, afterDone, aTraiter, litigeOuvert }) => {
            return (
              <Card key={offer.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{salleMap.get(offer.salle_id) ?? "Salle"}</CardTitle>
                  <CardDescription>
                    Propriétaire: {ownerMap.get(offer.owner_id) ?? "—"} - {(offer.amount_cents / 100).toFixed(2)} €
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-sm text-slate-600">
                    <div>
                      EDL entrée: {beforeDone ? "fait" : "à faire"} - EDL sortie: {afterDone ? "fait" : "à faire"}
                    </div>
                    <div>
                      Annulation: {policyLabel(offer.cancellation_policy)} (impact variable selon délai avant l&apos;événement)
                    </div>
                    <div className="flex gap-2">
                      {aTraiter ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Priorité: à traiter
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Terminée
                        </span>
                      )}
                      {litigeOuvert && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Litige ouvert
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/messagerie?offerId=${offer.id}`} className="rounded border px-3 py-1.5 text-sm">
                      Messagerie
                    </Link>
                    <Link href="/dashboard/etats-des-lieux" className="rounded border px-3 py-1.5 text-sm">
                      États des lieux
                    </Link>
                    <CancelReservationButton
                      offerId={offer.id}
                      salleName={salleMap.get(offer.salle_id) ?? "Salle"}
                      amountCents={offer.amount_cents}
                      policyLabel={policyLabel(offer.cancellation_policy)}
                      eventStartAt={offer.date_debut}
                      cancellationPolicy={offer.cancellation_policy}
                      actor="seeker"
                      disabled={litigeOuvert}
                      disabledReason="Annulation indisponible: un litige est déjà ouvert."
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/etats-des-lieux"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
          >
            Voir EDL
          </Link>
          <Link
            href="/dashboard/messagerie"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#213398] text-sm font-medium text-white"
          >
            Contacter
          </Link>
        </div>
      </div>
    </div>
  );
}
