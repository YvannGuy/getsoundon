"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Shield, Zap } from "lucide-react";

import { createInstantBookingOfferAction } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TarifPart = { label: string; value: number };

interface Props {
  salleId: string;
  salleName: string;
  salleSlug: string;
  tarifParts: TarifPart[];
  cautionRequise: boolean;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

export function InstantBookingForm({
  salleId,
  salleName,
  salleSlug,
  tarifParts,
  cautionRequise,
}: Props) {
  const router = useRouter();
  const pricePerDay = tarifParts.find((t) => t.label === "/ jour")?.value ?? 0;

  const today = new Date().toISOString().slice(0, 10);

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = dateDebut && dateFin && dateFin >= dateDebut;
  const days = isValid ? daysBetween(dateDebut, dateFin) : 0;
  const totalEur = pricePerDay > 0 && days > 0 ? pricePerDay * days : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);

    const result = await createInstantBookingOfferAction({
      salleId,
      dateDebut,
      dateFin,
    });

    if (!result.success || !result.offerId) {
      setError(result.error ?? "Erreur lors de la réservation.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/stripe/checkout-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId: result.offerId }),
    });

    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) {
      setError(json.error ?? "Erreur lors de la création du paiement.");
      setLoading(false);
      return;
    }

    router.push(json.url);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex items-center gap-2">
        <Zap className="h-5 w-5 text-gs-orange" />
        <p className="font-semibold text-black">Réservation instantanée</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date-debut" className="text-sm font-medium text-slate-700">
            Date de début
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="date-debut"
              type="date"
              required
              min={today}
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                if (dateFin && e.target.value > dateFin) setDateFin(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-black focus:border-gs-orange focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="date-fin" className="text-sm font-medium text-slate-700">
            Date de fin
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="date-fin"
              type="date"
              required
              min={dateDebut || today}
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-black focus:border-gs-orange focus:outline-none"
            />
          </div>
        </div>
      </div>

      {isValid && totalEur !== null && (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>
              {pricePerDay} € / jour × {days} jour{days > 1 ? "s" : ""}
            </span>
            <span>{totalEur} €</span>
          </div>
          {cautionRequise && (
            <div className="mt-2 flex items-center gap-2 text-slate-500">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Caution requise par le prestataire (montant précisé à l'étape suivante)</span>
            </div>
          )}
          <div className="mt-3 border-t border-slate-200 pt-3 font-semibold text-black">
            <div className="flex justify-between">
              <span>Total estimé</span>
              <span>{totalEur} €</span>
            </div>
            <p className="mt-1 text-[11px] font-normal text-slate-400">
              Hors frais de service. Montant définitif affiché à l'étape Stripe.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!isValid || loading}
        className={cn(
          "mt-5 h-12 w-full rounded-lg bg-gs-orange font-semibold text-white hover:brightness-95",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {loading ? "Préparation du paiement…" : "Réserver maintenant"}
      </Button>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        Aucun débit avant confirmation. Vous pouvez annuler avant le paiement.
      </p>
    </form>
  );
}
