import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  PackageCheck,
  PackageOpen,
  XCircle,
} from "lucide-react";

import { getGsMaterialUnreadByBookingIds } from "@/lib/gs-material-messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrNull } from "@/lib/supabase/server";
import { PayNowButton } from "@/components/materiel/pay-now-button";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  listing_id: string;
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

// ─── Statuts dérivés ─────────────────────────────────────────────────────────
type DerivedStatus =
  | "pending"
  | "accepted_unpaid"
  | "paid"
  | "refused"
  | "cancelled"
  | "completed";

function deriveStatus(b: BookingRow): DerivedStatus {
  if (b.status === "refused") return "refused";
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "completed") return "completed";
  if (b.status === "accepted") {
    return b.stripe_payment_intent_id ? "paid" : "accepted_unpaid";
  }
  return "pending";
}

const STATUS_LABEL: Record<DerivedStatus, string> = {
  pending: "En attente",
  accepted_unpaid: "Acceptée — À payer",
  paid: "Réservée",
  refused: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
};

const STATUS_CLASS: Record<DerivedStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted_unpaid: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  completed: "bg-slate-100 text-slate-600",
};

const CATEGORY_LABEL: Record<string, string> = {
  sound: "Sono",
  dj: "DJ",
  lighting: "Lumière",
  services: "Services",
};

function formatDate(iso: string) {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

export default async function DashboardMaterielPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user } = await getUserOrNull();
  if (!user) return null;

  const params = await searchParams;
  const paidParam = params.paid === "1";
  const cancelParam = params.cancel === "1";
  const confirmedBookingId = params.bookingId ?? null;

  const admin = createAdminClient();

  const { data: bookings } = await admin
    .from("gs_bookings")
    .select(
      "id, listing_id, start_date, end_date, total_price, deposit_amount, status, payout_status, stripe_payment_intent_id, deposit_hold_status, check_in_status, check_in_at, check_out_status, check_out_at, incident_status, incident_deadline_at, created_at"
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = (bookings ?? []) as BookingRow[];

  const unreadByBooking =
    rows.length > 0
      ? await getGsMaterialUnreadByBookingIds(
          user.id,
          rows.map((b) => b.id)
        )
      : {};

  const listingIds = [...new Set(rows.map((b) => b.listing_id))];
  let listingsMap: Record<string, ListingRow> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await admin
      .from("gs_listings")
      .select("id, title, category")
      .in("id", listingIds);
    for (const l of (listings ?? []) as ListingRow[]) listingsMap[l.id] = l;
  }

  const confirmedBooking = confirmedBookingId
    ? rows.find((b) => b.id === confirmedBookingId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Bannière de confirmation */}
      {paidParam && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Paiement réussi !</p>
            {confirmedBooking ? (
              <p className="mt-0.5 text-sm text-emerald-700">
                Ta réservation pour{" "}
                <span className="font-medium">
                  {listingsMap[confirmedBooking.listing_id]?.title ?? "cet équipement"}
                </span>{" "}
                du{" "}
                <span className="font-medium">{formatDate(confirmedBooking.start_date)}</span>
                {" "}au{" "}
                <span className="font-medium">{formatDate(confirmedBooking.end_date)}</span>
                {" "}est confirmée.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-emerald-700">Ta réservation a bien été enregistrée.</p>
            )}
          </div>
        </div>
      )}

      {/* Bannière d'annulation */}
      {cancelParam && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <p className="font-semibold text-slate-700">Paiement annulé</p>
            <p className="mt-0.5 text-sm text-slate-600">
              Tu peux retourner sur l&apos;annonce pour relancer la réservation.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes locations matériel</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length === 0
              ? "Aucune réservation pour le moment."
              : `${rows.length} réservation${rows.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/catalogue"
          className="rounded-lg bg-gs-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Trouver du matériel
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <Package className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Aucune réservation de matériel</p>
          <p className="text-sm text-slate-400">
            Explore le catalogue et réserve ton équipement pour ton prochain événement.
          </p>
          <Link
            href="/catalogue"
            className="mt-2 rounded-lg border border-gs-orange px-5 py-2 text-sm font-semibold text-gs-orange transition hover:bg-gs-orange/5"
          >
            Voir le catalogue
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((booking) => {
            const listing = listingsMap[booking.listing_id];
            const derived = deriveStatus(booking);
            const totalEur = Number(booking.total_price);
            const depositEur = Number(booking.deposit_amount ?? 0);
            const hasIncident = booking.incident_status === "open";
            const unreadChat = unreadByBooking[booking.id] ?? 0;

            return (
              <li
                key={booking.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  {/* En-tête : catégorie + badge statut */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {CATEGORY_LABEL[listing?.category ?? ""] ?? "Matériel"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[derived]}`}>
                      {STATUS_LABEL[derived]}
                    </span>
                    {unreadChat > 0 && (
                      <span
                        className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white"
                        title={`${unreadChat} message${unreadChat > 1 ? "s" : ""} matériel non lu${unreadChat > 1 ? "s" : ""}`}
                      >
                        {unreadChat > 99 ? "99+" : unreadChat} msg
                      </span>
                    )}
                  </div>

                  {/* Titre listing */}
                  <p className="mt-1 truncate font-semibold text-slate-900">
                    {listing?.title ?? `Réservation ${booking.id.slice(0, 8)}`}
                  </p>

                  {/* Dates */}
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                  </p>

                  {/* Messages contextuels */}
                  {derived === "pending" && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      En attente de confirmation du prestataire
                    </p>
                  )}
                  {derived === "refused" && (
                    <p className="mt-1 text-[11px] text-red-500">
                      Le prestataire n&apos;est pas disponible pour cette période
                    </p>
                  )}

                  {/* Indicateurs opérationnels (check-in / check-out / incident) */}
                  {(derived === "paid" || derived === "completed") && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {booking.check_in_status === "opened" && (
                        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] text-blue-700">
                          <PackageOpen className="h-3 w-3" />
                          Remise en cours
                        </span>
                      )}
                      {booking.check_in_status === "confirmed" && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700">
                          <PackageCheck className="h-3 w-3" />
                          Matériel remis
                        </span>
                      )}
                      {booking.check_out_status === "confirmed" && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">
                          <PackageCheck className="h-3 w-3" />
                          Retour confirmé
                        </span>
                      )}
                      {hasIncident && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          Incident signalé
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Zone droite : prix + CTA */}
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {Number.isFinite(totalEur) ? `${totalEur} €` : "—"}
                  </p>
                  {depositEur > 0 && (
                    <p className="text-[11px] text-slate-400">
                      Caution {depositEur} € (non débitée)
                    </p>
                  )}

                  {/* CTA selon statut */}
                  {derived === "pending" && (
                    <span className="mt-1 flex items-center gap-1 text-[12px] text-amber-600">
                      <Clock className="h-3.5 w-3.5" />
                      En attente
                    </span>
                  )}

                  {derived === "accepted_unpaid" && (
                    <PayNowButton bookingId={booking.id} />
                  )}

                  {derived === "paid" && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Payée
                      </span>
                      <Link
                        href={`/dashboard/materiel/${booking.id}`}
                        className="text-[11px] text-slate-400 underline-offset-2 hover:underline"
                      >
                        Voir le détail →
                      </Link>
                    </div>
                  )}

                  {derived === "completed" && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terminée
                      </span>
                      {hasIncident && (
                        <span className="text-[11px] text-amber-600">
                          Incident en cours d&apos;examen
                        </span>
                      )}
                    </div>
                  )}

                  {derived === "refused" && (
                    <Link
                      href="/catalogue"
                      className="mt-1 text-[12px] font-medium text-gs-orange hover:underline"
                    >
                      Voir le catalogue
                    </Link>
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
