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
  const date = typeof params.date === "string" ? params.date : undefined;
  const personnes = typeof params.personnes === "string" ? params.personnes : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;

  const salles = await searchSalles({ ville, departement, date, personnes, type });

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
