"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  GsListingRulesRecap,
  ListingRulesCancellationBlock,
  ListingRulesDepositBlock,
  ListingRulesPaymentBlock,
  ListingRulesReservationBlock,
} from "@/components/materiel/listing-rules-blocks";
import type { GsListingCancellationPolicy } from "@/lib/gs-booking-cancellation";
import { normalizeCancellationPolicy } from "@/lib/gs-booking-cancellation";

type Props = {
  listingId: string;
  listingTitle: string;
  initialDeposit: number;
  initialImmediate: boolean;
  initialCancellationPolicy: string | null;
  stripeConnectReady: boolean;
};

export function GsListingReglagesEditor({
  listingId,
  listingTitle,
  initialDeposit,
  initialImmediate,
  initialCancellationPolicy,
  stripeConnectReady,
}: Props) {
  const router = useRouter();
  const [depositAmountEur, setDepositAmountEur] = useState(
    initialDeposit > 0 ? String(initialDeposit) : "0"
  );
  const [bookingMode, setBookingMode] = useState<"manual" | "instant">(
    initialImmediate ? "instant" : "manual"
  );
  const [cancellationPolicy, setCancellationPolicy] = useState<GsListingCancellationPolicy>(
    normalizeCancellationPolicy(initialCancellationPolicy)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const save = async () => {
    setError(null);
    setOk(false);
    const dep = Math.max(0, Number.parseFloat(String(depositAmountEur).replace(",", ".").trim()) || 0);
    if (!Number.isFinite(dep) || dep < 0) {
      setError("Montant de caution invalide.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositAmount: dep,
          immediateConfirmation: bookingMode === "instant",
          cancellationPolicy,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Enregistrement impossible.");
        return;
      }
      setOk(true);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Règles de l’annonce</h1>
        <p className="mt-1 text-sm text-slate-600">{listingTitle}</p>
      </div>

      <div className="space-y-4">
        <ListingRulesDepositBlock depositAmountEur={depositAmountEur} onDepositChange={setDepositAmountEur} />
        <ListingRulesPaymentBlock stripeConnectReady={stripeConnectReady} />
        <ListingRulesReservationBlock
          bookingMode={bookingMode}
          onBookingMode={setBookingMode}
          stripeConnectReady={stripeConnectReady}
        />
        <ListingRulesCancellationBlock cancellationPolicy={cancellationPolicy} onPolicy={setCancellationPolicy} />
      </div>

      <GsListingRulesRecap
        bookingMode={bookingMode}
        depositAmountEur={depositAmountEur}
        cancellationPolicy={cancellationPolicy}
        stripeConnectReady={stripeConnectReady}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">Modifications enregistrées.</p>}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          className="bg-gs-orange font-medium text-white hover:brightness-105"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" className="border-gs-line" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
    </div>
  );
}
