"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export type ConciergeSearchCriteria = {
  ville?: string;
  departement?: string;
  date_debut?: string;
  date_fin?: string;
  personnes_min?: string;
  personnes_max?: string;
  type?: string;
};

function buildConciergeUrl(criteria: ConciergeSearchCriteria): string {
  const params = new URLSearchParams();
  if (criteria.ville) params.set("ville", criteria.ville);
  if (criteria.departement) params.set("departement", criteria.departement);
  if (criteria.date_debut) params.set("date_debut", criteria.date_debut);
  if (criteria.date_fin) params.set("date_fin", criteria.date_fin);
  if (criteria.personnes_min) params.set("personnes_min", criteria.personnes_min);
  if (criteria.personnes_max) params.set("personnes_max", criteria.personnes_max);
  if (criteria.type) params.set("type", criteria.type);
  const qs = params.toString();
  return `/conciergerie${qs ? `?${qs}` : ""}`;
}

export function ZeroResultsConcierge({
  criteria,
  onModifyCriteria,
}: {
  criteria: ConciergeSearchCriteria;
  onModifyCriteria?: () => void;
}) {
  const conciergeUrl = buildConciergeUrl(criteria);

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
      <h3 className="text-xl font-semibold text-black">Aucun résultat pour ces critères.</h3>
      <p className="mt-2 max-w-lg mx-auto text-[15px] leading-relaxed text-slate-600">
        Confiez-nous votre recherche : on vous propose 3 à 5 lieux compatibles et on organise les visites.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={conciergeUrl}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#213398] px-5 text-sm font-medium text-white transition hover:bg-[#1a2980]"
        >
          Confier ma recherche
        </Link>
        {onModifyCriteria && (
          <Button
            variant="outline"
            className="h-11 px-5"
            onClick={() => onModifyCriteria?.()}
          >
            Modifier mes critères
          </Button>
        )}
      </div>
    </div>
  );
}
