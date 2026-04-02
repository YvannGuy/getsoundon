"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

type Props = {
  bookingId: string;
  className?: string;
};

export function PayNowButton({ bookingId, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Erreur lors du paiement.");
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handlePay}
        disabled={loading}
        className={
          className ??
          "flex items-center gap-1.5 rounded-lg bg-gs-orange px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        }
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CreditCard className="h-3.5 w-3.5" />
        )}
        {loading ? "Redirection…" : "Payer maintenant"}
      </button>
      {error && (
        <p className="max-w-[200px] text-right text-[11px] text-red-500">{error}</p>
      )}
    </div>
  );
}
