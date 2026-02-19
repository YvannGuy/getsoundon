import { Suspense } from "react";

import { RechercherContent } from "@/components/rechercher/rechercher-content";
import { getSalles } from "@/lib/salles";

export default async function RechercherPage() {
  const salles = await getSalles();

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
