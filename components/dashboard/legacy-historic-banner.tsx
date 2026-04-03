import type { ReactNode } from "react";

/** Bandeau discret pour les écrans encore accessibles en URL directe (legacy non promu produit). */
export function LegacyHistoricBanner({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="note"
    >
      <p className="font-medium text-amber-900">Espace historique (legacy)</p>
      <p className="mt-1 text-amber-900/90">{children}</p>
    </div>
  );
}
