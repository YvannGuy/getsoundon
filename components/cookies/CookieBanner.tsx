"use client";

import { useState, useEffect } from "react";
import { hasRecordedChoice, writeConsent } from "@/lib/consent";

export function CookieBanner({
  onOpenPreferences,
}: {
  onOpenPreferences?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setVisible(!hasRecordedChoice());
  }, [mounted]);

  const handleAcceptAll = () => {
    writeConsent({ analytics: true, marketing: true });
    setVisible(false);
  };

  const handleRejectAll = () => {
    writeConsent({ analytics: false, marketing: false });
    setVisible(false);
  };

  const handleCustomize = () => {
    onOpenPreferences?.();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Choix des cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
    >
      <div className="container mx-auto max-w-[1120px]">
        <p className="mb-4 text-[14px] leading-relaxed text-slate-700">
          Nous utilisons des cookies pour le fonctionnement du site (connexion, sécurité) et, avec votre accord, pour
          les statistiques et le marketing. Vous pouvez accepter tout, refuser tout, ou personnaliser.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-md bg-gs-orange px-4 py-2 text-[14px] font-medium text-white hover:brightness-95"
          >
            Tout accepter
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Tout refuser
          </button>
          <button
            type="button"
            onClick={handleCustomize}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Personnaliser
          </button>
        </div>
      </div>
    </div>
  );
}

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
  }
}
