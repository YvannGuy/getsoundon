import Link from "next/link";

import { AdminEdlPhotoViewer } from "@/components/etats-des-lieux/admin-edl-photo-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

type OfferRow = {
  id: string;
  salle_id: string;
  owner_id: string;
  seeker_id: string;
  amount_cents: number;
  created_at: string;
};

type EDLRow = {
  id: string;
  offer_id: string;
  role: "owner" | "seeker";
  phase: "before" | "after";
  notes: string | null;
  submitted_at: string;
};

type PhotoRow = {
  id: string;
  etat_des_lieux_id: string;
  offer_id: string;
  storage_path: string;
  description: string | null;
  created_at: string | null;
};

type CaseRow = {
  id: string;
  offer_id: string | null;
  case_type: "refund_full" | "refund_partial" | "dispute";
  status: "open" | "resolved" | "rejected";
  side: "owner" | "seeker" | "none";
  reason: string | null;
  amount_cents: number;
  created_at: string;
};

type EvidenceRow = {
  id: string;
  case_id: string;
  storage_path: string;
  description: string | null;
};

const PHASE_LABEL: Record<"before" | "after", string> = {
  before: "Avant événement (entrée)",
  after: "Après événement (sortie)",
};

const CASE_LABEL: Record<string, string> = {
  refund_full: "Remboursement total",
  refund_partial: "Remboursement partiel",
  dispute: "Litige",
};

export const dynamic = "force-dynamic";

export default async function AdminEtatsDesLieuxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedStatus =
    resolvedSearchParams.status === "pending" ||
    resolvedSearchParams.status === "complete" ||
    resolvedSearchParams.status === "dispute"
      ? resolvedSearchParams.status
      : "all";
  const selectedSort =
    resolvedSearchParams.sort === "recent" || resolvedSearchParams.sort === "amount"
      ? resolvedSearchParams.sort
      : "critical";

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, salle_id, owner_id, seeker_id, amount_cents, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(150);

  const offerRows = (offers ?? []) as OfferRow[];
  const offerIds = offerRows.map((o) => o.id);
  const salleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const profileIds = [...new Set(offerRows.flatMap((o) => [o.owner_id, o.seeker_id]))];

  const [{ data: salles }, { data: profiles }] = await Promise.all([
    salleIds.length > 0
      ? admin.from("salles").select("id, name").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    profileIds.length > 0
      ? admin.from("profiles").select("id, full_name, email").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  let edlRows: EDLRow[] = [];
  let photoRows: PhotoRow[] = [];
  let caseRows: CaseRow[] = [];
  let evidenceRows: EvidenceRow[] = [];

  if (offerIds.length > 0) {
    try {
      const [{ data: edl }, { data: photos }, { data: cases }] = await Promise.all([
        admin
          .from("etat_des_lieux")
          .select("id, offer_id, role, phase, notes, submitted_at")
          .in("offer_id", offerIds),
        admin
          .from("etat_des_lieux_photos")
          .select("id, etat_des_lieux_id, offer_id, storage_path, description, created_at")
          .in("offer_id", offerIds),
        admin
          .from("refund_cases")
          .select("id, offer_id, case_type, status, side, reason, amount_cents, created_at")
          .in("offer_id", offerIds)
          .order("created_at", { ascending: false }),
      ]);
      edlRows = (edl ?? []) as EDLRow[];
      photoRows = (photos ?? []) as PhotoRow[];
      caseRows = (cases ?? []) as CaseRow[];

      const caseIds = caseRows.map((c) => c.id);
      if (caseIds.length > 0) {
        const { data: evidences } = await admin
          .from("refund_case_evidences")
          .select("id, case_id, storage_path, description")
          .in("case_id", caseIds);
        evidenceRows = (evidences ?? []) as EvidenceRow[];
      }
    } catch {
      // Les tables EDL peuvent ne pas exister tant que la migration SQL n'est pas exécutée.
    }
  }

  const fileUrlMap = new Map<string, string>();
  for (const photo of photoRows) {
    const { data } = await admin.storage.from("etat-des-lieux").createSignedUrl(photo.storage_path, 60 * 60);
    if (data?.signedUrl) fileUrlMap.set(photo.id, data.signedUrl);
  }
  for (const evidence of evidenceRows) {
    const { data } = await admin.storage.from("etat-des-lieux").createSignedUrl(evidence.storage_path, 60 * 60);
    if (data?.signedUrl) fileUrlMap.set(evidence.id, data.signedUrl);
  }

  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Utilisateur"])
  );

  const edlByOffer = new Map<string, EDLRow[]>();
  for (const row of edlRows) {
    const list = edlByOffer.get(row.offer_id) ?? [];
    list.push(row);
    edlByOffer.set(row.offer_id, list);
  }

  const photosByEdl = new Map<string, PhotoRow[]>();
  for (const row of photoRows) {
    const list = photosByEdl.get(row.etat_des_lieux_id) ?? [];
    list.push(row);
    photosByEdl.set(row.etat_des_lieux_id, list);
  }

  const casesByOffer = new Map<string, CaseRow[]>();
  for (const row of caseRows) {
    if (!row.offer_id) continue;
    const list = casesByOffer.get(row.offer_id) ?? [];
    list.push(row);
    casesByOffer.set(row.offer_id, list);
  }

  const evidencesByCase = new Map<string, EvidenceRow[]>();
  for (const row of evidenceRows) {
    const list = evidencesByCase.get(row.case_id) ?? [];
    list.push(row);
    evidencesByCase.set(row.case_id, list);
  }

  const totalOffers = offerRows.length;
  const totalDepots = edlRows.length;
  const totalLitiges = caseRows.length;
  const offerViewRows = offerRows.map((offer) => {
    const offerEdl = edlByOffer.get(offer.id) ?? [];
    const offerCases = casesByOffer.get(offer.id) ?? [];
    const ownerCount = offerEdl.filter((r) => r.role === "owner").length;
    const seekerCount = offerEdl.filter((r) => r.role === "seeker").length;
    const completionCount = ownerCount + seekerCount;
    const isComplete = ownerCount >= 2 && seekerCount >= 2;
    const openCases = offerCases.filter((c) => c.status === "open").length;

    return {
      ...offer,
      ownerCount,
      seekerCount,
      completionCount,
      isComplete,
      openCases,
    };
  });

  const filteredOfferRows = offerViewRows
    .filter((offer) => {
      if (selectedStatus === "pending") return !offer.isComplete;
      if (selectedStatus === "complete") return offer.isComplete;
      if (selectedStatus === "dispute") return offer.openCases > 0;
      return true;
    })
    .sort((a, b) => {
      if (selectedSort === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (selectedSort === "amount") {
        return b.amount_cents - a.amount_cents;
      }
      // critical: litiges ouverts d'abord, puis dossiers incomplets, puis plus récents
      if (b.openCases !== a.openCases) return b.openCases - a.openCases;
      if (Number(a.isComplete) !== Number(b.isComplete)) return Number(a.isComplete) - Number(b.isComplete);
      if (a.completionCount !== b.completionCount) return a.completionCount - b.completionCount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const makeHref = (status: string, sort: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (sort !== "critical") params.set("sort", sort);
    const query = params.toString();
    return `/admin/etats-des-lieux${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5 p-4 pb-24 md:space-y-6 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">États des lieux</h1>
        <p className="mt-1 text-sm text-slate-600 md:text-base">
          Vue consolidée des dépôts avant/après et des dossiers litige liés aux réservations payées.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Réservations suivies</p>
          <p className="mt-1 text-2xl font-bold text-black">{totalOffers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Dépôts reçus</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{totalDepots}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Dossiers litige/remboursement</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{totalLitiges}</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Règles qualité photo</p>
        <p className="mt-1 text-blue-800">
          10 photos maximum par dépôt, nettes, éclairées et représentatives des zones clés de la salle.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Toutes" },
              { id: "pending", label: "À traiter" },
              { id: "complete", label: "Complètes" },
              { id: "dispute", label: "Litiges ouverts" },
            ].map((option) => (
              <Link
                key={option.id}
                href={makeHref(option.id, selectedSort)}
                className={
                  option.id === selectedStatus
                    ? "rounded-full bg-gs-orange px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                }
              >
                {option.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "critical", label: "Critiques d'abord" },
              { id: "recent", label: "Plus récentes" },
              { id: "amount", label: "Montant décroissant" },
            ].map((option) => (
              <Link
                key={option.id}
                href={makeHref(selectedStatus, option.id)}
                className={
                  option.id === selectedSort
                    ? "rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Affichage : {filteredOfferRows.length} / {totalOffers} réservations
        </p>
      </div>

      <div className="space-y-4">
        {offerRows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucune réservation payée disponible.
            </CardContent>
          </Card>
        ) : (
          filteredOfferRows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">
                Aucun résultat pour ce filtre.
              </CardContent>
            </Card>
          ) : (
            filteredOfferRows.map((offer, offerIndex) => {
              const offerEdl = edlByOffer.get(offer.id) ?? [];
              const offerCases = casesByOffer.get(offer.id) ?? [];
              return (
                <details
                  key={offer.id}
                  open={offerIndex === 0}
                  className="rounded-xl border border-slate-200 bg-white p-4 md:p-5"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-black md:text-lg">
                          {salleMap.get(offer.salle_id) ?? "Salle"} • {(offer.amount_cents / 100).toFixed(2)} €
                        </p>
                        <p className="mt-1 text-xs text-slate-500 md:text-sm">
                          Propriétaire : {profileMap.get(offer.owner_id) ?? "—"} • Locataire : {profileMap.get(offer.seeker_id) ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Owner: {offer.ownerCount}/2
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Seeker: {offer.seekerCount}/2
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          Litiges: {offerCases.length}
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 space-y-4">
                    <AdminEdlPhotoViewer
                      phases={(["before", "after"] as const).map((phase) => {
                        const ownerEdl = offerEdl.find((r) => r.role === "owner" && r.phase === phase);
                        const seekerEdl = offerEdl.find((r) => r.role === "seeker" && r.phase === phase);
                        return {
                          phase,
                          label: PHASE_LABEL[phase],
                          owner: ownerEdl
                            ? {
                                notes: ownerEdl.notes,
                                submittedAt: ownerEdl.submitted_at,
                                photos: (photosByEdl.get(ownerEdl.id) ?? [])
                                  .map((photo) => ({
                                    id: photo.id,
                                    url: fileUrlMap.get(photo.id) ?? "",
                                    uploadedAt: photo.created_at,
                                  }))
                                  .filter((photo) => !!photo.url),
                              }
                            : null,
                          seeker: seekerEdl
                            ? {
                                notes: seekerEdl.notes,
                                submittedAt: seekerEdl.submitted_at,
                                photos: (photosByEdl.get(seekerEdl.id) ?? [])
                                  .map((photo) => ({
                                    id: photo.id,
                                    url: fileUrlMap.get(photo.id) ?? "",
                                    uploadedAt: photo.created_at,
                                  }))
                                  .filter((photo) => !!photo.url),
                              }
                            : null,
                        };
                      })}
                    />

                    {offerCases.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 md:p-4">
                        <h3 className="text-sm font-semibold text-amber-900 md:text-base">Dossiers remboursement / litige</h3>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {offerCases.map((c) => (
                            <div key={c.id} className="rounded border border-amber-200 bg-white p-3 text-sm text-slate-700">
                              <p className="font-semibold">
                                {CASE_LABEL[c.case_type] ?? c.case_type} - {c.status}
                                {c.amount_cents > 0 && <> - {(c.amount_cents / 100).toFixed(2)} €</>}
                              </p>
                              <p className="text-xs text-slate-500">Partie: {c.side}</p>
                              {c.reason && <p className="mt-1 text-xs">{c.reason}</p>}
                              {(evidencesByCase.get(c.id) ?? []).length > 0 && (
                                <div className="mt-2 grid grid-cols-5 gap-2">
                                  {(evidencesByCase.get(c.id) ?? []).map((evidence) => {
                                    const signedUrl = fileUrlMap.get(evidence.id);
                                    if (!signedUrl) return null;
                                    return (
                                      <a key={evidence.id} href={signedUrl} target="_blank" rel="noreferrer">
                                        <img
                                          src={signedUrl}
                                          alt="Preuve litige"
                                          className="h-14 w-full rounded object-cover md:h-16"
                                        />
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
