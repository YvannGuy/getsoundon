import Link from "next/link";
import { redirect } from "next/navigation";
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Settings2,
  Wallet,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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

function statusBadge(status: string) {
  const base =
    status === "pending"
      ? "bg-sky-100 text-sky-800"
      : status === "accepted"
        ? "bg-emerald-100 text-emerald-700"
        : status === "refused" || status === "cancelled"
          ? "bg-red-100 text-red-700"
          : status === "completed"
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-100 text-amber-800";
  const label =
    status === "pending"
      ? "En attente"
      : status === "accepted"
        ? "Acceptée"
        : status === "refused" || status === "cancelled"
          ? "Refusée / supprimée"
          : status === "completed"
            ? "Terminée"
            : "Paiement requis";
  return { base, label };
}

function dateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expandRange(startIso: string, endIso: string): string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(dateKey(d));
  }
  return days;
}

function dayStatusPriority(status: string): number {
  if (status === "pending") return 4;
  if (status === "accepted") return 3;
  if (status === "refused" || status === "cancelled") return 2;
  if (status === "completed") return 1;
  return 0;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProprietaireMaterielPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const viewParam = typeof params.view === "string" ? params.view : null;
  const statusFilter = typeof params.status === "string" ? params.status : null;
  const isCalendarView = viewParam === "calendar";

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

  // Refusées / annulées
  const { data: refusedData } = await admin
    .from("gs_bookings")
    .select(SELECT_FIELDS)
    .eq("provider_id", user.id)
    .in("status", ["refused", "cancelled"])
    .order("updated_at", { ascending: false })
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
  const refused = (refusedData ?? []) as BookingRow[];
  const completed = (completedData ?? []) as BookingRow[];

  const allBookingIds = [...pending, ...active, ...completed, ...refused].map((b) => b.id);
  const unreadByBooking =
    allBookingIds.length > 0
      ? await getGsMaterialUnreadByBookingIds(user.id, allBookingIds)
      : {};

  const { data: myListingsData } = await admin
    .from("gs_listings")
    .select("id, title, is_active")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const myListings = (myListingsData ?? []) as { id: string; title: string; is_active: boolean }[];

  // Listings liés
  const allListingIds = [...new Set([...pending, ...active, ...completed, ...refused].map((b) => b.listing_id))];
  let listingsMap: Record<string, ListingRow> = {};
  if (allListingIds.length > 0) {
    const { data: listings } = await admin
      .from("gs_listings")
      .select("id, title, category")
      .in("id", allListingIds);
    for (const l of (listings ?? []) as ListingRow[]) listingsMap[l.id] = l;
  }

  // Profils clients (customer_id)
  const allCustomerIds = [...new Set([...pending, ...active, ...completed, ...refused].map((b) => b.customer_id))];
  let customersMap: Record<string, CustomerRow> = {};
  if (allCustomerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", allCustomerIds);
    for (const p of (profiles ?? []) as CustomerRow[]) customersMap[p.id] = p;
  }

  const bookingsCalendar = [...pending, ...active, ...refused, ...completed]
    .filter((b) => {
      if (!statusFilter) return true;
      if (statusFilter === "refused" || statusFilter === "closed") return b.status === "refused" || b.status === "cancelled";
      return b.status === statusFilter;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  if (isCalendarView) {
    const countByStatus = { pending: 0, accepted: 0, refused: 0, completed: 0 };
    const dayMap = new Map<string, { status: string }>();
    for (const b of bookingsCalendar) {
      const span = expandRange(b.start_date, b.end_date ?? b.start_date);
      if (b.status === "pending") countByStatus.pending += 1;
      else if (b.status === "accepted") countByStatus.accepted += 1;
      else if (b.status === "refused" || b.status === "cancelled") countByStatus.refused += 1;
      else if (b.status === "completed") countByStatus.completed += 1;
      for (const day of span) {
        const existing = dayMap.get(day);
        if (!existing || dayStatusPriority(b.status) > dayStatusPriority(existing.status)) {
          dayMap.set(day, { status: b.status });
        }
      }
    }

    const monthParam = typeof params.view_month === "string" ? params.view_month : null;
    const baseDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
    const currentMonth = startOfMonth(baseDate);
    const monthStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const monthEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
      days.push(d);
    }
    const prevMonth = format(addMonths(currentMonth, -1), "yyyy-MM");
    const nextMonth = format(addMonths(currentMonth, 1), "yyyy-MM");
    const todayKey = dateKey(new Date());

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-black">Réservations · Vue calendrier</h1>
            <p className="mt-2 text-sm text-slate-500">
              Toutes les réservations reçues, regroupées par date, avec leurs statuts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/proprietaire/materiel?view=calendar&view_month=${prevMonth}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ‹ Mois précédent
            </Link>
            <Link
              href={`/proprietaire/materiel?view=calendar&view_month=${nextMonth}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Mois suivant ›
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-center text-sm font-semibold text-slate-700">
            {format(currentMonth, "LLLL yyyy", { locale: fr })}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span>lu.</span>
            <span>ma.</span>
            <span>me.</span>
            <span>je.</span>
            <span>ve.</span>
            <span>sa.</span>
            <span>di.</span>
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = dateKey(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const st = dayMap.get(key)?.status ?? null;
              let base =
                st === "pending"
                  ? "bg-sky-50 ring-1 ring-sky-200"
                  : st === "accepted"
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : st === "refused" || st === "cancelled"
                      ? "bg-red-50 ring-1 ring-red-200"
                      : st === "completed"
                        ? "bg-slate-50 ring-1 ring-slate-200"
                        : "bg-white";
              if (key === todayKey) {
                base = cn(base, "bg-gs-orange/10");
              }
              const textCls = isCurrentMonth ? "text-slate-800" : "text-slate-400";
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[78px] rounded-md border border-slate-200 p-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                    base
                  )}
                >
                  <div className={cn("text-xs font-semibold", textCls)}>{day.getDate()}</div>
                  {st && (
                    <div className="mt-1 text-[11px] font-medium text-slate-700">
                      {st === "pending"
                        ? "En attente"
                        : st === "accepted"
                          ? "Acceptée"
                          : st === "refused" || st === "cancelled"
                            ? "Refusée"
                            : "Terminée"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span className="h-3 w-3 rounded-full bg-sky-400" aria-hidden />
            En attente
            <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
              {countByStatus.pending}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span className="h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
            Acceptées
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              {countByStatus.accepted}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span className="h-3 w-3 rounded-full bg-red-500" aria-hidden />
            Refusées / supprimées
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
              {countByStatus.refused}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span className="h-3 w-3 rounded-full bg-slate-500" aria-hidden />
            Terminées
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
              {countByStatus.completed}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!isCalendarView && statusFilter) {
    const filteredRows =
      statusFilter === "pending"
        ? pending
        : statusFilter === "accepted"
          ? active
          : statusFilter === "refused" || statusFilter === "closed"
            ? refused
            : completed;

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-black">
              {statusFilter === "pending"
                ? "Réservations en attente"
                : statusFilter === "accepted"
                  ? "Réservations acceptées"
                  : statusFilter === "refused" || statusFilter === "closed"
                    ? "Réservations refusées / supprimées"
                    : "Réservations terminées"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">Vue filtrée par statut.</p>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-600">
            Aucune réservation pour ce statut.
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredRows.map((booking) => {
              const listing = listingsMap[booking.listing_id];
              const customer = customersMap[booking.customer_id];
              const totalEur = Number(booking.total_price);
              const depositEur = Number(booking.deposit_amount ?? 0);
              const hasIncident = booking.incident_status === "open";
              const unreadChat = unreadByBooking[booking.id] ?? 0;
              const badge = statusBadge(booking.status);

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {CATEGORY_LABEL[listing?.category ?? ""] ?? "Matériel"}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.base}`}>
                        {badge.label}
                      </span>
                      {unreadChat > 0 && (
                        <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          {unreadChat > 99 ? "99+" : unreadChat} msg
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate font-semibold text-slate-900">
                      {listing?.title ?? `Réservation ${booking.id.slice(0, 8)}`}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                    </p>
                    {customer?.full_name && (
                      <p className="mt-0.5 text-xs text-slate-500">Client : {customer.full_name}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
                    </p>
                    {depositEur > 0 && (
                      <p className="text-[11px] text-slate-400">Caution {depositEur} € (non débitée)</p>
                    )}
                    <Link
                      href={`/proprietaire/materiel/${booking.id}`}
                      className="text-[12px] font-medium text-gs-orange underline-offset-2 hover:underline"
                    >
                      Voir le détail →
                    </Link>
                    {hasIncident && (
                      <span className="mt-1 text-[11px] font-semibold text-amber-700">Incident signalé</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Réservations reçues</h1>
        <p className="mt-2 text-sm text-slate-500">Demandes, réservations et suivi opérationnel de tes annonces.</p>
      </div>

      {myListings.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-800">Mes annonces matériel</h2>
          </div>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {myListings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">{l.title}</span>
                <div className="flex items-center gap-2">
                  {!l.is_active && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Inactive
                    </span>
                  )}
                  <Link
                    href={`/proprietaire/materiel/listing/${l.id}/reglages`}
                    className="text-sm font-medium text-gs-orange hover:underline"
                  >
                    Caution, paiement, annulation…
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
