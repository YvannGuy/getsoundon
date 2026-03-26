import Link from "next/link";

import { AdminEvidenceViewer } from "@/components/etats-des-lieux/admin-evidence-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { fulfillmentModeLabel, parseOfferListingSnapshot } from "@/lib/offer-listing-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";

type OfferRow = {
  id: string;
  salle_id: string;
  owner_id: string;
  seeker_id: string;
  amount_cents: number;
  created_at: string;
  listing_snapshot?: unknown;
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
  uploaded_by: string | null;
  description: string | null;
};

const CASE_LABEL: Record<string, string> = {
  refund_full: "Remboursement total",
  refund_partial: "Remboursement partiel",
  dispute: "Litige",
};

export const dynamic = "force-dynamic";

export default async function AdminLitigesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; offerId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const focusOfferId = resolvedSearchParams.offerId ?? null;
  const selectedStatus =
    resolvedSearchParams.status === "open" ||
    resolvedSearchParams.status === "resolved" ||
    resolvedSearchParams.status === "rejected"
      ? resolvedSearchParams.status
      : "all";
  const selectedSort =
    resolvedSearchParams.sort === "recent" || resolvedSearchParams.sort === "amount"
      ? resolvedSearchParams.sort
      : "critical";

  const admin = createAdminClient();
  const { data: disputes } = await admin
    .from("refund_cases")
    .select("id, offer_id, case_type, status, side, reason, amount_cents, created_at")
    .eq("case_type", "dispute")
    .order("created_at", { ascending: false })
    .limit(300);

  const disputeRows = (disputes ?? []) as CaseRow[];
  const offerIds = [...new Set(disputeRows.map((d) => d.offer_id).filter(Boolean) as string[])];

  const [{ data: offers }, { data: evidences }] = await Promise.all([
      offerIds.length > 0
        ? admin
            .from("offers")
            .select("id, salle_id, owner_id, seeker_id, amount_cents, created_at, listing_snapshot")
            .in("id", offerIds)
        : Promise.resolve({ data: [] as OfferRow[] }),
      disputeRows.length > 0
        ? admin
            .from("refund_case_evidences")
            .select("id, case_id, storage_path, uploaded_by, description")
            .in("case_id", disputeRows.map((d) => d.id))
        : Promise.resolve({ data: [] as EvidenceRow[] }),
    ]);

  const offerRows = (offers ?? []) as OfferRow[];
  const evidenceRows = (evidences ?? []) as EvidenceRow[];

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

  const fileUrlMap = new Map<string, string>();
  for (const row of evidenceRows) {
    const { data } = await admin.storage.from("etat-des-lieux").createSignedUrl(row.storage_path, 60 * 60);
    if (data?.signedUrl) fileUrlMap.set(row.id, data.signedUrl);
  }

  const offerMap = new Map(offerRows.map((o) => [o.id, o]));
  const salleMap = new Map((salles ?? []).map((s) => [s.id, s.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Utilisateur"]));
  const evidencesByCase = new Map<string, EvidenceRow[]>();
  for (const row of evidenceRows) {
    const list = evidencesByCase.get(row.case_id) ?? [];
    list.push(row);
    evidencesByCase.set(row.case_id, list);
  }

  const groupedByOffer = new Map<string, CaseRow[]>();
  for (const dispute of disputeRows) {
    if (!dispute.offer_id) continue;
    const list = groupedByOffer.get(dispute.offer_id) ?? [];
    list.push(dispute);
    groupedByOffer.set(dispute.offer_id, list);
  }
  const offerDisputeRows = [...groupedByOffer.entries()]
    .map(([offerId, cases]) => ({
      offerId,
      offer: offerMap.get(offerId) ?? null,
      cases,
      openCount: cases.filter((c) => c.status === "open").length,
      totalAmount: cases.reduce((acc, c) => acc + (c.amount_cents ?? 0), 0),
    }))
    .filter((row) => row.offer)
    .filter((row) => (focusOfferId ? row.offerId === focusOfferId : true))
    .filter((row) => {
      if (selectedStatus === "all") return true;
      if (selectedStatus === "open") return row.cases.some((c) => c.status === "open");
      if (selectedStatus === "resolved") return row.cases.some((c) => c.status === "resolved");
      return row.cases.some((c) => c.status === "rejected");
    })
    .sort((a, b) => {
      if (selectedSort === "recent") {
        return new Date(b.cases[0]?.created_at ?? 0).getTime() - new Date(a.cases[0]?.created_at ?? 0).getTime();
      }
      if (selectedSort === "amount") return b.totalAmount - a.totalAmount;
      if (b.openCount !== a.openCount) return b.openCount - a.openCount;
      return new Date(b.offer?.created_at ?? 0).getTime() - new Date(a.offer?.created_at ?? 0).getTime();
    });

  const totalOpen = disputeRows.filter((d) => d.status === "open").length;
  const totalResolved = disputeRows.filter((d) => d.status === "resolved").length;
  const totalRejected = disputeRows.filter((d) => d.status === "rejected").length;

  const makeHref = (status: string, sort: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (sort !== "critical") params.set("sort", sort);
    const query = params.toString();
    return `/admin/litiges${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5 p-4 pb-24 md:space-y-6 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Litiges</h1>
        <p className="mt-1 text-sm text-slate-600 md:text-base">
          File dédiée de traitement des litiges avec accès rapide aux preuves EDL et preuves litige.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Ouverts</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{totalOpen}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Résolus</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{totalResolved}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Rejetés</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{totalRejected}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Tous" },
              { id: "open", label: "Ouverts" },
              { id: "resolved", label: "Résolus" },
              { id: "rejected", label: "Rejetés" },
            ].map((option) => (
              <Link
                key={option.id}
                href={makeHref(option.id, selectedSort)}
                className={
                  option.id === selectedStatus
                    ? "rounded-full bg-[#213398] px-3 py-1.5 text-xs font-medium text-white"
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
              { id: "recent", label: "Plus récents" },
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
      </div>

      <div className="space-y-4">
        {offerDisputeRows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Aucun litige pour ce filtre.
            </CardContent>
          </Card>
        ) : (
          offerDisputeRows.map((row, index) => {
            const offer = row.offer!;
            return (
              <details key={offer.id} open={index === 0} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-black md:text-lg">
                        {salleMap.get(offer.salle_id) ?? "Salle"} • {(offer.amount_cents / 100).toFixed(2)} €
                      </p>
                      <p className="mt-1 text-xs text-slate-500 md:text-sm">
                        Propriétaire : {profileMap.get(offer.owner_id) ?? "—"}
                      </p>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 space-y-4">
                  {(() => {
                    const snap = parseOfferListingSnapshot(offer.listing_snapshot);
                    if (!snap) return null;
                    const gear = [snap.listing.gear_category, snap.listing.gear_brand, snap.listing.gear_model]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:p-4">
                        <h3 className="text-sm font-semibold text-slate-900 md:text-base">
                          Détail figé au moment de l&apos;offre
                        </h3>
                        <dl className="mt-2 grid gap-1 text-xs text-slate-700 md:grid-cols-2 md:text-sm">
                          <div>
                            <dt className="font-medium text-slate-500">Annonce</dt>
                            <dd>
                              {snap.listing.title} — {snap.listing.city}
                            </dd>
                          </div>
                          {gear ? (
                            <div>
                              <dt className="font-medium text-slate-500">Matériel</dt>
                              <dd>{gear}</dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="font-medium text-slate-500">Période</dt>
                            <dd>
                              {new Date(snap.rental_period.date_debut).toLocaleDateString("fr-FR")} –{" "}
                              {new Date(snap.rental_period.date_fin).toLocaleDateString("fr-FR")} ({snap.rental_period.event_type})
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-slate-500">Retrait / livraison</dt>
                            <dd>
                              {fulfillmentModeLabel(snap.logistics.mode)}
                              {snap.logistics.notes.trim() ? ` — ${snap.logistics.notes}` : ""}
                            </dd>
                          </div>
                          <div className="md:col-span-2">
                            <dt className="font-medium text-slate-500">Montants figés</dt>
                            <dd>
                              {(snap.money.amount_cents / 100).toFixed(2)} € TTC · caution{" "}
                              {(snap.money.deposit_cents / 100).toFixed(2)} € · {snap.money.cancellation_policy}
                            </dd>
                          </div>
                          {snap.listing.feature_labels.length > 0 ? (
                            <div className="md:col-span-2">
                              <dt className="font-medium text-slate-500">Options / accessoires (libellés)</dt>
                              <dd>{snap.listing.feature_labels.join(", ")}</dd>
                            </div>
                          ) : null}
                          {snap.logistics.accessories_notes.trim() ? (
                            <div className="md:col-span-2">
                              <dt className="font-medium text-slate-500">Notes accessoires</dt>
                              <dd className="whitespace-pre-wrap">{snap.logistics.accessories_notes}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    );
                  })()}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 md:p-4">
                    <h3 className="text-sm font-semibold text-amber-900 md:text-base">Dossiers litige</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {row.cases.map((c) => (
                        <div key={c.id} className="rounded border border-amber-200 bg-white p-3 text-sm text-slate-700">
                          <p className="font-semibold">{CASE_LABEL[c.case_type] ?? c.case_type} - {c.status}</p>
                          {c.reason && <p className="mt-2 text-xs">Motif propriétaire: {c.reason}</p>}
                          {(() => {
                            const rows = evidencesByCase.get(c.id) ?? [];
                            const ownerPhotos = rows
                              .filter((e) => e.uploaded_by === offer.owner_id)
                              .map((e) => ({ id: e.id, url: fileUrlMap.get(e.id) ?? "" }))
                              .filter((photo) => !!photo.url);
                            const seekerPhotos = rows
                              .filter((e) => e.uploaded_by === offer.seeker_id)
                              .map((e) => ({ id: e.id, url: fileUrlMap.get(e.id) ?? "" }))
                              .filter((photo) => !!photo.url);
                            const seekerReason =
                              rows.find((e) => e.uploaded_by === offer.seeker_id && e.description)?.description ?? null;
                            return (
                              <div className="mt-2 space-y-2">
                                {seekerReason && <p className="text-xs">Contestation seeker: {seekerReason}</p>}
                                <div className="flex flex-wrap gap-2">
                                  <AdminEvidenceViewer label="Voir preuves propriétaire" photos={ownerPhotos} />
                                  <AdminEvidenceViewer label="Voir preuves seeker" photos={seekerPhotos} />
                                </div>
                              </div>
                            );
                          })()}
                          <div className="mt-2 text-xs text-slate-500">
                            Propriétaire: {profileMap.get(offer.owner_id) ?? "—"} • Seeker: {profileMap.get(offer.seeker_id) ?? "—"}
                          </div>
                        </div>
                      ))}
                    </div>
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

