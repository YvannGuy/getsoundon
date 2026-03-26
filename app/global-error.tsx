"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-black">Une erreur est survenue</h2>
          <p className="mt-2 text-sm text-slate-600">
            Une erreur inattendue est survenue. Reessaie dans quelques instants.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-5 rounded-md bg-gs-orange px-4 py-2 text-sm font-medium text-white hover:brightness-95"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
