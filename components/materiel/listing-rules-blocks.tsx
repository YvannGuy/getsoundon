"use client";

import Link from "next/link";

import type { GsListingCancellationPolicy } from "@/lib/gs-booking-cancellation";
import {
  cancellationPolicyLegalNoteShort,
  getCancellationPolicyLabel,
  getCancellationPolicyOptionDescription,
  getCancellationPolicySummaryLines,
} from "@/lib/gs-cancellation-policy-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const PAYMENTS_HREF = "/proprietaire/paiement";

function chipClass(on: boolean) {
  return cn(
    "rounded-full border px-4 py-2 text-sm font-medium transition",
    on ? "border-gs-orange bg-gs-orange/10 text-gs-dark" : "border-gs-line bg-white text-slate-600 hover:border-gs-orange/40"
  );
}

function BlockShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-gs-line bg-white p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-gs-dark">{title}</h3>
      <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export function ListingRulesDepositBlock({
  depositAmountEur,
  onDepositChange,
}: {
  depositAmountEur: string;
  onDepositChange: (v: string) => void;
}) {
  return (
    <BlockShell
      title="Caution"
      subtitle="Définissez le montant de caution demandé pour cette annonce."
    >
      <p className="text-xs leading-relaxed text-slate-600">
        La caution protège en cas de dommage, de perte ou de non-restitution. Elle fonctionne sous forme
        d’empreinte bancaire, et n’est pas débitée immédiatement.
      </p>
      <div>
        <label htmlFor="gs-deposit-amount" className="text-sm font-medium text-gs-dark">
          Montant de la caution
        </label>
        <div className="relative mt-1.5">
          <Input
            id="gs-deposit-amount"
            inputMode="decimal"
            min={0}
            placeholder="Ex. 300"
            value={depositAmountEur}
            onChange={(e) => onDepositChange(e.target.value)}
            className="border-gs-line pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">€</span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Laissez 0 € si vous ne souhaitez pas demander de caution.</p>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        La caution est autorisée après validation du paiement de la réservation. Elle est libérée automatiquement
        s’il n’y a aucun incident déclaré.
      </p>
    </BlockShell>
  );
}

export function ListingRulesPaymentBlock({ stripeConnectReady }: { stripeConnectReady: boolean }) {
  return (
    <BlockShell
      title="Paiement"
      subtitle="Configurez comment les réservations payées seront traitées sur la plateforme."
    >
      <p className="text-xs leading-relaxed text-slate-600">
        Les paiements passent par Stripe. Vous devez activer vos paiements pour recevoir des réservations
        instantanées.
      </p>
      {stripeConnectReady ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900">
          <p className="font-semibold">Paiements activés</p>
          <p className="mt-1 text-xs text-emerald-800/90">
            Votre compte est prêt à recevoir des réservations payées.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
          <p className="font-medium">Vos paiements ne sont pas encore activés.</p>
          <p className="mt-1 text-xs text-amber-900/95">
            Activez votre compte Stripe pour recevoir des paiements sur GetSoundOn.
          </p>
          <Link
            href={PAYMENTS_HREF}
            className="mt-2 inline-flex rounded-lg bg-gs-orange px-3 py-2 text-xs font-semibold text-white transition hover:brightness-105"
          >
            Activer mes paiements
          </Link>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Le versement est initié 2 jours après la fin de la réservation, sauf en cas de litige ou de blocage
        particulier.
      </p>
    </BlockShell>
  );
}

export function ListingRulesReservationBlock({
  bookingMode,
  onBookingMode,
  stripeConnectReady,
}: {
  bookingMode: "manual" | "instant";
  onBookingMode: (m: "manual" | "instant") => void;
  stripeConnectReady: boolean;
}) {
  return (
    <BlockShell
      title="Réservation instantanée"
      subtitle="Choisissez si ce matériel peut être réservé immédiatement ou uniquement sur demande."
    >
      <p className="text-xs leading-relaxed text-slate-600">
        La réservation instantanée convient aux annonces simples, bien tarifées et facilement réservables sans
        validation manuelle.
      </p>
      <div>
        <p className="text-sm font-medium text-gs-dark">Mode de réservation</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className={cn(chipClass(bookingMode === "instant"), "text-left sm:min-w-[200px]")}
            onClick={() => onBookingMode("instant")}
          >
            <span className="block font-medium">Réservation instantanée</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-600">
              Le locataire peut réserver et payer immédiatement en ligne.
            </span>
          </button>
          <button
            type="button"
            className={cn(chipClass(bookingMode === "manual"), "text-left sm:min-w-[200px]")}
            onClick={() => onBookingMode("manual")}
          >
            <span className="block font-medium">Sur demande</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-600">
              Vous examinez d’abord la demande, puis le locataire paie si vous l’acceptez.
            </span>
          </button>
        </div>
      </div>
      {bookingMode === "instant" && !stripeConnectReady && (
        <p className="rounded-md border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-xs text-amber-950">
          Pour activer la réservation instantanée, vos paiements Stripe doivent être finalisés.
        </p>
      )}
    </BlockShell>
  );
}

const POLICY_IDS: GsListingCancellationPolicy[] = ["flexible", "moderate", "strict"];

export function ListingRulesCancellationBlock({
  cancellationPolicy,
  onPolicy,
}: {
  cancellationPolicy: GsListingCancellationPolicy;
  onPolicy: (p: GsListingCancellationPolicy) => void;
}) {
  const lines = getCancellationPolicySummaryLines(cancellationPolicy);
  return (
    <BlockShell
      title="Politique d’annulation"
      subtitle="Choisissez la politique appliquée à cette annonce en cas de demande d’annulation d’un locataire."
    >
      <p className="text-xs leading-relaxed text-slate-600">
        Cette politique sert de base de décision à la plateforme. Le locataire ne peut pas annuler directement : il
        soumet une demande, puis la plateforme tranche selon votre politique et le contexte réel de la réservation.
      </p>
      <div>
        <p className="text-sm font-medium text-gs-dark">Politique d’annulation</p>
        <div className="mt-2 flex flex-col gap-2">
          {POLICY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onPolicy(id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-sm transition",
                cancellationPolicy === id
                  ? "border-gs-orange bg-gs-orange/10 text-gs-dark"
                  : "border-gs-line bg-white text-slate-700 hover:border-gs-orange/35"
              )}
            >
              <span className="font-semibold">{getCancellationPolicyLabel(id)}</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-600">
                {getCancellationPolicyOptionDescription(id)}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Nous recommandons Standard pour commencer.</p>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <p className="text-xs font-medium text-slate-700">Remboursement du montant de location :</p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-slate-600">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-500">{cancellationPolicyLegalNoteShort()}</p>
    </BlockShell>
  );
}

export function GsListingRulesRecap({
  bookingMode,
  depositAmountEur,
  cancellationPolicy,
  stripeConnectReady,
}: {
  bookingMode: "manual" | "instant";
  depositAmountEur: string;
  cancellationPolicy: GsListingCancellationPolicy;
  stripeConnectReady: boolean;
}) {
  const dep = Math.max(0, Number.parseFloat(String(depositAmountEur).replace(",", ".").trim()) || 0);
  return (
    <div className="rounded-xl border border-gs-line bg-slate-50/60 p-4 text-sm text-slate-700">
      <p className="font-semibold text-gs-dark">Votre annonce sera publiée avec les règles suivantes :</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-xs sm:text-sm">
        <li>
          Mode de réservation :{" "}
          <span className="font-medium text-gs-dark">
            {bookingMode === "instant" ? "Instantanée" : "Sur demande"}
          </span>
        </li>
        <li>
          Caution :{" "}
          <span className="font-medium text-gs-dark">{dep <= 0 ? "Aucune" : `${dep} €`}</span>
        </li>
        <li>
          Politique d’annulation :{" "}
          <span className="font-medium text-gs-dark">{getCancellationPolicyLabel(cancellationPolicy)}</span>
        </li>
        <li>
          Paiements :{" "}
          <span className="font-medium text-gs-dark">{stripeConnectReady ? "Activés" : "À finaliser"}</span>
        </li>
      </ul>
    </div>
  );
}

export { PAYMENTS_HREF, chipClass as listingRulesChipClass };
