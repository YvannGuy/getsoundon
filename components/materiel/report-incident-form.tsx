"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { reportIncidentAction } from "@/app/actions/gs-bookings";

type Props = {
  bookingId: string;
  incidentDeadlineAt: string | null;
  endDate: string;
  /** Si true, l'incident a déjà été signalé */
  incidentStatus: string | null;
};

export function ReportIncidentForm({
  bookingId,
  incidentDeadlineAt,
  endDate,
  incidentStatus,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(!!incidentStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Calcul de la deadline côté client pour l'affichage
  const deadline = incidentDeadlineAt
    ? new Date(incidentDeadlineAt)
    : new Date(new Date(`${endDate}T23:59:59.000Z`).getTime() + 48 * 60 * 60 * 1000);
  const windowOpen = new Date() < deadline;

  if (done || incidentStatus) {
    const isOpen = incidentStatus === "open" || done;
    return (
      <span
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
          isOpen ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {isOpen ? "Incident signalé" : "Incident clôturé"}
      </span>
    );
  }

  if (!windowOpen) {
    return (
      <span className="text-[11px] text-slate-400">
        Fenêtre de signalement expirée
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showForm ? (
        <div className="w-full space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] font-semibold text-amber-800">Signaler un incident</p>
          <textarea
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            placeholder="Décrivez le problème constaté…"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-500">Montant demandé (€) :</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="w-28 rounded-lg border border-amber-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              disabled={pending || !comment.trim()}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const parsedAmount = parseFloat(amount);
                  const res = await reportIncidentAction(
                    bookingId,
                    comment,
                    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined
                  );
                  if (res.success) setDone(true);
                  else setError(res.error ?? "Erreur.");
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              Confirmer le signalement
            </button>
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-50"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Signaler un problème
        </button>
      )}
    </div>
  );
}
