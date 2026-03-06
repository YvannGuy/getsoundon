import { Suspense } from "react";

import { getBulkRatingStats } from "@/app/actions/salle-ratings";
import { RechercherContent } from "@/components/rechercher/rechercher-content";
import { searchSalles } from "@/lib/salles";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RechercherPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ville = typeof params.ville === "string" ? params.ville : undefined;
  const departement = typeof params.departement === "string" ? params.departement : undefined;
  const date_debut = typeof params.date_debut === "string" ? params.date_debut : undefined;
  const date_fin = typeof params.date_fin === "string" ? params.date_fin : undefined;
  const personnes_min = typeof params.personnes_min === "string" ? params.personnes_min : undefined;
  const personnes_max = typeof params.personnes_max === "string" ? params.personnes_max : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;

  const salles = await searchSalles({ ville, departement, date_debut, date_fin, personnes_min, personnes_max, type });

  const ratingStats = salles.length > 0
    ? await getBulkRatingStats(salles.map((s) => s.id))
    : {};

  return (
    <Suspense
      fallback={
        <main className="container max-w-[1400px] py-6">
          <p className="text-slate-500">Chargement...</p>
        </main>
      }
    >
      <RechercherContent salles={salles} ratingStats={ratingStats} />
    </Suspense>
  );
}
