"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  releaseOfferDepositAction,
  requestOfferDepositClaimAction,
} from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DepositHoldActions({
  offerId,
  holdStatus,
  depositAmountCents,
}: {
  offerId: string;
  holdStatus: string;
  depositAmountCents: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState((depositAmountCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);

  if (holdStatus === "released") {
    return <span className="text-xs text-emerald-600">Empreinte libérée</span>;
  }
  if (holdStatus === "claim_requested") {
    return <span className="text-xs text-amber-700">Demande de retenue en revue</span>;
  }
  if (holdStatus !== "authorized") {
    return <span className="text-xs text-slate-500">Aucune action disponible</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-28 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={loadingClaim}
          onClick={async () => {
            const parsed = Number(amount.replace(",", "."));
            if (!Number.isFinite(parsed) || parsed <= 0) {
              alert("Montant invalide");
              return;
            }
            if (!reason.trim()) {
              alert("Ajoutez un motif de retenue");
              return;
            }
            setLoadingClaim(true);
            const res = await requestOfferDepositClaimAction(offerId, parsed, reason);
            setLoadingClaim(false);
            if (!res.success) {
              alert(res.error ?? "Erreur demande de retenue");
              return;
            }
            router.refresh();
          }}
        >
          {loadingClaim ? "..." : "Demander retenue"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loadingRelease}
          onClick={async () => {
            setLoadingRelease(true);
            const res = await releaseOfferDepositAction(offerId);
            setLoadingRelease(false);
            if (!res.success) {
              alert(res.error ?? "Erreur libération caution");
              return;
            }
            router.refresh();
          }}
        >
          {loadingRelease ? "..." : "Libérer caution"}
        </Button>
      </div>
      <Input
        type="text"
        placeholder="Motif (obligatoire pour retenue)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}
