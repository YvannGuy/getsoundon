"use client";

import { useActionState, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import {
  decideGsBookingCancellationRequest,
  type AdminCancellationRow,
  type GsCancellationActionState,
} from "@/app/actions/gs-booking-cancellation";
import {
  CANCELLATION_STATUS_LABELS,
  POLICY_LABELS,
} from "@/lib/gs-booking-cancellation";
import { getCheckoutTotalPaidCents } from "@/lib/gs-booking-platform-fee";

const decideInitial: GsCancellationActionState = {};

function fmtDate(iso: string) {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

function DecisionForm({ row }: { row: AdminCancellationRow }) {
  const [state, formAction, pending] = useActionState(decideGsBookingCancellationRequest, decideInitial);
  const [decision, setDecision] = useState<string>("reject");
  const b = row.booking;

  const maxRefundableCents = getCheckoutTotalPaidCents({
    total_price: b.total_price,
    checkout_total_eur: b.checkout_total_eur,
  });
  const maxRefundableEur = maxRefundableCents != null ? maxRefundableCents / 100 : 0;
  const paid = !!b.stripe_payment_intent_id;

  return (
    <form action={formAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="requestId" value={row.id} />
      <input type="hidden" name="decision" value={decision} />

      <div className="flex flex-wrap gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="decisionRadio"
            checked={decision === "reject"}
            onChange={() => setDecision("reject")}
          />
          Refuser
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="decisionRadio"
            checked={decision === "approve_no_refund"}
            onChange={() => setDecision("approve_no_refund")}
          />
          Accepter sans remboursement
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="decisionRadio"
            checked={decision === "approve_partial"}
            onChange={() => setDecision("approve_partial")}
            disabled={!paid}
          />
          Remboursement partiel
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="decisionRadio"
            checked={decision === "approve_full"}
            onChange={() => setDecision("approve_full")}
            disabled={!paid}
          />
          Remboursement total
        </label>
      </div>

      {decision === "approve_partial" ? (
        <div>
          <label className="text-xs font-medium text-slate-500">Montant à rembourser (€)</label>
          <input
            type="number"
            name="partialRefundEur"
            step="0.01"
            min="0.01"
            max={maxRefundableEur}
            className="mt-1 block w-40 rounded border border-slate-200 px-2 py-1 text-sm"
            placeholder={`max ${maxRefundableEur.toFixed(2)}`}
          />
        </div>
      ) : null}

      <div>
        <label className="text-xs font-medium text-slate-500">Note interne / message locataire (optionnel)</label>
        <textarea
          name="adminNote"
          rows={2}
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </div>

      {!paid && (decision === "approve_partial" || decision === "approve_full") ? (
        <p className="text-xs text-amber-700">Pas de paiement Stripe : choisissez refus ou acceptation sans remboursement.</p>
      ) : null}

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-600">Décision enregistrée.</p> : null}

      <button
        type="submit"
        disabled={pending || (!paid && (decision === "approve_partial" || decision === "approve_full"))}
        className="rounded-lg bg-gs-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Valider la décision"}
      </button>
    </form>
  );
}

export function AdminMaterielCancellationsClient({ rows }: { rows: AdminCancellationRow[] }) {
  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const done = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">En attente de décision ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucune demande en cours.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {pending.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{row.listingTitle}</p>
                    <p className="text-sm text-slate-500">
                      Réservation {row.booking_id.slice(0, 8)}… · {fmtDate(row.booking.start_date)} →{" "}
                      {fmtDate(row.booking.end_date)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Location : {Number(row.booking.total_price).toFixed(2)} €
                      {row.booking.checkout_total_eur != null &&
                      row.booking.checkout_total_eur !== "" &&
                      Number(row.booking.checkout_total_eur) !== Number(row.booking.total_price) ? (
                        <>
                          {" "}
                          · Total payé (hors caution) : {Number(row.booking.checkout_total_eur).toFixed(2)} €
                        </>
                      ) : null}{" "}
                      · {row.booking.stripe_payment_intent_id ? "Payé (Stripe)" : "Non payé"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Check-in : {row.booking.check_in_status ?? "—"} · Check-out :{" "}
                      {row.booking.check_out_status ?? "—"} · Payout : {row.booking.payout_status ?? "—"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      Politique annonce : {POLICY_LABELS[row.cancellationPolicy]}
                    </p>
                    <p className="mt-1 text-xs italic text-slate-500">{row.policyGuidance}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase text-slate-500">Motif locataire</p>
                  <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{row.reason}</p>
                </div>
                <DecisionForm row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Historique ({done.length})</h2>
        {done.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun historique.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {done.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-slate-800">{row.listingTitle}</span>
                  <span className="text-slate-500">{fmtDate(row.requested_at)}</span>
                </div>
                <p className="text-slate-600">{CANCELLATION_STATUS_LABELS[row.status as keyof typeof CANCELLATION_STATUS_LABELS]}</p>
                {row.refund_amount_eur != null && Number(row.refund_amount_eur) > 0 ? (
                  <p className="text-xs text-emerald-700">Remboursement : {Number(row.refund_amount_eur).toFixed(2)} €</p>
                ) : null}
                {row.admin_note ? <p className="text-xs text-slate-500">Note : {row.admin_note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
