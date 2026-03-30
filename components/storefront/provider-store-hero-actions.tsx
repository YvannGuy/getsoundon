"use client";

import { Mail, Share2 } from "lucide-react";

type ProviderStoreHeroActionsProps = {
  providerName: string;
};

export function ProviderStoreHeroActions({ providerName }: ProviderStoreHeroActionsProps) {
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${providerName} — GetSoundOn`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => void share()}
        className="font-landing-btn inline-flex items-center gap-2 rounded-lg border border-white/90 bg-white px-4 py-2.5 text-xs text-gs-dark shadow-sm transition hover:bg-white/95 sm:px-5 sm:py-3 sm:text-sm"
      >
        <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        Partager
      </button>
      <a
        href={`mailto:contact@getsoundon.com?subject=${encodeURIComponent(`Message pour ${providerName}`)}`}
        className="font-landing-btn inline-flex items-center gap-2 rounded-lg bg-gs-orange px-4 py-2.5 text-xs text-white shadow-sm transition hover:brightness-105 sm:px-5 sm:py-3 sm:text-sm"
      >
        <Mail className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        Contacter
      </a>
    </div>
  );
}
