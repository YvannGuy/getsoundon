import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Package,
  PackageCheck,
  PackageOpen,
  Wallet,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";
import { CheckInActions } from "@/components/materiel/checkin-actions";
import { CheckOutAction } from "@/components/materiel/checkout-action";
import { ReportIncidentForm } from "@/components/materiel/report-incident-form";
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
  payout_due_at: string | null;
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

type ProfileRow = { id: string; full_name: string | null; email: string | null };
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
  authorized: "Empreinte active",
  released: "Libérée",
  captured: "Débitée",
  failed: "Échec",
};

const CLAIM_LABEL_PROVIDER: Record<string, { text: string; cls: string }> = {
  pending_capture: { text: "Décision admin en cours", cls: "bg-amber-100 text-amber-800" },
  captured_full: { text: "Caution retenue (totalité)", cls: "bg-emerald-100 text-emerald-700" },
  captured_partial: { text: "Caution partiellement retenue", cls: "bg-amber-100 text-amber-800" },
  released_admin: { text: "Caution libérée (admin)", cls: "bg-slate-100 text-slate-600" },
  released_auto: { text: "Caution libérée (automatique)", cls: "bg-slate-100 text-slate-600" },
};

const PAYOUT_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Versé ✓",
  failed: "Échoué",
  blocked: "Bloqué (incident / caution)",
};

function isIncidentWindowOpen(b: BookingFull): boolean {
  const deadline = b.incident_deadline_at
    ? new Date(b.incident_deadline_at)
    : new Date(new Date(`${b.end_date}T23:59:59.000Z`).getTime() + 48 * 60 * 60 * 1000);
  return new Date() < deadline;
}

export default async function ProprietaireMaterielDetailPage({
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
      "id, listing_id, customer_id, provider_id, start_date, end_date, total_price, deposit_amount, status, payout_status, payout_due_at, stripe_payment_intent_id, deposit_hold_status, deposit_release_due_at, check_in_status, check_in_at, check_in_comment, check_out_status, check_out_at, check_out_comment, incident_status, incident_at, incident_deadline_at, incident_comment, incident_amount_requested, deposit_claim_status, deposit_captured_amount, created_at"
    )
    .eq("id", bookingId)
    .eq("provider_id", user.id) // Sécurité : prestataire uniquement
    .maybeSingle();

  if (!raw) notFound();

  const booking = raw as BookingFull;

  const [{ data: customerRaw }, { data: listingRaw }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").eq("id", booking.customer_id).maybeSingle(),
    admin.from("gs_listings").select("id, title, category").eq("id", booking.listing_id).maybeSingle(),
  ]);

  const customer = customerRaw as ProfileRow | null;
  const listing = listingRaw as ListingRow | null;

  const totalEur = Number(booking.total_price);
  const depositEur = Number(booking.deposit_amount ?? 0);
  const isPaid = !!booking.stripe_payment_intent_id;
  const isActive = booking.status === "accepted" && isPaid;
  const isCompleted = booking.status === "completed";
  const canReport = !booking.incident_status && isIncidentWindowOpen(booking) && isCompleted;
  const payoutBlocked = booking.payout_status === "blocked";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/proprietaire/materiel"
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

      {/* Alerte incident + payout bloqué */}
      {booking.incident_status === "open" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-800">Incident signalé — en attente d&apos;examen</p>
            {payoutBlocked && (
              <p className="mt-1 text-sm text-amber-700">
                Le versement est suspendu jusqu&apos;à résolution par l&apos;administration.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Récapitulatif financier */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">Récapitulatif</h2>
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Montant total</dt>
              <dd className="text-lg font-bold text-slate-900">
                {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
              </dd>
            </div>
            {depositEur > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Caution locataire</dt>
                <dd className="text-sm text-slate-700">
                  {depositEur} €
                  {booking.deposit_claim_status && CLAIM_LABEL_PROVIDER[booking.deposit_claim_status] ? (
                    <span
                      className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLAIM_LABEL_PROVIDER[booking.deposit_claim_status].cls}`}
                    >
                      {CLAIM_LABEL_PROVIDER[booking.deposit_claim_status].text}
                      {Number(booking.deposit_captured_amount ?? 0) > 0 &&
                        booking.deposit_claim_status.startsWith("captured") &&
                        ` — ${Number(booking.deposit_captured_amount)} €`}
                    </span>
                  ) : (
                    <span className="ml-1 text-slate-400">
                      — {DEPOSIT_LABEL[booking.deposit_hold_status ?? "none"] ?? "—"}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <Wallet className="h-4 w-4" />
                Versement (payout)
              </dt>
              <dd
                className={`text-sm font-semibold ${
                  payoutBlocked ? "text-amber-600" : booking.payout_status === "paid" ? "text-emerald-600" : "text-slate-700"
                }`}
              >
                {PAYOUT_LABEL[booking.payout_status ?? ""] ?? booking.payout_status ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Versement prévu</dt>
              <dd className="text-sm text-slate-700">{fmt(booking.payout_due_at)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Locataire</dt>
              <dd className="text-sm text-slate-700">{customer?.full_name ?? customer?.email ?? "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Actions opérationnelles (check-in / check-out) */}
        {isActive && (
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Actions de remise / retour</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <PackageOpen className="h-4 w-4" />
                  Check-in (remise)
                </div>
                <CheckInActions
                  bookingId={booking.id}
                  initialCheckInStatus={booking.check_in_status}
                />
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <PackageCheck className="h-4 w-4" />
                  Check-out (retour)
                </div>
                <CheckOutAction
                  bookingId={booking.id}
                  initialCheckOutStatus={booking.check_out_status}
                />
              </div>
            </div>
          </section>
        )}

        {/* Suivi opérationnel (affiché si terminé ou info) */}
        {(isCompleted || (isPaid && !isActive)) && (
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Suivi opérationnel</h2>
            <div className="space-y-3">
              {[
                {
                  label: "Remise matériel (check-in)",
                  done: booking.check_in_status === "confirmed",
                  detail: booking.check_in_comment,
                  date: booking.check_in_at,
                },
                {
                  label: "Retour matériel (check-out)",
                  done: booking.check_out_status === "confirmed",
                  detail: booking.check_out_comment,
                  date: booking.check_out_at,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        item.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      {item.date && (
                        <p className="text-[11px] text-slate-400">{fmtFull(item.date)}</p>
                      )}
                      {item.detail && (
                        <p className="text-[11px] text-slate-500 italic">&ldquo;{item.detail}&rdquo;</p>
                      )}
                    </div>
                  </div>
                  {!item.done && <span className="text-[12px] text-slate-400">Non fait</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Incident / signalement */}
        {(canReport || booking.incident_status) && (
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Signalement d&apos;incident</h2>
            {booking.incident_status && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-amber-700">Montant réclamé</p>
                <p className="text-sm text-amber-900">
                  {Number(booking.incident_amount_requested ?? 0) > 0
                    ? `${Number(booking.incident_amount_requested)} €`
                    : "Non précisé"}
                </p>
                {booking.incident_comment && (
                  <>
                    <p className="mt-2 text-[11px] font-semibold text-amber-700">Commentaire</p>
                    <p className="text-sm text-amber-900">{booking.incident_comment}</p>
                  </>
                )}
              </div>
            )}
            <ReportIncidentForm
              bookingId={booking.id}
              incidentDeadlineAt={booking.incident_deadline_at}
              endDate={booking.end_date}
              incidentStatus={booking.incident_status}
            />
          </section>
        )}

        {/* Messagerie — uniquement post-paiement */}
        {isPaid && (
          <BookingChat
            bookingId={booking.id}
            otherPartyLabel={`le locataire${customer?.full_name ? ` (${customer.full_name})` : ""}`}
          />
        )}

        {/* Lien vers l'annonce */}
        <div className="flex justify-center">
          <Link
            href={`/items/${booking.listing_id}`}
            className="text-sm text-slate-400 hover:text-slate-600 hover:underline"
          >
            Voir l&apos;annonce →
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from "react";
