"use client";

import { useTransition, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { resolveIncidentAdminAction } from "@/app/actions/gs-bookings";

type Props = {
  bookingId: string;
};

export function IncidentDecisionButtons({ bookingId }: Props) {
  const [resolvePending, startResolve] = useTransition();
  const [dismissPending, startDismiss] = useTransition();
  const [done, setDone] = useState<"resolved" | "dismissed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (done === "resolved") {
    return (
      <span className="flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 font-semibold text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        Incident validé — Versement débloqué
      </span>
    );
  }
  if (done === "dismissed") {
    return (
      <span className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-600">
        <XCircle className="h-4 w-4" />
        Incident rejeté — Cycle normal repris
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <button
          disabled={resolvePending || dismissPending}
          onClick={() =>
            startResolve(async () => {
              setError(null);
              const res = await resolveIncidentAdminAction(bookingId, "resolved");
              if (res.success) setDone("resolved");
              else setError(res.error ?? "Erreur.");
            })
          }
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {resolvePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Valider l'incident
        </button>
        <button
          disabled={resolvePending || dismissPending}
          onClick={() =>
            startDismiss(async () => {
              setError(null);
              const res = await resolveIncidentAdminAction(bookingId, "dismissed");
              if (res.success) setDone("dismissed");
              else setError(res.error ?? "Erreur.");
            })
          }
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {dismissPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Rejeter l'incident
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        Valider : payout prestataire débloqué, caution suit le cycle J+7. Rejeter : même effet.
      </p>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
