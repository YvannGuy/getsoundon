import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Wallet,
} from "lucide-react";

import { getGsMaterialUnreadByBookingIds } from "@/lib/gs-material-messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";
import { AcceptRefuseButtons } from "@/components/materiel/accept-refuse-buttons";
import { CheckInActions } from "@/components/materiel/checkin-actions";
import { CheckOutAction } from "@/components/materiel/checkout-action";
import { ReportIncidentForm } from "@/components/materiel/report-incident-form";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  listing_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  total_price: number | string;
  deposit_amount: number | string | null;
  status: string;
  payout_status: string | null;
  stripe_payment_intent_id: string | null;
  deposit_hold_status: string | null;
  check_in_status: string | null;
  check_in_at: string | null;
  check_out_status: string | null;
  check_out_at: string | null;
  incident_status: string | null;
  incident_deadline_at: string | null;
  created_at: string;
};

type ListingRow = { id: string; title: string; category: string };
type CustomerRow = { id: string; full_name: string | null; email: string | null };

const CATEGORY_LABEL: Record<string, string> = {
  sound: "Sono",
  dj: "DJ",
  lighting: "Lumière",
  services: "Services",
};

const PAYOUT_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Versé",
  failed: "Échoué",
  blocked: "Bloqué",
};

const DEPOSIT_LABEL: Record<string, string> = {
  none: "Aucune",
  authorized: "Empreinte active",
  released: "Libérée",
  captured: "Débitée",
  failed: "Échec",
};

function formatDate(iso: string) {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

/** Retourne true si la fenêtre d'incident est encore ouverte côté serveur. */
function isIncidentWindowOpen(booking: BookingRow): boolean {
  const deadline = booking.incident_deadline_at
    ? new Date(booking.incident_deadline_at)
    : new Date(new Date(`${booking.end_date}T23:59:59.000Z`).getTime() + 48 * 60 * 60 * 1000);
  return new Date() < deadline;
}

export default async function ProprietaireMaterielPage() {
  const { user } = await getUserOrNull();
  if (!user) redirect("/auth");

  const admin = createAdminClient();

  const SELECT_FIELDS =
    "id, listing_id, customer_id, start_date, end_date, total_price, deposit_amount, status, payout_status, stripe_payment_intent_id, deposit_hold_status, check_in_status, check_in_at, check_out_status, check_out_at, incident_status, incident_deadline_at, created_at";

  // Demandes en attente
  const { data: pendingData } = await admin
    .from("gs_bookings")
    .select(SELECT_FIELDS)
    .eq("provider_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(30);

  // Réservations actives (payées = stripe_payment_intent_id non null, status accepted)
  const { data: activeData } = await admin
    .from("gs_bookings")
    .select(SELECT_FIELDS)
    .eq("provider_id", user.id)
    .eq("status", "accepted")
    .not("stripe_payment_intent_id", "is", null)
    .order("start_date", { ascending: true })
    .limit(50);

  // Réservations terminées (30 derniers jours, fenêtre incident + historique)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: completedData } = await admin
    .from("gs_bookings")
    .select(SELECT_FIELDS)
    .eq("provider_id", user.id)
    .eq("status", "completed")
    .gte("updated_at", thirtyDaysAgo)
    .order("check_out_at", { ascending: false })
    .limit(20);

  const pending = (pendingData ?? []) as BookingRow[];
  const active = (activeData ?? []) as BookingRow[];
  const completed = (completedData ?? []) as BookingRow[];

  const allBookingIds = [...pending, ...active, ...completed].map((b) => b.id);
  const unreadByBooking =
    allBookingIds.length > 0
      ? await getGsMaterialUnreadByBookingIds(user.id, allBookingIds)
      : {};

  // Listings liés
  const allListingIds = [...new Set([...pending, ...active, ...completed].map((b) => b.listing_id))];
  let listingsMap: Record<string, ListingRow> = {};
  if (allListingIds.length > 0) {
    const { data: listings } = await admin
      .from("gs_listings")
      .select("id, title, category")
      .in("id", allListingIds);
    for (const l of (listings ?? []) as ListingRow[]) listingsMap[l.id] = l;
  }

  // Profils locataires
  const allCustomerIds = [...new Set([...pending, ...active, ...completed].map((b) => b.customer_id))];
  let customersMap: Record<string, CustomerRow> = {};
  if (allCustomerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", allCustomerIds);
    for (const p of (profiles ?? []) as CustomerRow[]) customersMap[p.id] = p;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Matériel — Location</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demandes, réservations et suivi opérationnel
        </p>
      </div>

      {/* ── Section 1 : Demandes à traiter ─────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">
            Demandes à traiter
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-[12px] font-semibold text-amber-700">
                {pending.length}
              </span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <EmptyState label="Aucune demande en attente." />
        ) : (
          <ul className="space-y-3">
            {pending.map((booking) => {
              const listing = listingsMap[booking.listing_id];
              const customer = customersMap[booking.customer_id];
              const totalEur = Number(booking.total_price);
              const depositEur = Number(booking.deposit_amount ?? 0);

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <BookingInfo
                    listing={listing}
                    booking={booking}
                    customer={customer}
                    badge={{ label: "En attente", cls: "bg-amber-100 text-amber-700" }}
                    unreadCount={unreadByBooking[booking.id] ?? 0}
                  />
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <PriceBlock totalEur={totalEur} depositEur={depositEur} />
                    <AcceptRefuseButtons bookingId={booking.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Section 2 : Réservations actives (payées) ───────────────────── */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-800">
            Réservations confirmées
            {active.length > 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">
                {active.length}
              </span>
            )}
          </h2>
        </div>

        {active.length === 0 ? (
          <EmptyState label="Aucune réservation active." />
        ) : (
          <ul className="space-y-3">
            {active.map((booking) => {
              const listing = listingsMap[booking.listing_id];
              const customer = customersMap[booking.customer_id];
              const totalEur = Number(booking.total_price);
              const depositEur = Number(booking.deposit_amount ?? 0);
              const hasPayoutIssue = booking.incident_status === "open" && booking.payout_status !== "paid";

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <BookingInfo
                      listing={listing}
                      booking={booking}
                      customer={customer}
                      badge={{ label: "Confirmée", cls: "bg-emerald-100 text-emerald-700" }}
                      unreadCount={unreadByBooking[booking.id] ?? 0}
                    />
                    {/* Statuts opérationnels */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {booking.check_in_status === "confirmed" && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                          Remise confirmée
                        </span>
                      )}
                      {booking.check_in_status === "opened" && !booking.check_out_status && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">
                          Check-in ouvert
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <PriceBlock totalEur={totalEur} depositEur={depositEur} />
                    {booking.payout_status && (
                      <span className={`flex items-center gap-1 text-[11px] ${hasPayoutIssue ? "text-amber-600" : "text-slate-500"}`}>
                        <Wallet className="h-3 w-3" />
                        Versement : {PAYOUT_LABEL[booking.payout_status] ?? booking.payout_status}
                        {hasPayoutIssue && " ⚠️ bloqué (incident)"}
                      </span>
                    )}
                    {booking.deposit_hold_status && booking.deposit_hold_status !== "none" && depositEur > 0 && (
                      <span className="text-[11px] text-slate-400">
                        Caution : {DEPOSIT_LABEL[booking.deposit_hold_status] ?? booking.deposit_hold_status}
                      </span>
                    )}
                    {/* CTA opérationnels */}
                    <CheckInActions
                      bookingId={booking.id}
                      initialCheckInStatus={booking.check_in_status}
                    />
                    <CheckOutAction
                      bookingId={booking.id}
                      initialCheckOutStatus={booking.check_out_status}
                    />
                    <Link
                      href={`/proprietaire/materiel/${booking.id}`}
                      className="mt-1 text-[11px] text-slate-400 hover:underline"
                    >
                      Détail →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Section 3 : Terminées (30 derniers jours) ───────────────────── */}
      {completed.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Terminées — 30 derniers jours</h2>
          </div>
          <ul className="space-y-3">
            {completed.map((booking) => {
              const listing = listingsMap[booking.listing_id];
              const customer = customersMap[booking.customer_id];
              const totalEur = Number(booking.total_price);
              const depositEur = Number(booking.deposit_amount ?? 0);
              const canReport = !booking.incident_status && isIncidentWindowOpen(booking);
              const hasIncident = !!booking.incident_status;
              const payoutBlocked = hasIncident && booking.payout_status !== "paid";

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <BookingInfo
                      listing={listing}
                      booking={booking}
                      customer={customer}
                      badge={{ label: "Terminée", cls: "bg-slate-100 text-slate-600" }}
                      unreadCount={unreadByBooking[booking.id] ?? 0}
                    />
                    {hasIncident && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <p className="text-[12px] font-semibold text-amber-800">Incident signalé</p>
                          {payoutBlocked && (
                            <p className="text-[11px] text-amber-700">
                              Versement bloqué en attendant résolution
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <PriceBlock totalEur={totalEur} depositEur={depositEur} />
                    {booking.payout_status && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Wallet className="h-3 w-3" />
                        {PAYOUT_LABEL[booking.payout_status] ?? booking.payout_status}
                      </span>
                    )}
                    {/* Signalement incident dans la fenêtre 48h */}
                    {(canReport || hasIncident) && (
                      <ReportIncidentForm
                        bookingId={booking.id}
                        incidentDeadlineAt={booking.incident_deadline_at}
                        endDate={booking.end_date}
                        incidentStatus={booking.incident_status}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-10 flex justify-center">
        <Link
          href="/proprietaire/annonces"
          className="text-sm font-medium text-slate-400 hover:text-slate-600 hover:underline"
        >
          Gérer mes annonces matériel →
        </Link>
      </div>
    </div>
  );
}

// ─── Sous-composants serveur ─────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      <Package className="h-5 w-5 shrink-0 text-slate-300" />
      {label}
    </div>
  );
}

function BookingInfo({
  listing,
  booking,
  customer,
  badge,
  unreadCount = 0,
}: {
  listing: ListingRow | undefined;
  booking: BookingRow;
  customer: CustomerRow | undefined;
  badge: { label: string; cls: string };
  unreadCount?: number;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {CATEGORY_LABEL[listing?.category ?? ""] ?? "Matériel"}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
        {unreadCount > 0 && (
          <span
            className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white"
            title={`${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`}
          >
            {unreadCount > 99 ? "99+" : unreadCount} msg
          </span>
        )}
      </div>
      <p className="mt-1 truncate font-semibold text-slate-900">
        {listing?.title ?? `Réservation ${booking.id.slice(0, 8)}`}
      </p>
      <p className="mt-0.5 text-sm text-slate-500">
        {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
      </p>
      {customer && (
        <p className="mt-1 text-[11px] text-slate-400">
          {customer.full_name ?? customer.email ?? "—"}
        </p>
      )}
    </div>
  );
}

function PriceBlock({ totalEur, depositEur }: { totalEur: number; depositEur: number }) {
  return (
    <>
      <p className="text-lg font-bold text-slate-900">
        {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
      </p>
      {depositEur > 0 && (
        <p className="text-[11px] text-slate-400">Caution {depositEur} €</p>
      )}
    </>
  );
}
