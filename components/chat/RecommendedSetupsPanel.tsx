"use client";

import type { UiRecommendedSetups } from "@/lib/event-assistant/types";

type Props = {
  recommended: UiRecommendedSetups;
};

/**
 * Affiche la configuration recommandée (orchestrateur) dans /chat,
 * indépendamment des prestataires matchés.
 */
export function RecommendedSetupsPanel({ recommended }: Props) {
  const { summary, tiers } = recommended;
  const hasTiers = tiers && tiers.length > 0;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Configuration recommandée
      </p>
      {summary ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>
      ) : null}

      {hasTiers ? (
        <div className="mt-4 space-y-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-gs-dark">{tier.title}</h3>
                <span className="text-xs font-medium uppercase text-slate-500">{tier.id}</span>
              </div>
              {tier.rationale ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{tier.rationale}</p>
              ) : null}
              {tier.services?.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {tier.services.map((s) => (
                    <li
                      key={s}
                      className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              ) : null}
              {tier.items?.length ? (
                <ul className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-3">
                  {tier.items.map((item, idx) => (
                    <li key={`${item.label}-${idx}`} className="text-xs text-slate-700">
                      <span className="font-medium text-slate-800">{item.label}</span>
                      {item.quantity != null ? (
                        <span className="text-slate-500"> × {item.quantity}</span>
                      ) : null}
                      {item.notes ? (
                        <span className="block text-slate-500">{item.notes}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : !summary ? (
        <p className="mt-2 text-sm text-slate-500">Aucun détail de configuration n’a pu être généré pour l’instant.</p>
      ) : null}
    </div>
  );
}
