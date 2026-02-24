"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-black">Une erreur est survenue</h2>
          <p className="mt-2 text-sm text-slate-600">
            L&apos;incident a été signalé automatiquement. Réessaie dans quelques instants.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-5 rounded-md bg-[#213398] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2980]"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
