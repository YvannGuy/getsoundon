import { ChevronDown } from "lucide-react";

import { EdlMiniWizard } from "@/components/etats-des-lieux/edl-mini-wizard";
import { EdlPhotoViewer } from "@/components/etats-des-lieux/edl-photo-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  reason: string | null;
  amount_cents: number;
  created_at: string;
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

function formatYmdToFr(ymd: string | null): string {
  if (!ymd) return "la date de l'événement";
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("fr-FR");
}

function parseYmdToDate(ymd: string | null): Date | null {
  if (!ymd) return null;
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const dynamic = "force-dynamic";

export default async function SeekerEtatsDesLieuxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, salle_id, owner_id, amount_cents, date_debut, date_fin, created_at")
    .eq("seeker_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(100);

  const offerRows = (offers ?? []) as {
    id: string;
    salle_id: string;
    owner_id: string;
    amount_cents: number;
    date_debut: string | null;
    date_fin: string | null;
    created_at: string;
  }[];

  const offerIds = offerRows.map((o) => o.id);
  const salleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const ownerIds = [...new Set(offerRows.map((o) => o.owner_id))];

  const [{ data: salles }, { data: owners }] = await Promise.all([
    salleIds.length > 0
      ? admin.from("salles").select("id, name").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ownerIds.length > 0
      ? admin.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  let edlRows: EDLRow[] = [];
  let photoRows: PhotoRow[] = [];
  let caseRows: CaseRow[] = [];

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
          .select("id, offer_id, case_type, status, reason, amount_cents, created_at")
          .in("offer_id", offerIds)
          .order("created_at", { ascending: false }),
      ]);

      edlRows = (edl ?? []) as EDLRow[];
      photoRows = (photos ?? []) as PhotoRow[];
      caseRows = (cases ?? []) as CaseRow[];
    } catch {
      // Les tables EDL peuvent ne pas exister tant que la migration SQL n'est pas exécutée.
    }
  }

  const photoUrlMap = new Map<string, string>();
  for (const photo of photoRows) {
    const { data } = await admin.storage.from("etat-des-lieux").createSignedUrl(photo.storage_path, 60 * 60);
    if (data?.signedUrl) photoUrlMap.set(photo.id, data.signedUrl);
  }

  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const ownerMap = new Map(
    (owners ?? []).map((o) => [o.id, o.full_name || o.email || "Propriétaire"])
  );

  const byOffer = new Map<string, EDLRow[]>();
  for (const row of edlRows) {
    const list = byOffer.get(row.offer_id) ?? [];
    list.push(row);
    byOffer.set(row.offer_id, list);
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

  const totalOffers = offerRows.length;
  const totalSeekerDepots = edlRows.filter((r) => r.role === "seeker").length;
  const totalExpectedDepots = totalOffers * 2;
  const totalRestants = Math.max(totalExpectedDepots - totalSeekerDepots, 0);

  return (
    <div className="space-y-5 p-4 pb-24 md:space-y-6 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">États des lieux</h1>
        <p className="mt-1 text-sm text-slate-600 md:text-base">
          Déposez vos photos avant/après (max 10) pour protéger la caution et faciliter l&apos;arbitrage.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Réservations à traiter</p>
          <p className="mt-1 text-2xl font-bold text-black">{totalOffers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Dépôts envoyés</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{totalSeekerDepots}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Dépôts restants</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{totalRestants}</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Consignes photos</p>
        <p className="mt-1 text-blue-800">
          Prenez des photos nettes, bien éclairées, couvrant entrée, salle principale, sanitaires, mobilier et zones sensibles.
        </p>
      </div>

      <div className="space-y-4">
        {offerRows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucune réservation payée à traiter pour le moment.
            </CardContent>
          </Card>
        ) : (
          offerRows.map((offer, offerIndex) => {
            const offerEdl = byOffer.get(offer.id) ?? [];
            const offerCases = casesByOffer.get(offer.id) ?? [];
            const seekerBefore = offerEdl.find((r) => r.role === "seeker" && r.phase === "before");
            const seekerAfter = offerEdl.find((r) => r.role === "seeker" && r.phase === "after");
            const doneCount = [seekerBefore, seekerAfter].filter(Boolean).length;
            const eventStartYmd = offer.date_debut ?? null;
            const eventEndYmd = offer.date_fin ?? offer.date_debut ?? null;
            const now = new Date();
            const beforeDate = parseYmdToDate(eventStartYmd);
            const beforeDeadline = beforeDate ? addDays(beforeDate, 1) : null;
            const beforeLockedBefore = !!beforeDate && now < beforeDate;
            const beforeLockedAfter = !!beforeDeadline && now > beforeDeadline;
            const beforeOpen = !beforeLockedBefore && !beforeLockedAfter;
            const beforeLockText = beforeLockedBefore
              ? `Disponible à partir du ${formatYmdToFr(eventStartYmd)}`
              : beforeLockedAfter
                ? `Fenêtre expirée (24h après ${formatYmdToFr(eventStartYmd)})`
                : "";

            const afterDate = parseYmdToDate(eventEndYmd);
            const afterDeadline = afterDate ? addDays(afterDate, 1) : null;
            const afterLockedBefore = !!afterDate && now < afterDate;
            const afterLockedAfter = !!afterDeadline && now > afterDeadline;
            const afterOpen = !afterLockedBefore && !afterLockedAfter;
            const afterLockText = afterLockedBefore
              ? `Disponible à partir du ${formatYmdToFr(eventEndYmd)}`
              : afterLockedAfter
                ? `Fenêtre expirée (24h après ${formatYmdToFr(eventEndYmd)})`
                : "";
            const phaseViewData = (["before", "after"] as const).map((phase) => {
              const seekerEdl = offerEdl.find((r) => r.role === "seeker" && r.phase === phase);
              const ownerEdl = offerEdl.find((r) => r.role === "owner" && r.phase === phase);
              const phaseDateYmd = phase === "before" ? eventStartYmd : eventEndYmd;
              const phaseDate = parseYmdToDate(phaseDateYmd);
              const phaseDeadline = phaseDate ? addDays(phaseDate, 1) : null;
              const lockedBefore = !!phaseDate && now < phaseDate;
              const lockedAfter = !!phaseDeadline && now > phaseDeadline;
              const lockText = lockedBefore
                ? `Disponible à partir du ${formatYmdToFr(phaseDateYmd)}`
                : lockedAfter
                  ? `Fenêtre expirée (24h après ${formatYmdToFr(phaseDateYmd)})`
                  : "";

              return {
                phase,
                label: PHASE_LABEL[phase],
                lockText,
                isOpen: !lockedBefore && !lockedAfter,
                self: seekerEdl
                  ? {
                      notes: seekerEdl.notes,
                      photos: (photosByEdl.get(seekerEdl.id) ?? [])
                        .map((photo) => ({
                          id: photo.id,
                          url: photoUrlMap.get(photo.id) ?? "",
                          uploadedAt: photo.created_at,
                        }))
                        .filter((photo) => !!photo.url),
                    }
                  : null,
                other: ownerEdl
                  ? {
                      notes: ownerEdl.notes,
                      photos: (photosByEdl.get(ownerEdl.id) ?? [])
                        .map((photo) => ({
                          id: photo.id,
                          url: photoUrlMap.get(photo.id) ?? "",
                          uploadedAt: photo.created_at,
                        }))
                        .filter((photo) => !!photo.url),
                    }
                  : null,
              };
            });
            return (
              <details
                key={offer.id}
                open={offerIndex === 0}
                className="group rounded-xl border border-slate-200 bg-white p-4 md:p-5"
              >
                <summary className="cursor-pointer">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-black md:text-lg">
                        {salleMap.get(offer.salle_id) ?? "Salle"} • {(offer.amount_cents / 100).toFixed(2)} €
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500 md:text-sm">
                        Propriétaire : {ownerMap.get(offer.owner_id) ?? "—"} • Offre : {offer.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {doneCount}/2 phases déposées
                        </span>
                        <span className="mx-0.5 h-3.5 w-px bg-slate-200" aria-hidden="true" />
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-black transition-transform duration-200 group-open:rotate-180" />
                        <span className="whitespace-nowrap">Replier / Déplier</span>
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 space-y-4">
                  <EdlMiniWizard
                    offerId={offer.id}
                    actorLabel="Locataire"
                    beforeDone={!!seekerBefore}
                    afterDone={!!seekerAfter}
                    beforeOpen={beforeOpen}
                    afterOpen={afterOpen}
                    beforeLockText={beforeLockText}
                    afterLockText={afterLockText}
                    leadingAction={<EdlPhotoViewer actorLabel="Locataire" phases={phaseViewData} />}
                  />

                  {offerCases.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-2">
                      {offerCases.map((c) => (
                        <div key={c.id} className="rounded border border-amber-200 bg-amber-50/40 p-2 text-xs text-slate-700">
                          <span className="font-semibold">{CASE_LABEL[c.case_type] ?? c.case_type}</span>
                          {" - "}
                          <span>{c.status}</span>
                          {c.amount_cents > 0 && <> - {(c.amount_cents / 100).toFixed(2)} €</>}
                          {c.reason && <p className="mt-1">{c.reason}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
