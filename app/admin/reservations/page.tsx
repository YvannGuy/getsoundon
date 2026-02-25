import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

type OfferRow = {
  id: string;
  salle_id: string;
  owner_id: string;
  seeker_id: string;
  amount_cents: number;
  deposit_hold_status: string | null;
  created_at: string;
};

type EDLRow = {
  offer_id: string;
  role: "owner" | "seeker";
  phase: "before" | "after";
};

type CaseRow = {
  id: string;
  offer_id: string | null;
  case_type: "refund_full" | "refund_partial" | "dispute";
  status: "open" | "resolved" | "rejected";
};

type FilterKey = "all" | "a_traiter" | "edl_incomplet" | "litige_ouvert" | "caution_a_arbitrer" | "terminees";

export const dynamic = "force-dynamic";

function filterPillClass(active: boolean) {
  return active
    ? "rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white"
    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200";
}

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const currentFilter: FilterKey = [
    "a_traiter",
    "edl_incomplet",
    "litige_ouvert",
    "caution_a_arbitrer",
    "terminees",
  ].includes(String(statut))
    ? (statut as FilterKey)
    : "all";

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, salle_id, owner_id, seeker_id, amount_cents, deposit_hold_status, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(200);

  const offerRows = (offers ?? []) as OfferRow[];
  const offerIds = offerRows.map((o) => o.id);
  const salleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const profileIds = [...new Set(offerRows.flatMap((o) => [o.owner_id, o.seeker_id]))];

  const [{ data: salles }, { data: profiles }] = await Promise.all([
    salleIds.length
      ? admin.from("salles").select("id, name").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    profileIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", profileIds)
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
          .select("id, offer_id, case_type, status")
          .in("offer_id", offerIds),
      ]);
      edlRows = (edl ?? []) as EDLRow[];
      caseRows = (cases ?? []) as CaseRow[];
    } catch {
      // Tables EDL/litiges pas encore migrées.
    }
  }

  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Utilisateur"]));
  const edlSet = new Set(edlRows.map((r) => `${r.offer_id}:${r.role}:${r.phase}`));
  const openDisputeOffers = new Set(
    caseRows.filter((c) => c.case_type === "dispute" && c.status === "open").map((c) => c.offer_id)
  );

  const rows = offerRows.map((offer) => {
    const ownerBefore = edlSet.has(`${offer.id}:owner:before`);
    const ownerAfter = edlSet.has(`${offer.id}:owner:after`);
    const seekerBefore = edlSet.has(`${offer.id}:seeker:before`);
    const seekerAfter = edlSet.has(`${offer.id}:seeker:after`);
    const ownerIncomplete = !ownerBefore || !ownerAfter;
    const seekerIncomplete = !seekerBefore || !seekerAfter;
    const edlIncomplete = ownerIncomplete || seekerIncomplete;
    const litigeOuvert = openDisputeOffers.has(offer.id);
    const cautionAArbitrer = offer.deposit_hold_status === "claim_requested";
    const aTraiter = edlIncomplete || litigeOuvert || cautionAArbitrer;
    return {
      offer,
      ownerIncomplete,
      seekerIncomplete,
      edlIncomplete,
      litigeOuvert,
      cautionAArbitrer,
      aTraiter,
    };
  });

  const counts = {
    all: rows.length,
    a_traiter: rows.filter((r) => r.aTraiter).length,
    edl_incomplet: rows.filter((r) => r.edlIncomplete).length,
    litige_ouvert: rows.filter((r) => r.litigeOuvert).length,
    caution_a_arbitrer: rows.filter((r) => r.cautionAArbitrer).length,
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
      case "caution_a_arbitrer":
        return r.cautionAArbitrer;
      case "terminees":
        return !r.aTraiter;
      default:
        return true;
    }
  });

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-black">Réservations payées</h1>
      <p className="mt-2 text-slate-600">
        Pilotage admin des réservations: suivi EDL, cautions, remboursements et litiges.
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
        <Card className="border-violet-200">
          <CardContent className="p-4">
            <p className="text-xs text-violet-700">Cautions à arbitrer</p>
            <p className="text-xl font-bold text-violet-800">{counts.caution_a_arbitrer}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/reservations" className={filterPillClass(currentFilter === "all")}>
          Toutes ({counts.all})
        </Link>
        <Link href="/admin/reservations?statut=a_traiter" className={filterPillClass(currentFilter === "a_traiter")}>
          À traiter ({counts.a_traiter})
        </Link>
        <Link href="/admin/reservations?statut=edl_incomplet" className={filterPillClass(currentFilter === "edl_incomplet")}>
          EDL incomplet ({counts.edl_incomplet})
        </Link>
        <Link href="/admin/reservations?statut=litige_ouvert" className={filterPillClass(currentFilter === "litige_ouvert")}>
          Litige ouvert ({counts.litige_ouvert})
        </Link>
        <Link
          href="/admin/reservations?statut=caution_a_arbitrer"
          className={filterPillClass(currentFilter === "caution_a_arbitrer")}
        >
          Caution à arbitrer ({counts.caution_a_arbitrer})
        </Link>
        <Link href="/admin/reservations?statut=terminees" className={filterPillClass(currentFilter === "terminees")}>
          Terminées ({counts.terminees})
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {filteredRows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucune réservation pour ce filtre.
            </CardContent>
          </Card>
        ) : (
          filteredRows.map(({ offer, ownerIncomplete, seekerIncomplete, litigeOuvert, cautionAArbitrer, aTraiter }) => {
            return (
              <Card key={offer.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{salleMap.get(offer.salle_id) ?? "Salle"}</CardTitle>
                  <CardDescription>
                    Propriétaire: {profileMap.get(offer.owner_id) ?? "—"} - Locataire: {profileMap.get(offer.seeker_id) ?? "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-sm text-slate-600">
                    <div>
                      Owner EDL: {ownerIncomplete ? "incomplet" : "complet"} - Seeker EDL: {seekerIncomplete ? "incomplet" : "complet"} - Caution: {offer.deposit_hold_status ?? "—"}
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                      {cautionAArbitrer && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                          Caution à arbitrer
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/etats-des-lieux?offerId=${offer.id}`} className="rounded border px-3 py-1.5 text-sm">
                      Voir EDL
                    </Link>
                    <Link href={`/admin/cautions?offerId=${offer.id}`} className="rounded border px-3 py-1.5 text-sm">
                      Refund / caution
                    </Link>
                    <Link href={`/admin/etats-des-lieux?offerId=${offer.id}&caseType=dispute`} className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white">
                      Traiter litige
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
