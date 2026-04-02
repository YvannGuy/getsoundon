import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  PackageCheck,
  PackageOpen,
  Wallet,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";
import { PayNowButton } from "@/components/materiel/pay-now-button";
import { BookingChat } from "@/components/materiel/booking-chat";

export const dynamic = "force-dynamic";

type BookingFull = {
  id: string;
  listing_id: string;
  customer_id: string;
  provider_id: string;
  start_date: string;
  end_date: string;
  total_price: number | string;
  deposit_amount: number | string | null;
  status: string;
  payout_status: string | null;
  stripe_payment_intent_id: string | null;
  deposit_hold_status: string | null;
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
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null };
type ListingRow = { id: string; title: string; category: string };

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

function fmtFull(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return iso;
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  sound: "Sono",
  dj: "DJ",
  lighting: "Lumière",
  services: "Services",
};

const DEPOSIT_LABEL: Record<string, string> = {
  none: "Aucune caution",
  authorized: "Empreinte bancaire active (non débitée)",
  released: "Libérée",
  captured: "Débitée",
  failed: "Échec d'empreinte",
};

const CLAIM_LABEL_CLIENT: Record<string, { text: string; cls: string }> = {
  pending_capture: { text: "Caution maintenue — Décision en cours", cls: "bg-amber-100 text-amber-800" },
  captured_full: { text: "Caution retenue (totalité)", cls: "bg-red-100 text-red-700" },
  captured_partial: { text: "Caution partiellement retenue", cls: "bg-amber-100 text-amber-800" },
  released_admin: { text: "Caution libérée", cls: "bg-emerald-100 text-emerald-700" },
  released_auto: { text: "Caution libérée automatiquement", cls: "bg-emerald-100 text-emerald-700" },
};

export default async function DashboardMaterielDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = await params;
  const { user } = await getUserOrNull();
  if (!user) redirect("/auth");

  const admin = createAdminClient();

  const { data: raw } = await admin
    .from("gs_bookings")
    .select(
      "id, listing_id, customer_id, provider_id, start_date, end_date, total_price, deposit_amount, status, payout_status, stripe_payment_intent_id, deposit_hold_status, deposit_release_due_at, check_in_status, check_in_at, check_in_comment, check_out_status, check_out_at, check_out_comment, incident_status, incident_at, incident_deadline_at, incident_comment, incident_amount_requested, deposit_claim_status, deposit_captured_amount, created_at"
    )
    .eq("id", bookingId)
    .eq("customer_id", user.id) // Sécurité : locataire uniquement
    .maybeSingle();

  if (!raw) notFound();

  const booking = raw as BookingFull;

  const [{ data: providerRaw }, { data: listingRaw }] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("id", booking.provider_id).maybeSingle(),
    admin.from("gs_listings").select("id, title, category").eq("id", booking.listing_id).maybeSingle(),
  ]);

  const provider = providerRaw as ProfileRow | null;
  const listing = listingRaw as ListingRow | null;

  const totalEur = Number(booking.total_price);
  const depositEur = Number(booking.deposit_amount ?? 0);
  const isPaid = !!booking.stripe_payment_intent_id;
  const isAcceptedUnpaid = booking.status === "accepted" && !isPaid;
  const isCompleted = booking.status === "completed";

  // Timeline
  type TimelineEvent = { label: string; detail?: string; date: string | null; done: boolean };
  const timeline: TimelineEvent[] = [
    { label: "Demande envoyée", date: booking.created_at, done: true },
    {
      label: booking.status === "refused" ? "Demande refusée" : "Demande acceptée",
      date: null,
      done: booking.status !== "pending",
    },
    {
      label: "Paiement confirmé",
      date: null,
      done: isPaid,
    },
    {
      label: "Remise du matériel",
      detail: booking.check_in_comment ?? undefined,
      date: booking.check_in_at,
      done: booking.check_in_status === "confirmed",
    },
    {
      label: "Retour du matériel",
      detail: booking.check_out_comment ?? undefined,
      date: booking.check_out_at,
      done: booking.check_out_status === "confirmed",
    },
    ...(booking.incident_status
      ? [
          {
            label:
              booking.incident_status === "open"
                ? "Incident signalé"
                : booking.incident_status === "resolved"
                  ? "Incident validé"
                  : "Incident rejeté",
            date: booking.incident_at,
            done: true,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/materiel"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes locations
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {listing?.title ?? "Réservation matériel"}
          </h1>
          <p className="text-sm text-slate-500">
            {CATEGORY_LABEL[listing?.category ?? ""] ?? "Matériel"} ·{" "}
            {fmt(booking.start_date)} — {fmt(booking.end_date)}
          </p>
        </div>
      </div>

      {/* Alerte incident */}
      {booking.incident_status === "open" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-800">Incident en cours d&apos;examen</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Le prestataire a signalé un problème. L&apos;équipe GetSoundOn va l&apos;examiner.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Récapitulatif financier */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">Récapitulatif</h2>
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <CreditCard className="h-4 w-4" />
                Montant total
              </dt>
              <dd className="text-lg font-bold text-slate-900">
                {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
              </dd>
            </div>
            {depositEur > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Caution</dt>
                <dd className="text-sm text-slate-700">
                  {depositEur} €{" "}
                  {booking.deposit_claim_status && CLAIM_LABEL_CLIENT[booking.deposit_claim_status] ? (
                    <span
                      className={`ml-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLAIM_LABEL_CLIENT[booking.deposit_claim_status].cls}`}
                    >
                      {CLAIM_LABEL_CLIENT[booking.deposit_claim_status].text}
                      {Number(booking.deposit_captured_amount ?? 0) > 0 &&
                        booking.deposit_claim_status.startsWith("captured") &&
                        ` — ${Number(booking.deposit_captured_amount)} €`}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      ({DEPOSIT_LABEL[booking.deposit_hold_status ?? "none"] ?? "—"})
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <Wallet className="h-4 w-4" />
                Prestataire
              </dt>
              <dd className="text-sm text-slate-700">{provider?.full_name ?? "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Statut paiement */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">Paiement</h2>
          {isPaid ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Paiement confirmé</span>
            </div>
          ) : isAcceptedUnpaid ? (
            <div className="space-y-3">
              <p className="text-sm text-blue-700">
                Ta demande a été acceptée. Procède au paiement pour confirmer ta réservation.
              </p>
              <PayNowButton
                bookingId={booking.id}
                className="flex items-center gap-2 rounded-xl bg-gs-orange px-5 py-2.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              <span className="text-sm">
                {booking.status === "pending"
                  ? "En attente de confirmation du prestataire"
                  : "Non payé"}
              </span>
            </div>
          )}
        </section>

        {/* Statuts opérationnels (check-in / check-out) */}
        {isPaid && (
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Suivi opérationnel</h2>
            <div className="space-y-3">
              <OperationalRow
                label="Remise du matériel"
                icon={
                  booking.check_in_status === "confirmed"
                    ? PackageCheck
                    : booking.check_in_status === "opened"
                      ? PackageOpen
                      : Package
                }
                statusText={
                  booking.check_in_status === "confirmed"
                    ? `Confirmée le ${fmtFull(booking.check_in_at)}`
                    : booking.check_in_status === "opened"
                      ? "En cours de confirmation par le prestataire"
                      : "En attente"
                }
                done={booking.check_in_status === "confirmed"}
                pending={booking.check_in_status === "opened"}
              />
              <OperationalRow
                label="Retour du matériel"
                icon={booking.check_out_status === "confirmed" ? PackageCheck : Package}
                statusText={
                  booking.check_out_status === "confirmed"
                    ? `Clôturé le ${fmtFull(booking.check_out_at)}`
                    : "En attente"
                }
                done={booking.check_out_status === "confirmed"}
              />
              {depositEur > 0 && booking.check_out_status === "confirmed" && (
                <OperationalRow
                  label="Libération caution"
                  icon={CheckCircle2}
                  statusText={
                    booking.deposit_hold_status === "released"
                      ? "Libérée"
                      : `Prévue le ${fmt(booking.deposit_release_due_at)}`
                  }
                  done={booking.deposit_hold_status === "released"}
                />
              )}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">Chronologie</h2>
          <ol className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200">
            {timeline.map((ev, i) => (
              <li key={i} className="relative flex items-start gap-3">
                <span
                  className={`absolute -left-6 mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                    ev.done
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white"
                  }`}
                />
                <div>
                  <p className={`text-sm font-medium ${ev.done ? "text-slate-800" : "text-slate-400"}`}>
                    {ev.label}
                  </p>
                  {ev.date && (
                    <p className="text-[11px] text-slate-400">{fmtFull(ev.date)}</p>
                  )}
                  {ev.detail && (
                    <p className="mt-0.5 text-[11px] text-slate-500 italic">&ldquo;{ev.detail}&rdquo;</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Messagerie — uniquement post-paiement */}
        {isPaid && (
          <BookingChat
            bookingId={booking.id}
            otherPartyLabel={`le prestataire${provider?.full_name ? ` (${provider.full_name})` : ""}`}
          />
        )}

        {/* CTA retour catalogue si terminé */}
        {isCompleted && !booking.incident_status && (
          <div className="flex justify-center">
            <Link
              href="/catalogue"
              className="rounded-lg border border-gs-orange px-5 py-2 text-sm font-semibold text-gs-orange transition hover:bg-gs-orange/5"
            >
              Réserver à nouveau
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function OperationalRow({
  label,
  icon: Icon,
  statusText,
  done,
  pending = false,
}: {
  label: string;
  icon: React.ElementType;
  statusText: string;
  done: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${done ? "text-emerald-500" : pending ? "text-blue-500" : "text-slate-300"}`}
        />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span
        className={`text-right text-[12px] ${
          done ? "text-emerald-600" : pending ? "text-blue-600" : "text-slate-400"
        }`}
      >
        {statusText}
      </span>
    </div>
  );
}

import React from "react";
