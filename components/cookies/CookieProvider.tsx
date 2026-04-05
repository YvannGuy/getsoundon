"use client";

import { useState, useEffect } from "react";
import { CookieBanner, openCookiePreferences } from "./CookieBanner";
import { CookiePreferencesModal } from "./CookiePreferencesModal";
import { PosthogConsentSync } from "./PosthogConsentSync";

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const handler = () => setPreferencesOpen(true);
    window.addEventListener("open-cookie-preferences", handler);
    return () => window.removeEventListener("open-cookie-preferences", handler);
  }, []);

  return (
    <>
      <PosthogConsentSync />
      {children}
      <CookieBanner onOpenPreferences={() => setPreferencesOpen(true)} />
      <CookiePreferencesModal
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  );
}

export { openCookiePreferences };
