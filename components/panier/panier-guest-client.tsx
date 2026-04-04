"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  GUEST_CART_CHANGED_EVENT,
  computeGuestCartTotals,
  readGuestCartFromStorage,
  removeGuestCartLine,
  updateGuestCartDates,
  updateGuestCartLineQuantity,
} from "@/lib/guest-cart";

const AUTH_REDIRECT = encodeURIComponent("/panier?mergeGuest=1");

type Props = {
  stripeCheckoutCancelled?: boolean;
};

export function PanierGuestClient({ stripeCheckoutCancelled = false }: Props) {
  const [cart, setCart] = useState<ReturnType<typeof readGuestCartFromStorage>>(null);

  useEffect(() => {
    setCart(readGuestCartFromStorage());
    const onChange = () => setCart(readGuestCartFromStorage());
    window.addEventListener(GUEST_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(GUEST_CART_CHANGED_EVENT, onChange);
  }, []);

  const totals = cart ? computeGuestCartTotals(cart) : null;
  const lineTotalMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of totals?.lineTotals ?? []) m.set(t.key, t.line_total_eur);
    return m;
  }, [totals]);

  const [startDate, setStartDate] = useState(cart?.start_date ?? "");
  const [endDate, setEndDate] = useState(cart?.end_date ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cart) {
      setStartDate(cart.start_date);
      setEndDate(cart.end_date);
    }
  }, [cart?.start_date, cart?.end_date, cart]);

  const applyDates = () => {
    if (!startDate || !endDate) {
      setError("Choisis une date de début et de fin.");
      return;
    }
    setPending(true);
    setError(null);
    const res = updateGuestCartDates(startDate, endDate);
    setPending(false);
    if (!res.ok) setError(res.error);
    else setCart(readGuestCartFromStorage());
  };

  const setQty = (key: string, quantity: number) => {
    setPending(true);
    setError(null);
    updateGuestCartLineQuantity(key, quantity);
    setPending(false);
    setCart(readGuestCartFromStorage());
  };

  const removeLine = (key: string) => {
    setPending(true);
    setError(null);
    removeGuestCartLine(key);
    setPending(false);
    setCart(readGuestCartFromStorage());
  };

  if (!cart || cart.lines.length === 0) {
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

  if (!totals) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Panier</h1>
        <p className="mt-4 text-slate-600">Période de location invalide. Ajuste les dates sur la fiche article.</p>
        <Link href="/items" className="mt-6 inline-block text-sm font-semibold text-gs-orange underline">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Panier</h1>
      <p className="mt-1 text-sm text-slate-500">Un seul prestataire et une seule période par commande.</p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Connexion requise pour payer</p>
        <p className="mt-1 text-amber-900/90">
          Tu peux préparer ton panier ici. Pour régler, connecte-toi ou crée un compte locataire — ton panier sera
          repris automatiquement.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/auth?tab=login&redirectedFrom=${AUTH_REDIRECT}`}
            className="inline-flex rounded-lg bg-gs-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
          >
            Se connecter
          </Link>
          <Link
            href={`/auth?tab=signup&userType=seeker&redirectedFrom=${AUTH_REDIRECT}`}
            className="inline-flex rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100/80"
          >
            Créer un compte
          </Link>
        </div>
      </div>

      {stripeCheckoutCancelled ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Paiement interrompu. Connecte-toi pour reprendre si tu avais un panier en cours.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Prestataire</h2>
        <p className="mt-1 text-base font-medium text-slate-900">{cart.provider_label ?? "Prestataire"}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Début</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Fin</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={applyDates}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour les dates"}
        </button>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Articles</h2>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {cart.lines.map((line) => (
            <li
              key={line.key}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {line.cover_url ? (
                    <Image src={line.cover_url} alt="" fill className="object-cover" sizes="64px" />
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
                    {Number(line.price_per_day_snapshot).toFixed(2)} € / jour × {totals.days} j × {line.quantity}{" "}
                    unité(s)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={line.quantity}
                  disabled={pending}
                  onChange={(e) => setQty(line.key, Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-semibold text-slate-900">
                  {(lineTotalMap.get(line.key) ?? 0).toFixed(2)} €
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeLine(line.key)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Sous-total location</span>
          <span className="font-semibold text-slate-900">{totals.locationTotalEur.toFixed(2)} €</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-600">
          <span>Frais de service (3 %)</span>
          <span className="font-semibold text-slate-900">{totals.serviceFeeEur.toFixed(2)} €</span>
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-900">
          <span>Total à payer</span>
          <span className="text-gs-orange">{totals.checkoutTotalEur.toFixed(2)} €</span>
        </div>
        {totals.depositMaxEur > 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            <strong>Caution</strong> : jusqu’à <strong>{totals.depositMaxEur.toFixed(2)} €</strong> en empreinte
            bancaire (autorisation), <strong>non débitée</strong> immédiatement. Une seule empreinte au{" "}
            <strong>maximum</strong> des cautions des articles. Elle n’apparaît pas dans le total à payer ci-dessus.
          </p>
        ) : null}
      </section>

      <p className="mt-8 text-center text-sm text-slate-600">
        Prêt à commander ?{" "}
        <Link href={`/auth?tab=login&redirectedFrom=${AUTH_REDIRECT}`} className="font-semibold text-gs-orange underline">
          Connecte-toi
        </Link>{" "}
        ou{" "}
        <Link
          href={`/auth?tab=signup&userType=seeker&redirectedFrom=${AUTH_REDIRECT}`}
          className="font-semibold text-gs-orange underline"
        >
          crée un compte
        </Link>
        .
      </p>
    </div>
  );
}
