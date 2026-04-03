import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Package, Wallet } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { IncidentDecisionButtons } from "@/components/admin/incident-decision-buttons";
import { DepositDecisionPanel } from "@/components/admin/deposit-decision-panel";

export const dynamic = "force-dynamic";

type BookingFull = {
  id: string;
  listing_id: string;
  customer_id: string;
  provider_id: string;
  start_date: string;
  end_date: string;
  total_price: number | string;
  checkout_total_eur: number | string | null;
  service_fee_eur: number | string | null;
  provider_net_eur: number | string | null;
  deposit_amount: number | string | null;
  status: string;
  payout_status: string | null;
  payout_due_at: string | null;
  stripe_payment_intent_id: string | null;
  deposit_hold_status: string | null;
  deposit_payment_intent_id: string | null;
  deposit_release_due_at: string | null;
  check_in_status: string | null;
  check_in_at: string | null;
  check_in_comment: string | null;
  check_out_status: string | null;
  check_out_at: string | null;
  check_out_comment: string | null;
  incident_status: string | null;
  incident_at: string | null;
  incident_deadline_at: string | null;
  incident_comment: string | null;
  incident_amount_requested: number | string | null;
  deposit_claim_status: string | null;
  deposit_captured_amount: number | string | null;
  deposit_decision_at: string | null;
  deposit_decision_reason: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null; stripe_account_id?: string | null };
type ListingRow = { id: string; title: string; category: string; price_per_day: number };

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return iso;
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

const DEPOSIT_LABEL: Record<string, string> = {
  none: "Aucune",
  authorized: "Empreinte active",
  released: "Libérée",
  captured: "Débitée",
  failed: "Échec",
};

const CLAIM_LABEL: Record<string, string> = {
  pending_capture: "En attente de décision",
  captured_full: "Capturée (totalité)",
  captured_partial: "Capturée (partielle)",
  released_admin: "Libérée (admin)",
  released_auto: "Libérée (automatique)",
};

const PAYOUT_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Versé",
  failed: "Échoué",
  blocked: "Bloqué ⚠️",
};

export default async function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = await params;

  const admin = createAdminClient();

  const { data: raw } = await admin
    .from("gs_bookings")
    .select(
      "id, listing_id, customer_id, provider_id, start_date, end_date, total_price, checkout_total_eur, service_fee_eur, provider_net_eur, deposit_amount, status, payout_status, payout_due_at, stripe_payment_intent_id, deposit_hold_status, deposit_payment_intent_id, deposit_release_due_at, check_in_status, check_in_at, check_in_comment, check_out_status, check_out_at, check_out_comment, incident_status, incident_at, incident_deadline_at, incident_comment, incident_amount_requested, deposit_claim_status, deposit_captured_amount, deposit_decision_at, deposit_decision_reason, created_at"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!raw) notFound();

  const booking = raw as BookingFull;

  const [{ data: customerRaw }, { data: providerRaw }, { data: listingRaw }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").eq("id", booking.customer_id).maybeSingle(),
    admin.from("profiles").select("id, full_name, email, stripe_account_id").eq("id", booking.provider_id).maybeSingle(),
    admin.from("gs_listings").select("id, title, category, price_per_day").eq("id", booking.listing_id).maybeSingle(),
  ]);

  const customer = customerRaw as ProfileRow | null;
  const provider = providerRaw as ProfileRow | null;
  const listing = listingRaw as ListingRow | null;

  const locationEur = Number(booking.total_price);
  const checkoutTotalEur =
    booking.checkout_total_eur != null && booking.checkout_total_eur !== ""
      ? Number(booking.checkout_total_eur)
      : locationEur;
  const providerNetEur =
    booking.provider_net_eur != null && booking.provider_net_eur !== ""
      ? Number(booking.provider_net_eur)
      : null;
  const depositEur = Number(booking.deposit_amount ?? 0);
  const amountRequested = Number(booking.incident_amount_requested ?? 0);
  const isOpen = booking.incident_status === "open";

  // Timeline events dérivés
  const timelineEvents = [
    { label: "Réservation créée", date: booking.created_at, icon: Package, cls: "text-slate-400" },
    booking.stripe_payment_intent_id
      ? { label: "Paiement confirmé", date: booking.created_at, icon: CheckCircle2, cls: "text-emerald-500" }
      : null,
    booking.check_in_at
      ? { label: "Remise matériel (check-in)", date: booking.check_in_at, icon: Package, cls: "text-blue-500" }
      : null,
    booking.check_out_at
      ? { label: "Retour matériel (check-out)", date: booking.check_out_at, icon: Package, cls: "text-slate-500" }
      : null,
    booking.incident_at
      ? { label: "Incident signalé", date: booking.incident_at, icon: AlertTriangle, cls: "text-amber-500" }
      : null,
  ].filter(Boolean) as { label: string; date: string; icon: React.ElementType; cls: string }[];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/incidents-materiel"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Incident matériel — {booking.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-slate-500">{listing?.title ?? "Équipement"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Incident */}
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-bold text-amber-900">Incident signalé</h2>
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  isOpen
                    ? "bg-amber-200 text-amber-800"
                    : booking.incident_status === "resolved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {isOpen ? "Ouvert" : booking.incident_status === "resolved" ? "Validé" : "Rejeté"}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 font-medium text-amber-800">Signalé le</dt>
                <dd className="text-amber-900">{fmt(booking.incident_at)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 shrink-0 font-medium text-amber-800">Fenêtre expire</dt>
                <dd className="text-amber-900">{fmt(booking.incident_deadline_at)}</dd>
              </div>
              {amountRequested > 0 && (
                <div className="flex gap-2">
                  <dt className="w-36 shrink-0 font-medium text-amber-800">Montant réclamé</dt>
                  <dd className="font-bold text-amber-900">{amountRequested} €</dd>
                </div>
              )}
            </dl>
            {booking.incident_comment && (
              <div className="mt-3 rounded-lg bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Description du prestataire
                </p>
                <p className="mt-1 text-sm text-slate-800">{booking.incident_comment}</p>
              </div>
            )}
          </section>

          {/* Décision admin */}
          {isOpen && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-bold text-slate-900">Décision admin</h2>
              <IncidentDecisionButtons bookingId={bookingId} />
            </section>
          )}

          {/* Décision financière caution (visible si incident resolved avec caution active, ou toujours si caution présente) */}
          {depositEur > 0 && (booking.incident_status === "resolved" || booking.deposit_claim_status) && (
            <DepositDecisionPanel
              bookingId={bookingId}
              depositAmount={depositEur}
              depositHoldStatus={booking.deposit_hold_status}
              depositClaimStatus={booking.deposit_claim_status}
              depositCapturedAmount={Number(booking.deposit_captured_amount ?? 0) || null}
            />
          )}

          {/* Caution — récapitulatif technique */}
          {depositEur > 0 && (
            <section className="rounded-xl border border-slate-100 bg-white p-5">
              <h2 className="mb-3 font-bold text-slate-900">Caution — Détails techniques</h2>
              <dl className="space-y-1.5 text-sm">
                <Row label="Montant autorisé" value={`${depositEur} €`} />
                <Row
                  label="État Stripe"
                  value={DEPOSIT_LABEL[booking.deposit_hold_status ?? "none"] ?? booking.deposit_hold_status ?? "—"}
                />
                <Row
                  label="Décision admin"
                  value={CLAIM_LABEL[booking.deposit_claim_status ?? ""] ?? booking.deposit_claim_status ?? "—"}
                />
                {Number(booking.deposit_captured_amount ?? 0) > 0 && (
                  <Row label="Montant capturé" value={`${Number(booking.deposit_captured_amount)} €`} />
                )}
                {booking.deposit_decision_at && (
                  <Row label="Date décision" value={fmt(booking.deposit_decision_at)} />
                )}
                {booking.deposit_decision_reason && (
                  <Row label="Motif" value={booking.deposit_decision_reason} />
                )}
                <Row label="PI caution" value={booking.deposit_payment_intent_id ?? "—"} mono />
                <Row label="Release prévue" value={fmtDate(booking.deposit_release_due_at)} />
              </dl>
            </section>
          )}

          {/* Payout */}
          <section className="rounded-xl border border-slate-100 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-400" />
              <h2 className="font-bold text-slate-900">Payout prestataire</h2>
            </div>
            <dl className="space-y-1.5 text-sm">
              <Row
                label="Montant location (réf.)"
                value={Number.isFinite(locationEur) ? `${locationEur} €` : "—"}
              />
              {Number.isFinite(checkoutTotalEur) && checkoutTotalEur !== locationEur ? (
                <Row label="Total encaissé locataire (PI principal)" value={`${checkoutTotalEur} €`} />
              ) : null}
              <Row
                label="Net prestataire (versement Connect)"
                value={
                  providerNetEur != null && Number.isFinite(providerNetEur) ? `${providerNetEur} €` : "—"
                }
              />
              <Row
                label="Statut"
                value={PAYOUT_LABEL[booking.payout_status ?? ""] ?? booking.payout_status ?? "—"}
              />
              <Row label="Versement prévu" value={fmtDate(booking.payout_due_at)} />
            </dl>
          </section>

          {/* Timeline */}
          <section className="rounded-xl border border-slate-100 bg-white p-5">
            <h2 className="mb-4 font-bold text-slate-900">Chronologie</h2>
            <ol className="space-y-3">
              {timelineEvents.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${ev.cls}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{ev.label}</p>
                      <p className="text-[11px] text-slate-400">{fmt(ev.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          {/* Réservation */}
          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Réservation
            </h3>
            <p className="font-semibold text-slate-900">{listing?.title ?? "—"}</p>
            <p className="mt-1 text-sm text-slate-500">
              {fmtDate(booking.start_date)} — {fmtDate(booking.end_date)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Location {Number.isFinite(locationEur) ? `${locationEur} €` : "—"}
              {Number.isFinite(checkoutTotalEur) && checkoutTotalEur !== locationEur
                ? ` · Payé ${checkoutTotalEur} €`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {booking.check_in_status === "confirmed" && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                  Remis ✓
                </span>
              )}
              {booking.check_out_status === "confirmed" && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  Retourné ✓
                </span>
              )}
            </div>
          </section>

          {/* Locataire */}
          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Locataire
            </h3>
            <p className="font-medium text-slate-900">{customer?.full_name ?? "—"}</p>
            <p className="text-sm text-slate-500">{customer?.email ?? "—"}</p>
          </section>

          {/* Prestataire */}
          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Prestataire
            </h3>
            <p className="font-medium text-slate-900">{provider?.full_name ?? "—"}</p>
            <p className="text-sm text-slate-500">{provider?.email ?? "—"}</p>
            {provider?.stripe_account_id && (
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                {provider.stripe_account_id}
              </p>
            )}
          </section>

          {/* Liens utiles */}
          <section className="rounded-xl border border-slate-100 bg-white p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Liens
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  href={`/items/${booking.listing_id}`}
                  className="text-gs-orange hover:underline"
                  target="_blank"
                >
                  Voir l'annonce →
                </Link>
              </li>
              {booking.stripe_payment_intent_id && (
                <li>
                  <a
                    href={`https://dashboard.stripe.com/payments/${booking.stripe_payment_intent_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-blue-600 hover:underline"
                  >
                    PI : {booking.stripe_payment_intent_id.slice(0, 20)}…
                  </a>
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
      <dd className={`text-slate-800 ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}

// Required for JSX in type annotation above
import React from "react";
