"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { hasConsent } from "@/lib/consent";

/**
 * Applique opt-in / opt-out PostHog selon `site_consent` (catégorie analytics).
 * Doit être monté tôt (ex. en premier enfant de CookieProvider) pour précéder les captures métier.
 */
export function PosthogConsentSync() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;

    const sync = () => {
      try {
        if (hasConsent("analytics")) {
          posthog.opt_in_capturing({ captureEventName: false });
        } else {
          posthog.opt_out_capturing();
        }
      } catch {
        // posthog non initialisé ou SDK en état inattendu
      }
    };

    sync();
    window.addEventListener("consent:updated", sync);
    return () => window.removeEventListener("consent:updated", sync);
  }, []);

  return null;
}
