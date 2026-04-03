import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
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
import { CheckInActions } from "@/components/materiel/checkin-actions";
import { CheckOutAction } from "@/components/materiel/checkout-action";
import {
  MaterielDetailFiche,
  MaterielDetailSection,
} from "@/components/materiel/materiel-detail-section";
import { MaterielOperationalRow } from "@/components/materiel/operational-row";
import { ReportIncidentForm } from "@/components/materiel/report-incident-form";

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

function bookingStatusSummaryOwner(b: BookingFull, isPaid: boolean): string {
  if (b.status === "refused") return "Demande refusée";
  if (b.status === "cancelled") return "Annulée";
  if (b.status === "completed") return "Terminée";
  if (b.status === "accepted") return isPaid ? "Confirmée (payée)" : "Acceptée — paiement locataire en attente";
  return "En attente de votre réponse (accepter / refuser)";
}

function incidentHeadlineProvider(status: string | null): string {
  if (status === "open") return "Incident signalé — examen en cours";
  if (status === "resolved") return "Incident clos";
  if (status === "rejected") return "Signalement non retenu";
  return "";
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
  const materielUnreadMap = isPaid
    ? await getGsMaterialUnreadByBookingIds(user.id, [booking.id])
    : {};
  const materielUnreadOnBooking = materielUnreadMap[booking.id] ?? 0;
  const canReport = !booking.incident_status && isIncidentWindowOpen(booking) && isCompleted;
  const payoutBlocked = booking.payout_status === "blocked";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/proprietaire/materiel"
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
                Montant de la location
              </dt>
              <dd className="text-lg font-bold text-slate-900">
                {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80 sm:col-span-2">
              <dt className="text-sm text-slate-500">Locataire</dt>
              <dd className="text-right text-sm font-medium text-slate-800">
                {customer?.full_name ?? customer?.email ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <Wallet className="h-4 w-4 shrink-0 text-slate-400" />
                Versement
              </dt>
              <dd
                className={`text-right text-sm font-semibold ${
                  payoutBlocked ? "text-amber-600" : booking.payout_status === "paid" ? "text-emerald-600" : "text-slate-700"
                }`}
              >
                {PAYOUT_LABEL[booking.payout_status ?? ""] ?? booking.payout_status ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80">
              <dt className="text-sm text-slate-500">Versement prévu</dt>
              <dd className="text-right text-sm font-medium text-slate-800">{fmt(booking.payout_due_at)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/80 sm:col-span-2">
              <dt className="text-sm text-slate-500">Statut réservation</dt>
              <dd className="text-right text-sm font-medium text-slate-800">
                {bookingStatusSummaryOwner(booking, isPaid)}
              </dd>
            </div>
          </dl>
        </MaterielDetailFiche>

        <MaterielDetailSection
          step={1}
          id="etat-materiel"
          title="État du matériel"
          description="Ce que vous constatez sur la remise et le retour du matériel (lecture seule) ; les actions de validation sont à l’étape 4."
        >
          {!isPaid ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Une fois le paiement locataire confirmé, le suivi check-in / check-out et les détails apparaîtront ici.
            </p>
          ) : (
            <div className="space-y-4 rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Check-in & check-out</h3>
              <MaterielOperationalRow
                label="Remise du matériel (check-in)"
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
                      ? "En attente de votre validation"
                      : "En attente"
                }
                done={booking.check_in_status === "confirmed"}
                pending={booking.check_in_status === "opened"}
              />
              {booking.check_in_comment ? (
                <p className="ml-6 text-[12px] italic text-slate-500">&ldquo;{booking.check_in_comment}&rdquo;</p>
              ) : null}
              <MaterielOperationalRow
                label="Retour du matériel (check-out)"
                icon={booking.check_out_status === "confirmed" ? PackageCheck : Package}
                statusText={
                  booking.check_out_status === "confirmed"
                    ? `Clôturé le ${fmtFull(booking.check_out_at)}`
                    : "En attente"
                }
                done={booking.check_out_status === "confirmed"}
              />
              {booking.check_out_comment ? (
                <p className="ml-6 text-[12px] italic text-slate-500">&ldquo;{booking.check_out_comment}&rdquo;</p>
              ) : null}
            </div>
          )}
        </MaterielDetailSection>

        <MaterielDetailSection
          step={2}
          id="caution-materiel"
          title="Caution locataire"
          description="Empreinte, réclamation éventuelle et impact sur le versement."
        >
          {depositEur <= 0 ? (
            <p className="text-sm text-slate-600">Aucune caution sur cette réservation.</p>
          ) : (
            <div className="rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">Montant de l’empreinte</span>
                <span className="text-xl font-bold text-slate-900">{depositEur} €</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Statut :{" "}
                {booking.deposit_claim_status && CLAIM_LABEL_PROVIDER[booking.deposit_claim_status] ? (
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLAIM_LABEL_PROVIDER[booking.deposit_claim_status].cls}`}
                  >
                    {CLAIM_LABEL_PROVIDER[booking.deposit_claim_status].text}
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
            </div>
          )}
        </MaterielDetailSection>

        <MaterielDetailSection
          step={3}
          id="incident-materiel"
          title="Incident / litige"
          description="Signalement après retour du matériel, traitement par GetSoundOn."
          variant={booking.incident_status === "open" ? "emphasis" : "default"}
        >
          {booking.incident_status === "open" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-amber-900">{incidentHeadlineProvider(booking.incident_status)}</p>
                  {payoutBlocked ? (
                    <p className="mt-1 text-sm text-amber-800/95">
                      Le versement est suspendu jusqu’à décision de l’administration.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-800/95">
                      Vous serez informé·e lorsque le dossier sera traité.
                    </p>
                  )}
                </div>
              </div>
              {(Number(booking.incident_amount_requested ?? 0) > 0 || booking.incident_comment) && (
                <div className="mt-3 border-t border-amber-200/70 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Montant réclamé</p>
                  <p className="text-sm text-amber-950">
                    {Number(booking.incident_amount_requested ?? 0) > 0
                      ? `${Number(booking.incident_amount_requested)} €`
                      : "Non précisé"}
                  </p>
                  {booking.incident_comment ? (
                    <>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">
                        Votre commentaire
                      </p>
                      <p className="text-sm text-amber-950/95">{booking.incident_comment}</p>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
          {booking.incident_status && booking.incident_status !== "open" && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <Scale className="h-4 w-4 text-slate-400" />
                <span className="font-semibold">{incidentHeadlineProvider(booking.incident_status)}</span>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant réclamé</p>
              <p className="text-sm text-slate-800">
                {Number(booking.incident_amount_requested ?? 0) > 0
                  ? `${Number(booking.incident_amount_requested)} €`
                  : "Non précisé"}
              </p>
              {booking.incident_comment ? (
                <>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Votre commentaire</p>
                  <p className="text-sm text-slate-700">{booking.incident_comment}</p>
                </>
              ) : null}
            </div>
          )}
          {(canReport || booking.incident_status) && (
            <div className="pt-1">
              <ReportIncidentForm
                bookingId={booking.id}
                incidentDeadlineAt={booking.incident_deadline_at}
                endDate={booking.end_date}
                incidentStatus={booking.incident_status}
              />
            </div>
          )}
          {!canReport && !booking.incident_status && isPaid && (
            <p className="text-sm text-slate-600">
              Aucun signalement en cours. La fenêtre de signalement s’ouvre après la fin de location (délai affiché dans le
              formulaire lorsqu’elle est active).
            </p>
          )}
          {!isPaid && (
            <p className="text-sm text-slate-500">Le signalement d’incident concerne les locations confirmées et terminées.</p>
          )}
        </MaterielDetailSection>

        <MaterielDetailSection
          step={4}
          id="actions-materiel"
          title="Actions à votre disposition"
          description="Valider la remise et le retour du matériel lorsque la réservation est active et payée."
        >
          {!isPaid ? (
            <p className="text-sm text-slate-600">
              Les actions check-in / check-out seront disponibles après paiement par le locataire.
            </p>
          ) : !isActive ? (
            <p className="text-sm text-slate-600">
              {isCompleted
                ? "Cette réservation est terminée — plus d’action de remise ou de retour à effectuer ici."
                : "Aucune action de remise / retour requise pour l’instant sur ce statut."}
            </p>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <PackageOpen className="h-4 w-4 text-slate-400" />
                  Check-in — remise au locataire
                </div>
                <CheckInActions bookingId={booking.id} initialCheckInStatus={booking.check_in_status} />
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <PackageCheck className="h-4 w-4 text-slate-400" />
                  Check-out — retour du matériel
                </div>
                <CheckOutAction bookingId={booking.id} initialCheckOutStatus={booking.check_out_status} />
              </div>
            </div>
          )}
        </MaterielDetailSection>

        {isPaid && (
          <MaterielDetailSection
            step={5}
            id="messagerie-materiel"
            title="Messagerie"
            description={`Échanges avec ${customer?.full_name ?? "le locataire"} pour cette réservation.`}
          >
            <BookingChat
              key={booking.id}
              bookingId={booking.id}
              otherPartyLabel={`le locataire${customer?.full_name ? ` (${customer.full_name})` : ""}`}
              initialUnreadCount={materielUnreadOnBooking}
            />
          </MaterielDetailSection>
        )}

        <div className="flex justify-center pt-2">
          <Link
            href={`/items/${booking.listing_id}`}
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
          >
            Voir l’annonce publique →
          </Link>
        </div>
      </div>
    </div>
  );
}
