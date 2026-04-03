"use client";

import { useActionState, useEffect, useState } from "react";

import {
  requestGsBookingCancellation,
  type GsCancellationActionState,
} from "@/app/actions/gs-booking-cancellation";
import {
  CANCELLATION_STATUS_LABELS,
  evaluateCancellationRequestEligibility,
  POLICY_LABELS,
  type GsBookingForCancellationEligibility,
  type GsCancellationRequestRow,
  type GsListingCancellationPolicy,
} from "@/lib/gs-booking-cancellation";

const initial: GsCancellationActionState = {};

const TERMINAL_APPROVED = new Set([
  "approved_no_refund",
  "approved_partial_refund",
  "approved_full_refund",
]);

type Props = {
  bookingId: string;
  booking: GsBookingForCancellationEligibility;
  existingRequests: GsCancellationRequestRow[];
  listingPolicy: GsListingCancellationPolicy;
};

export function CancellationRequestPanel({ bookingId, booking, existingRequests, listingPolicy }: Props) {
  const [state, formAction, isPending] = useActionState(requestGsBookingCancellation, initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state?.ok]);

  const pending = existingRequests.find((r) => r.status === "pending");
  const approved = existingRequests.filter((r) => TERMINAL_APPROVED.has(r.status));
  const lastApproved = approved.sort(
    (a, b) => (b.decided_at ?? b.requested_at).localeCompare(a.decided_at ?? a.requested_at),
  )[0];

  if (pending) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
        <p className="text-sm font-semibold text-amber-900">Demande d&apos;annulation</p>
        <p className="mt-1 text-sm text-amber-800">{CANCELLATION_STATUS_LABELS.pending}</p>
        <p className="mt-2 text-xs text-amber-800/90">
          Raison indiquée : « {pending.reason.slice(0, 200)}
          {pending.reason.length > 200 ? "…" : ""} »
        </p>
      </section>
    );
  }

  if (lastApproved) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Demande d&apos;annulation</p>
        <p className="mt-1 text-sm text-slate-700">
          {CANCELLATION_STATUS_LABELS[lastApproved.status]}
        </p>
        {lastApproved.admin_note ? (
          <p className="mt-2 text-xs text-slate-500">Réponse : {lastApproved.admin_note}</p>
        ) : null}
        {lastApproved.refund_amount_eur != null && Number(lastApproved.refund_amount_eur) > 0 ? (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            Remboursement : {Number(lastApproved.refund_amount_eur).toFixed(2)} €
          </p>
        ) : null}
      </section>
    );
  }

  const elig = evaluateCancellationRequestEligibility(booking, existingRequests);
  const lastRejected = existingRequests
    .filter((r) => r.status === "rejected")
    .sort((a, b) => (b.decided_at ?? b.requested_at).localeCompare(a.decided_at ?? a.requested_at))[0];

  if (!elig.ok) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Demande d&apos;annulation</p>
        <p className="mt-1">{elig.message}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-semibold text-slate-900">Demande d&apos;annulation</p>
      <p className="mt-1 text-sm text-slate-600">
        Vous ne pouvez pas annuler seul : envoyez une demande. L&apos;équipe GetSoundOn la traitera selon la
        politique du prestataire et votre situation.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Politique indiquée sur l&apos;annonce :{" "}
        <span className="font-medium text-slate-700">{POLICY_LABELS[listingPolicy]}</span>
      </p>

      {lastRejected ? (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-800">Demande précédente refusée.</span>
          {lastRejected.admin_note ? ` ${lastRejected.admin_note}` : " Vous pouvez soumettre une nouvelle demande."}
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          Demander une annulation
        </button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="bookingId" value={bookingId} />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Motif (obligatoire)
            </span>
            <textarea
              name="reason"
              required
              minLength={10}
              rows={4}
              placeholder="Expliquez pourquoi vous souhaitez annuler…"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gs-orange/50 focus:outline-none focus:ring-2 focus:ring-gs-orange/20"
            />
          </label>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-gs-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {isPending ? "Envoi…" : "Envoyer la demande"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Fermer
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
