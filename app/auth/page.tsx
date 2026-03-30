import { Suspense } from "react";

import { AuthPageClient } from "./auth-page-client";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gs-beige">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center font-landing-body text-gs-muted">
            Chargement...
          </div>
        }
      >
        <AuthPageClient />
      </Suspense>
    </div>
  );
}
