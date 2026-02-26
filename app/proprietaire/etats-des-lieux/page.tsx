import Image from "next/image";

import { openUserDisputeCaseAction, submitEtatDesLieuxAction } from "@/app/actions/etats-des-lieux";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function OwnerEtatsDesLieuxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: offers } = await admin
    .from("offers")
    .select("id, salle_id, seeker_id, amount_cents, date_debut, date_fin, created_at")
    .eq("owner_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(100);

  const offerRows = (offers ?? []) as {
    id: string;
    salle_id: string;
    seeker_id: string;
    amount_cents: number;
    date_debut: string | null;
    date_fin: string | null;
    created_at: string;
  }[];

  const offerIds = offerRows.map((o) => o.id);
  const salleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const seekerIds = [...new Set(offerRows.map((o) => o.seeker_id))];

  const [{ data: salles }, { data: seekers }] = await Promise.all([
    salleIds.length > 0
      ? admin.from("salles").select("id, name").in("id", salleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    seekerIds.length > 0
      ? admin.from("profiles").select("id, full_name, email").in("id", seekerIds)
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
          .select("id, etat_des_lieux_id, offer_id, storage_path, description")
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
  const seekerMap = new Map(
    (seekers ?? []).map((o) => [o.id, o.full_name || o.email || "Locataire"])
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
  const totalOwnerDepots = edlRows.filter((r) => r.role === "owner").length;
  const totalExpectedDepots = totalOffers * 2;
  const totalRestants = Math.max(totalExpectedDepots - totalOwnerDepots, 0);

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
          <p className="mt-1 text-2xl font-bold text-emerald-700">{totalOwnerDepots}</p>
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
            const ownerBefore = offerEdl.find((r) => r.role === "owner" && r.phase === "before");
            const ownerAfter = offerEdl.find((r) => r.role === "owner" && r.phase === "after");
            const doneCount = [ownerBefore, ownerAfter].filter(Boolean).length;
            const eventStartYmd = offer.date_debut ?? null;
            const eventEndYmd = offer.date_fin ?? offer.date_debut ?? null;
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
                        Locataire : {seekerMap.get(offer.seeker_id) ?? "—"} • Offre : {offer.id}
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {doneCount}/2 phases déposées
                    </span>
                  </div>
                </summary>

                <div className="mt-4 space-y-4">
                  {(["before", "after"] as const).map((phase) => {
                    const ownerEdl = offerEdl.find((r) => r.role === "owner" && r.phase === phase);
                    const seekerEdl = offerEdl.find((r) => r.role === "seeker" && r.phase === phase);
                    const now = new Date();
                    const phaseDateYmd = phase === "before" ? eventStartYmd : eventEndYmd;
                    const phaseDate = parseYmdToDate(phaseDateYmd);
                    const phaseDeadline = phaseDate ? addDays(phaseDate, 1) : null;
                    const isLockedBefore = !!phaseDate && now < phaseDate;
                    const isLockedAfter = !!phaseDeadline && now > phaseDeadline;
                    const isUploadOpen = !isLockedBefore && !isLockedAfter;
                    const lockText = isLockedBefore
                      ? `Disponible à partir du ${formatYmdToFr(phaseDateYmd)}`
                      : isLockedAfter
                        ? `Fenêtre expirée (24h après ${formatYmdToFr(phaseDateYmd)})`
                        : "";
                    return (
                      <div key={phase} className="rounded-lg border border-slate-200 p-3 md:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-black md:text-base">{PHASE_LABEL[phase]}</h3>
                          <span className="text-xs text-slate-500">max 10 photos</span>
                        </div>

                        <div className="mt-3 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                          {isUploadOpen ? (
                            <form
                              action={async (formData) => {
                                "use server";
                                await submitEtatDesLieuxAction(formData);
                              }}
                              className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                            >
                              <input type="hidden" name="offerId" value={offer.id} />
                              <input type="hidden" name="phase" value={phase} />
                              <p className="text-xs font-medium text-slate-700">Votre dépôt</p>
                              <textarea
                                name="notes"
                                rows={3}
                                required
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                placeholder="État observé, points à signaler..."
                              />
                              <input
                                type="file"
                                name="photos"
                                accept="image/*"
                                multiple
                                required
                                className="block w-full text-sm"
                              />
                              <button
                                type="submit"
                                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                Envoyer {phase === "before" ? "l'entrée" : "la sortie"}
                              </button>
                            </form>
                          ) : (
                            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 opacity-70">
                              <p className="text-xs font-medium text-slate-700">Votre dépôt</p>
                              <p className="text-xs text-slate-500">{lockText}</p>
                              <button
                                type="button"
                                disabled
                                className="w-full cursor-not-allowed rounded-md bg-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
                              >
                                Upload verrouillé
                              </button>
                            </div>
                          )}

                          <div className="grid gap-3 md:grid-cols-2">
                            {[ownerEdl, seekerEdl].map((entry, idx) => (
                              <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase text-slate-600">
                                  {idx === 0 ? "Vos photos" : "Photos locataire"}
                                </p>
                                {!entry ? (
                                  <p className="mt-2 text-sm text-slate-500">Aucun dépôt.</p>
                                ) : (
                                  <>
                                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{entry.notes || "—"}</p>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      {(photosByEdl.get(entry.id) ?? []).map((photo) => {
                                        const signedUrl = photoUrlMap.get(photo.id);
                                        if (!signedUrl) return null;
                                        return (
                                          <a key={photo.id} href={signedUrl} target="_blank" rel="noreferrer">
                                            <Image
                                              src={signedUrl}
                                              alt="Photo état des lieux"
                                              width={220}
                                              height={150}
                                              unoptimized
                                              className="h-16 w-full rounded object-cover md:h-20"
                                            />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 md:p-4">
                    <h3 className="text-sm font-semibold text-amber-900 md:text-base">Ouvrir un litige</h3>
                    <p className="mt-1 text-xs text-amber-800">Ajoutez un motif clair et des preuves photo.</p>
                    <form
                      action={async (formData) => {
                        "use server";
                        await openUserDisputeCaseAction(formData);
                      }}
                      className="mt-3 space-y-3"
                    >
                      <input type="hidden" name="offerId" value={offer.id} />
                      <textarea
                        name="reason"
                        rows={3}
                        required
                        className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm"
                        placeholder="Motif du litige, détails du dommage, contexte..."
                      />
                      <input
                        type="file"
                        name="photos"
                        accept="image/*"
                        multiple
                        required
                        className="block w-full text-sm"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 sm:w-auto"
                      >
                        Soumettre un litige avec preuves
                      </button>
                    </form>
                    {offerCases.length > 0 && (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {offerCases.map((c) => (
                          <div key={c.id} className="rounded border border-amber-200 bg-white p-2 text-xs text-slate-700">
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
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
