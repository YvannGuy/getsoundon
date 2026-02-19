import { Suspense } from "react";

import { RechercherContent } from "@/components/rechercher/rechercher-content";

export default function RechercherPage() {
  return (
    <Suspense fallback={<main className="container max-w-[1400px] py-6"><p className="text-slate-500">Chargement...</p></main>}>
      <RechercherContent />
    </Suspense>
  );
}
