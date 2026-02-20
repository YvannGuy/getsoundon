import { Suspense } from "react";

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
  const date = typeof params.date === "string" ? params.date : undefined;
  const personnes = typeof params.personnes === "string" ? params.personnes : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;

  const salles = await searchSalles({ ville, date, personnes, type });

  return (
    <Suspense
      fallback={
        <main className="container max-w-[1400px] py-6">
          <p className="text-slate-500">Chargement...</p>
        </main>
      }
    >
      <RechercherContent salles={salles} />
    </Suspense>
  );
}
