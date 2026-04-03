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
  Scale,
  Wallet,
} from "lucide-react";

import { getGsMaterialUnreadByBookingIds } from "@/lib/gs-material-messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";
import { BookingChat } from "@/components/materiel/booking-chat";
import { CancellationRequestPanel } from "@/components/materiel/cancellation-request-panel";
import {
  MaterielDetailFiche,
  MaterielDetailSection,
} from "@/components/materiel/materiel-detail-section";
import { MaterielOperationalRow } from "@/components/materiel/operational-row";
import { PayNowButton } from "@/components/materiel/pay-now-button";
import {
  normalizeCancellationPolicy,
  type GsBookingForCancellationEligibility,
  type GsCancellationRequestRow,
} from "@/lib/gs-booking-cancellation";

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
type ListingRow = { id: string; title: string; category: string; cancellation_policy?: string | null };

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

function bookingStatusSummary(b: BookingFull, paid: boolean): string {
  if (b.status === "refused") return "Demande refusée";
  if (b.status === "cancelled") return "Annulée";
  if (b.status === "completed") return "Terminée";
  if (b.status === "accepted") return paid ? "Confirmée (payée)" : "Acceptée — paiement requis";
  return "En attente de réponse du prestataire";
}

function incidentHeadlineClient(status: string | null): string {
  if (status === "open") return "Incident en cours d’examen";
  if (status === "resolved") return "Incident clos — résolu";
  if (status === "rejected") return "Signalement non retenu";
  return "";
}

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

  const [{ data: providerRaw }, { data: listingRaw }, { data: cancelRows, error: cancelErr }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name").eq("id", booking.provider_id).maybeSingle(),
      admin
        .from("gs_listings")
        .select("id, title, category, cancellation_policy")
        .eq("id", booking.listing_id)
        .maybeSingle(),
      admin
        .from("gs_booking_cancellation_requests")
        .select("id, booking_id, status, reason, requested_at, decided_at, admin_note, refund_amount_eur, stripe_refund_id")
        .eq("booking_id", booking.id)
        .order("requested_at", { ascending: false }),
    ]);

  const cancellationRequests: GsCancellationRequestRow[] = cancelErr
    ? []
    : ((cancelRows ?? []) as GsCancellationRequestRow[]);

  const listingPolicy = normalizeCancellationPolicy(listingRaw?.cancellation_policy);

  const provider = providerRaw as ProfileRow | null;
  const listing = listingRaw as ListingRow | null;

  const totalEur = Number(booking.total_price);
  const depositEur = Number(booking.deposit_amount ?? 0);
  const isPaid = !!booking.stripe_payment_intent_id;
  const isAcceptedUnpaid = booking.status === "accepted" && !isPaid;
  const isCompleted = booking.status === "completed";

  const materielUnreadMap = isPaid
    ? await getGsMaterialUnreadByBookingIds(user.id, [booking.id])
    : {};
  const materielUnreadOnBooking = materielUnreadMap[booking.id] ?? 0;

  const bookingForCancel: GsBookingForCancellationEligibility = {
    id: booking.id,
    customer_id: booking.customer_id,
    status: booking.status,
    stripe_payment_intent_id: booking.stripe_payment_intent_id,
    check_in_status: booking.check_in_status,
    check_out_status: booking.check_out_status,
    incident_status: booking.incident_status,
    payout_status: booking.payout_status,
  };

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/materiel"
            className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Mes locations
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {listing?.title ?? "Réservation matériel"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {CATEGORY_LABEL[listing?.category ?? ""] ?? "Matériel"} ·{" "}
              {fmt(booking.start_date)} — {fmt(booking.end_date)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <MaterielDetailFiche title="Résumé de la réservation">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80 sm:col-span-2">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                Montant total
              </dt>
              <dd className="text-lg font-bold text-slate-900">
                {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <Wallet className="h-4 w-4 shrink-0 text-slate-400" />
                Prestataire
              </dt>
              <dd className="text-right text-sm font-medium text-slate-800">{provider?.full_name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80">
              <dt className="text-sm text-slate-500">Statut</dt>
              <dd className="text-right text-sm font-medium text-slate-800">
                {bookingStatusSummary(booking, isPaid)}
              </dd>
            </div>
          </dl>
        </MaterielDetailFiche>

        <MaterielDetailSection
          step={1}
          id="etat-materiel"
          title="État du matériel"
          description="Remise (check-in), retour (check-out) et fil conducteur de la location une fois le paiement confirmé."
        >
          {!isPaid ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Après confirmation du paiement, tu verras ici l’état de la remise et du retour du matériel, ainsi qu’une
              chronologie des étapes.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Check-in & check-out</h3>
                <MaterielOperationalRow
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
                <MaterielOperationalRow
                  label="Retour du matériel"
                  icon={booking.check_out_status === "confirmed" ? PackageCheck : Package}
                  statusText={
                    booking.check_out_status === "confirmed"
                      ? `Clôturé le ${fmtFull(booking.check_out_at)}`
                      : "En attente"
                  }
                  done={booking.check_out_status === "confirmed"}
                />
              </div>
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Chronologie</h3>
                <ol className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200">
                  {timeline.map((ev, i) => (
                    <li key={i} className="relative flex items-start gap-3">
                      <span
                        className={`absolute -left-6 mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                          ev.done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                        }`}
                      />
                      <div>
                        <p className={`text-sm font-medium ${ev.done ? "text-slate-800" : "text-slate-400"}`}>
                          {ev.label}
                        </p>
                        {ev.date ? <p className="text-[11px] text-slate-400">{fmtFull(ev.date)}</p> : null}
                        {ev.detail ? (
                          <p className="mt-0.5 text-[11px] text-slate-500 italic">&ldquo;{ev.detail}&rdquo;</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </MaterielDetailSection>

        <MaterielDetailSection
          step={2}
          id="caution-materiel"
          title="Caution"
          description="Empreinte bancaire éventuelle, libération ou retenue après le retour du matériel."
        >
          {depositEur <= 0 ? (
            <p className="text-sm text-slate-600">Aucune caution n’est prévue pour cette réservation.</p>
          ) : (
            <div className="rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">Montant de l’empreinte</span>
                <span className="text-xl font-bold text-slate-900">{depositEur} €</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Statut :{" "}
                {booking.deposit_claim_status && CLAIM_LABEL_CLIENT[booking.deposit_claim_status] ? (
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLAIM_LABEL_CLIENT[booking.deposit_claim_status].cls}`}
                  >
                    {CLAIM_LABEL_CLIENT[booking.deposit_claim_status].text}
                    {Number(booking.deposit_captured_amount ?? 0) > 0 &&
                      booking.deposit_claim_status.startsWith("captured") &&
                      ` — ${Number(booking.deposit_captured_amount)} €`}
                  </span>
                ) : (
                  <span className="font-medium text-slate-800">
                    {DEPOSIT_LABEL[booking.deposit_hold_status ?? "none"] ?? "—"}
                  </span>
                )}
              </p>
              {booking.check_out_status === "confirmed" && (
                <p className="mt-2 text-xs text-slate-500">
                  Libération prévue ou effectuée :{" "}
                  {booking.deposit_hold_status === "released"
                    ? "empreinte libérée."
                    : `échéance indicative le ${fmt(booking.deposit_release_due_at)}.`}
                </p>
              )}
            </div>
          )}
        </MaterielDetailSection>

        <MaterielDetailSection
          step={3}
          id="incident-materiel"
          title="Incident / litige"
          description="Signalement côté prestataire et suivi par GetSoundOn si un litige est ouvert."
          variant={booking.incident_status === "open" ? "emphasis" : "default"}
        >
          {booking.incident_status === "open" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-amber-900">{incidentHeadlineClient(booking.incident_status)}</p>
                  <p className="mt-1 text-sm text-amber-800/95">
                    Le prestataire a signalé un problème. L’équipe examine le dossier ; tu seras informé·e des suites.
                  </p>
                </div>
              </div>
              {(Number(booking.incident_amount_requested ?? 0) > 0 || booking.incident_comment) && (
                <div className="mt-3 border-t border-amber-200/70 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Montant mentionné</p>
                  <p className="text-sm text-amber-950">
                    {Number(booking.incident_amount_requested ?? 0) > 0
                      ? `${Number(booking.incident_amount_requested)} €`
                      : "Non précisé"}
                  </p>
                  {booking.incident_comment ? (
                    <>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">
                        Détail communiqué
                      </p>
                      <p className="text-sm text-amber-950/95">{booking.incident_comment}</p>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
          {booking.incident_status && booking.incident_status !== "open" ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-slate-800">
                <Scale className="h-4 w-4 text-slate-400" />
                <span className="font-semibold">{incidentHeadlineClient(booking.incident_status)}</span>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant concerné</p>
              <p className="text-sm text-slate-800">
                {Number(booking.incident_amount_requested ?? 0) > 0
                  ? `${Number(booking.incident_amount_requested)} €`
                  : "Non précisé"}
              </p>
              {booking.incident_comment ? (
                <>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Détail</p>
                  <p className="text-sm text-slate-600">{booking.incident_comment}</p>
                </>
              ) : null}
            </div>
          ) : null}
          {!booking.incident_status && isPaid ? (
            <p className="text-sm text-slate-600">
              Aucun incident ouvert sur cette réservation. En cas de question, utilise la messagerie (étape 5).
            </p>
          ) : null}
          {!booking.incident_status && !isPaid ? (
            <p className="text-sm text-slate-500">Les incidents éventuels sont suivis après confirmation de la location.</p>
          ) : null}
        </MaterielDetailSection>

        <MaterielDetailSection
          step={4}
          id="actions-materiel"
          title="Actions à votre disposition"
          description="Paiement, demande d’annulation et suivi administratif."
        >
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Paiement</h3>
              {isPaid ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50/90 px-4 py-3 text-emerald-800 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-semibold">Paiement confirmé</span>
                </div>
              ) : isAcceptedUnpaid ? (
                <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-sm text-blue-900">
                    Ta demande a été acceptée. Procède au paiement pour confirmer ta réservation.
                  </p>
                  <PayNowButton
                    bookingId={booking.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gs-orange px-5 py-2.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 px-4 py-3 text-amber-800 ring-1 ring-amber-100">
                  <Clock className="h-5 w-5 shrink-0" />
                  <span className="text-sm">
                    {booking.status === "pending"
                      ? "En attente de confirmation du prestataire"
                      : "Paiement non disponible pour l’instant"}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Annulation</h3>
              <CancellationRequestPanel
                bookingId={booking.id}
                booking={bookingForCancel}
                existingRequests={cancellationRequests}
                listingPolicy={listingPolicy}
              />
            </div>
          </div>
        </MaterielDetailSection>

        {isPaid && (
          <MaterielDetailSection
            step={5}
            id="messagerie-materiel"
            title="Messagerie"
            description={`Échanges avec ${provider?.full_name ?? "le prestataire"} pour cette réservation.`}
          >
            <BookingChat
              key={booking.id}
              bookingId={booking.id}
              otherPartyLabel={`le prestataire${provider?.full_name ? ` (${provider.full_name})` : ""}`}
              initialUnreadCount={materielUnreadOnBooking}
            />
          </MaterielDetailSection>
        )}

        {isCompleted && !booking.incident_status && (
          <div className="flex justify-center pt-2">
            <Link
              href="/catalogue"
              className="rounded-xl border-2 border-gs-orange px-6 py-2.5 text-sm font-semibold text-gs-orange transition hover:bg-gs-orange/5"
            >
              Réserver à nouveau
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
