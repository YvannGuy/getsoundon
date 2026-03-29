import { Suspense } from "react";

import { ItemsSearchContent } from "@/components/items/items-search-content";

export default function CataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-[1400px] py-10">
          <p className="text-sm text-slate-500">Chargement du catalogue…</p>
        </div>
      }
    >
      <ItemsSearchContent />
    </Suspense>
  );
}
