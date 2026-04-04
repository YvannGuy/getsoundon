"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  removeGsCartLineAction,
  updateGsCartDatesAction,
  updateGsCartLineQuantityAction,
} from "@/app/actions/gs-orders";

export type PanierLine = {
  id: string;
  listing_id: string;
  title_snapshot: string;
  price_per_day_snapshot: number;
  quantity: number;
  days_count: number;
  line_total_eur: number;
  cover_url?: string | null;
};

export type PanierOrderPayload = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  location_total_eur: number;
  service_fee_eur: number;
  checkout_total_eur: number;
  deposit_amount_eur: number;
  provider_id: string | null;
  provider_label: string | null;
  stripe_checkout_resume_url: string | null;
  items: PanierLine[];
};

type Props = {
  loggedIn?: boolean;
  initial: PanierOrderPayload | null;
  /** Retour annulation Stripe depuis `cancel_url`. */
  stripeCheckoutCancelled?: boolean;
};

export function PanierView({ loggedIn = false, initial, stripeCheckoutCancelled = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");

  const hasLines = (initial?.items.length ?? 0) > 0;
  const isDraft = initial?.status === "draft";
  const isPendingPay = initial?.status === "pending_payment";

  const subtotalLabel = useMemo(() => {
    if (!initial) return "—";
    return `${Number(initial.location_total_eur).toFixed(2)} €`;
  }, [initial]);

  const applyDates = () => {
    if (!startDate || !endDate) {
      setError("Choisis une date de début et de fin.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await updateGsCartDatesAction(startDate, endDate);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  const setQty = (itemId: string, quantity: number) => {
    startTransition(async () => {
      setError(null);
      const res = await updateGsCartLineQuantityAction(itemId, quantity);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  const removeLine = (itemId: string) => {
    startTransition(async () => {
      setError(null);
      const res = await removeGsCartLineAction(itemId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  const checkout = async () => {
    if (!initial?.id) return;
    setPayLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: initial.id }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Paiement indisponible.");
      window.location.href = json.url;
    } catch (e) {
      setPayLoading(false);
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  };

  if (!initial) {
    if (!loggedIn) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Panier</h1>
          <p className="mt-4 text-slate-600">Connecte-toi pour voir ton panier.</p>
          <Link
            href="/auth?tab=login"
            className="mt-6 inline-flex rounded-lg bg-gs-orange px-5 py-2.5 text-sm font-semibold text-white"
          >
            Se connecter
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Panier</h1>
        <p className="mt-4 text-slate-600">Ton panier est vide pour l’instant.</p>
        <Link
          href="/items"
          className="mt-6 inline-flex rounded-lg bg-gs-orange px-5 py-2.5 text-sm font-semibold text-white"
        >
          Parcourir le matériel
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Panier</h1>
      <p className="mt-1 text-sm text-slate-500">Un seul prestataire et une seule période par commande.</p>

      {stripeCheckoutCancelled ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Paiement interrompu. Tu peux relancer le règlement quand tu veux.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Prestataire</h2>
        <p className="mt-1 text-base font-medium text-slate-900">
          {initial.provider_label ?? (hasLines ? "—" : "Ajoute un article pour afficher le prestataire")}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Début</span>
            <input
              type="date"
              value={startDate}
              disabled={!isDraft}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Fin</span>
            <input
              type="date"
              value={endDate}
              disabled={!isDraft}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>
        </div>
        {isDraft && hasLines ? (
          <button
            type="button"
            disabled={pending}
            onClick={applyDates}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour les dates"}
          </button>
        ) : null}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Articles</h2>
        {!hasLines ? (
          <p className="text-slate-600">Ton panier est vide.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {initial.items.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {line.cover_url ? (
                      <Image
                        src={line.cover_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">—</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/items/${line.listing_id}`}
                      className="font-medium text-slate-900 hover:text-gs-orange hover:underline"
                    >
                      {line.title_snapshot}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {Number(line.price_per_day_snapshot).toFixed(2)} € / jour × {line.days_count} j ×{" "}
                      {line.quantity} unité(s)
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isDraft ? (
                    <select
                      value={line.quantity}
                      disabled={pending}
                      onChange={(e) => setQty(line.id, Number(e.target.value))}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-600">Qté {line.quantity}</span>
                  )}
                  <span className="text-sm font-semibold text-slate-900">
                    {Number(line.line_total_eur).toFixed(2)} €
                  </span>
                  {isDraft ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeLine(line.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Sous-total location</span>
          <span className="font-semibold text-slate-900">{subtotalLabel}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-600">
          <span>Frais de service (3 %)</span>
          <span className="font-semibold text-slate-900">
            {Number(initial.service_fee_eur).toFixed(2)} €
          </span>
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-900">
          <span>Total à payer</span>
          <span className="text-gs-orange">{Number(initial.checkout_total_eur).toFixed(2)} €</span>
        </div>
        {initial.deposit_amount_eur > 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            <strong>Caution</strong> : jusqu’à <strong>{Number(initial.deposit_amount_eur).toFixed(2)} €</strong> en
            empreinte bancaire (autorisation), <strong>non débitée</strong> immédiatement. Au niveau panier, une seule
            empreinte correspond au <strong>maximum</strong> des cautions des articles, pas à la somme. Elle n’apparaît
            pas dans le total à payer ci-dessus.
          </p>
        ) : null}
      </section>

      {isPendingPay ? (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Paiement en attente</p>
          {initial.stripe_checkout_resume_url ? (
            <a
              href={initial.stripe_checkout_resume_url}
              className="mt-2 inline-block font-semibold text-amber-950 underline"
            >
              Reprendre le paiement Stripe
            </a>
          ) : (
            <p className="mt-2">La session a expiré : tu peux relancer le checkout ci-dessous.</p>
          )}
        </div>
      ) : null}

      {isDraft && hasLines ? (
        <button
          type="button"
          disabled={payLoading || pending}
          onClick={() => void checkout()}
          className="font-landing-btn mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-gs-orange text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Procéder au paiement"}
        </button>
      ) : null}

      <p className="mt-6 text-center text-xs text-slate-400">
        Commission plateforme 15 % et versement prestataire sont calculés sur le montant location (hors frais de
        service), comme pour une réservation unitaire.
      </p>
    </div>
  );
}
