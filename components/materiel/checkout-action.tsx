"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, PackageCheck } from "lucide-react";

import { confirmCheckOutAction } from "@/app/actions/gs-bookings";

type Props = {
  bookingId: string;
  initialCheckOutStatus: string | null;
};

export function CheckOutAction({ bookingId, initialCheckOutStatus }: Props) {
  const [done, setDone] = useState(!!initialCheckOutStatus);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600">
        <PackageCheck className="h-3.5 w-3.5" />
        Retour clôturé
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showForm ? (
        <>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
            placeholder="État du matériel au retour (optionnel)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await confirmCheckOutAction(bookingId, comment);
                if (res.success) setDone(true);
                else setError(res.error ?? "Erreur.");
              })
            }
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Clôturer le retour
          </button>
        </>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <PackageCheck className="h-3.5 w-3.5" />
          Clôturer le retour
        </button>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
