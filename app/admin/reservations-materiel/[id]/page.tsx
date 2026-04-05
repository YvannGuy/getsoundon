import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ClipboardList, FileText, LinkIcon, Package, Shield, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tryCreateSignedInvoiceReadUrl } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réservation | Admin",
  robots: { index: false, follow: false },
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  scheduled: "Planifié",
  paid: "Payé",
  blocked: "Bloqué",
  failed: "Échoué",
};

const HOLD_LABEL: Record<string, string> = {
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
  released_auto: "Libérée (auto)",
};

const CHECK_LABEL: Record<string, string> = {
  pending: "En attente",
  done: "Effectué",
};

function fmt(date: string | null | undefined, withTime = false) {
  if (!date) return "—";
  try {
    return format(new Date(date), withTime ? "d MMM yyyy HH:mm" : "d MMM yyyy", { locale: fr });
  } catch {
    return date;
  }
}

type Booking = {
  id: string;
  provider_id: string;
  customer_id: string;
  listing_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  payout_status: string | null;
  incident_status: string | null;
  total_price: number | string | null;
  checkout_total_eur: number | string | null;
  service_fee_eur: number | string | null;
  provider_net_eur: number | string | null;
  stripe_payment_intent_id: string | null;
  deposit_hold_status: string | null;
  deposit_payment_intent_id: string | null;
  deposit_release_due_at: string | null;
  deposit_claim_status: string | null;
  deposit_captured_amount: number | string | null;
  deposit_decision_reason: string | null;
  check_in_status: string | null;
  check_in_at: string | null;
  check_out_status: string | null;
  check_out_at: string | null;
  created_at: string;
};

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: bookingRaw } = await admin
    .from("gs_bookings")
    .select(
      "id, provider_id, customer_id, listing_id, start_date, end_date, status, payout_status, incident_status, total_price, checkout_total_eur, service_fee_eur, provider_net_eur, stripe_payment_intent_id, deposit_hold_status, deposit_payment_intent_id, deposit_release_due_at, deposit_claim_status, deposit_captured_amount, deposit_decision_reason, check_in_status, check_in_at, check_out_status, check_out_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!bookingRaw) notFound();
  const booking = bookingRaw as Booking;

  const [{ data: provider }, { data: customer }, { data: listing }, { data: invoice }, { data: cancelReqs }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name, email").eq("id", booking.provider_id).maybeSingle(),
      admin.from("profiles").select("id, full_name, email").eq("id", booking.customer_id).maybeSingle(),
      booking.listing_id
        ? admin.from("gs_listings").select("id, title").eq("id", booking.listing_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("gs_invoices")
        .select("id, invoice_number, invoice_generated_at, invoice_url, invoice_total_eur, currency")
        .eq("booking_id", booking.id)
        .maybeSingle(),
      admin
        .from("gs_booking_cancellation_requests")
        .select("id, status, requested_at")
        .eq("booking_id", booking.id)
        .order("requested_at", { ascending: false })
        .limit(1),
    ]);

  const signedInvoiceUrl =
    invoice?.invoice_url != null ? await tryCreateSignedInvoiceReadUrl(invoice.invoice_url) : null;

  const incidentOpen = booking.incident_status === "open";
  const amountTotal = Number(booking.checkout_total_eur ?? booking.total_price ?? 0);
  const amountNet = Number(booking.provider_net_eur ?? 0);
  const amountFees = Number(booking.service_fee_eur ?? 0);
  const latestCancel = (cancelReqs ?? [])[0] as { id: string; status: string; requested_at: string } | undefined;

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-1 h-6 w-6 text-slate-600" />
        <div className="flex-1">
          <p className="text-xs font-mono text-slate-500">Réservation {booking.id}</p>
          <h1 className="text-xl font-bold text-black md:text-2xl">Fiche réservation</h1>
          <p className="mt-1 text-sm text-slate-600">
            Vue centrale de la réservation matériel : statuts, paiements, caution, incident, facture et acteurs.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
              {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
              Payout : {booking.payout_status ? PAYOUT_STATUS_LABEL[booking.payout_status] ?? booking.payout_status : "—"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
              Caution : {booking.deposit_hold_status ? HOLD_LABEL[booking.deposit_hold_status] ?? booking.deposit_hold_status : "—"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
              Incident : {booking.incident_status ? booking.incident_status : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-sky-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Période</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-800">
              {fmt(booking.start_date)} → {fmt(booking.end_date)}
            </p>
            <p className="text-xs text-slate-500">Créée le {fmt(booking.created_at, true)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Montants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-slate-700">
              Brut (checkout) :{" "}
              <span className="font-semibold text-slate-900">
                {Number.isFinite(amountTotal) ? `${amountTotal.toFixed(2)} €` : "—"}
              </span>
            </p>
            <p className="text-sm text-slate-700">
              Frais / service fee :{" "}
              <span className="font-semibold text-slate-900">
                {Number.isFinite(amountFees) ? `${amountFees.toFixed(2)} €` : "—"}
              </span>
            </p>
            <p className="text-sm text-slate-700">
              Net prestataire :{" "}
              <span className="font-semibold text-slate-900">
                {Number.isFinite(amountNet) ? `${amountNet.toFixed(2)} €` : "—"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Paiement Stripe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            <p>
              Intent :{" "}
              {booking.stripe_payment_intent_id ? (
                <a
                  className="font-semibold text-gs-orange underline-offset-2 hover:underline"
                  href={`https://dashboard.stripe.com/payments/${booking.stripe_payment_intent_id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {booking.stripe_payment_intent_id}
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>Dépôt : {booking.deposit_payment_intent_id ?? "—"}</p>
            <p>Libération caution due : {fmt(booking.deposit_release_due_at, true)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Acteurs & annonce</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Client</p>
              <p className="text-sm font-semibold text-slate-900">{customer?.full_name ?? "—"}</p>
              <p className="text-xs text-slate-600">{customer?.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Prestataire</p>
              <p className="text-sm font-semibold text-slate-900">{provider?.full_name ?? "—"}</p>
              <p className="text-xs text-slate-600">{provider?.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Annonce</p>
              <p className="text-sm font-semibold text-slate-900">{listing?.title ?? "—"}</p>
              <p className="text-xs text-slate-600">ID annonce : {booking.listing_id ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">État opérationnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              Check-in :{" "}
              <span className="font-semibold">
                {booking.check_in_status ? CHECK_LABEL[booking.check_in_status] ?? booking.check_in_status : "—"}
              </span>{" "}
              {fmt(booking.check_in_at, true)}
            </p>
            <p>
              Check-out :{" "}
              <span className="font-semibold">
                {booking.check_out_status ? CHECK_LABEL[booking.check_out_status] ?? booking.check_out_status : "—"}
              </span>{" "}
              {fmt(booking.check_out_at, true)}
            </p>
            <p>
              Caution : {booking.deposit_hold_status ? HOLD_LABEL[booking.deposit_hold_status] ?? booking.deposit_hold_status : "—"}
            </p>
            <p>
              Claim caution :{" "}
              {booking.deposit_claim_status ? CLAIM_LABEL[booking.deposit_claim_status] ?? booking.deposit_claim_status : "—"}
            </p>
            {booking.deposit_captured_amount ? (
              <p>Montant capturé : {Number(booking.deposit_captured_amount).toFixed(2)} €</p>
            ) : null}
            {booking.deposit_decision_reason ? (
              <p className="text-xs text-slate-500">Note décision : {booking.deposit_decision_reason}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Facture</CardTitle>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <Link href="/admin/factures" className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline">
                Voir toutes
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {invoice ? (
              <>
                <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                <p>Émise le {fmt(invoice.invoice_generated_at, true)}</p>
                <p>
                  Montant : {Number(invoice.invoice_total_eur ?? 0).toFixed(2)} {invoice.currency ?? "EUR"}
                </p>
                {signedInvoiceUrl ? (
                  <a
                    href={signedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm font-semibold text-gs-orange underline-offset-2 hover:underline"
                  >
                    Télécharger
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">PDF indisponible</span>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-600">Aucune facture générée pour cette réservation.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Incidents / Annulation</CardTitle>
            <Shield className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <p className="font-semibold text-slate-900">Incident</p>
                <p className="text-xs text-slate-600">Statut : {booking.incident_status ?? "—"}</p>
                <Link
                  href={`/admin/incidents-materiel/${booking.id}`}
                  className="text-xs font-semibold text-gs-orange underline-offset-2 hover:underline"
                >
                  Ouvrir la fiche incident
                </Link>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wallet className="mt-0.5 h-4 w-4 text-slate-600" />
              <div>
                <p className="font-semibold text-slate-900">Annulation</p>
                <p className="text-xs text-slate-600">
                  {latestCancel ? `Dernière demande : ${latestCancel.status}` : "Aucune demande trouvée"}
                </p>
                <Link
                  href="/admin/materiel-annulations"
                  className="text-xs font-semibold text-gs-orange underline-offset-2 hover:underline"
                >
                  Voir les annulations
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Raccourcis</CardTitle>
          <LinkIcon className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm font-semibold text-gs-orange">
          <Link href="/admin/reservations-materiel" className="underline-offset-2 hover:underline">
            Retour liste réservations
          </Link>
          <Link href={`/admin/factures?booking_id=${booking.id}`} className="underline-offset-2 hover:underline">
            Filtrer factures sur cette réservation
          </Link>
          <Link href={`/admin/incidents-materiel/${booking.id}`} className="underline-offset-2 hover:underline">
            Fiche incident
          </Link>
          <Link href="/admin/materiel-annulations" className="underline-offset-2 hover:underline">
            Annulations
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
