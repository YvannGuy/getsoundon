import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import type { GsOrderDetailPayload } from "@/lib/load-gs-order-detail";

const STATUS_FR: Record<string, string> = {
  draft: "Brouillon",
  pending_payment: "Paiement en cours",
  accepted: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};

type Props = {
  vm: GsOrderDetailPayload;
  paidQuery?: boolean;
  backHref: string;
  backLabel: string;
};

export function GsOrderDetailView({ vm, paidQuery, backHref, backLabel }: Props) {
  const { order, items, customerLabel, providerLabel } = vm;
  const statusLabel = STATUS_FR[order.status] ?? order.status;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={backHref} className="text-sm font-medium text-gs-orange hover:underline">
        ← {backLabel}
      </Link>

      <h1 className="mt-4 font-landing-heading text-2xl font-bold text-gs-dark">Commande panier</h1>
      <p className="mt-1 text-sm text-slate-500">
        Réf. <span className="font-mono text-slate-700">{order.id}</span>
      </p>

      {paidQuery && order.status === "pending_payment" ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Finalisation du paiement… Actualise la page dans quelques secondes si le statut ne passe pas à
          « Confirmée ».
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Statut</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
            {statusLabel}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Période</dt>
            <dd className="font-medium text-slate-900">
              {order.start_date && order.end_date
                ? `${format(new Date(`${order.start_date}T12:00:00`), "d MMM yyyy", { locale: fr })} → ${format(new Date(`${order.end_date}T12:00:00`), "d MMM yyyy", { locale: fr })}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Client</dt>
            <dd className="font-medium text-slate-900">{customerLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Prestataire</dt>
            <dd className="font-medium text-slate-900">{providerLabel}</dd>
          </div>
          {order.stripe_payment_intent_id ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Paiement (réf.)</dt>
              <dd className="font-mono text-xs text-slate-700">{order.stripe_payment_intent_id}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Articles</h2>
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {items.map((line) => (
            <li key={line.id} className="flex gap-3 p-4">
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
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{line.title_snapshot}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {line.price_per_day_snapshot.toFixed(2)} € × {line.days_count} j × {line.quantity} unité(s)
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{line.line_total_eur.toFixed(2)} €</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Location</span>
          <span className="font-semibold text-slate-900">{order.location_total_eur.toFixed(2)} €</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-slate-600">
          <span>Frais de service</span>
          <span className="font-semibold text-slate-900">{order.service_fee_eur.toFixed(2)} €</span>
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-900">
          <span>Total payé</span>
          <span className="text-gs-orange">{order.checkout_total_eur.toFixed(2)} €</span>
        </div>
        {order.deposit_amount_eur > 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            <strong>Caution</strong> (empreinte bancaire, non débitée immédiatement) :{" "}
            {order.deposit_amount_eur.toFixed(2)} € — correspond au maximum des cautions des articles.
            {order.deposit_hold_status ? (
              <>
                {" "}
                Statut empreinte : <strong>{order.deposit_hold_status}</strong>
              </>
            ) : null}
          </p>
        ) : null}
        {order.payout_status ? (
          <p className="mt-2 text-xs text-slate-500">Versement prestataire : {order.payout_status}</p>
        ) : null}
      </section>
    </div>
  );
}
