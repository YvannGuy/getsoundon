"use client";

import { useTransition, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";

import { acceptGsBookingAction, refuseGsBookingAction } from "@/app/actions/gs-bookings";

type Props = {
  bookingId: string;
};

export function AcceptRefuseButtons({ bookingId }: Props) {
  const [acceptPending, startAccept] = useTransition();
  const [refusePending, startRefuse] = useTransition();
  const [done, setDone] = useState<"accepted" | "refused" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (done === "accepted") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        Acceptée
      </span>
    );
  }
  if (done === "refused") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-[12px] font-semibold text-red-600">
        <X className="h-3.5 w-3.5" />
        Refusée
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          disabled={acceptPending || refusePending}
          onClick={() =>
            startAccept(async () => {
              setError(null);
              const result = await acceptGsBookingAction(bookingId);
              if (result.success) setDone("accepted");
              else setError(result.error ?? "Erreur.");
            })
          }
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {acceptPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Accepter
        </button>
        <button
          disabled={acceptPending || refusePending}
          onClick={() =>
            startRefuse(async () => {
              setError(null);
              const result = await refuseGsBookingAction(bookingId);
              if (result.success) setDone("refused");
              else setError(result.error ?? "Erreur.");
            })
          }
          className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {refusePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Refuser
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
