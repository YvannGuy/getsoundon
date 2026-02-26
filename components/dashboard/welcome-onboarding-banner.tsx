"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenText, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type WelcomeOnboardingBannerProps = {
  userId: string;
  dashboard: "seeker" | "owner";
  firstName?: string | null;
  videoUrl?: string;
  tourUrl?: string;
};

export function WelcomeOnboardingBanner({
  userId,
  dashboard,
  firstName,
  videoUrl,
  tourUrl = "/centre-aide",
}: WelcomeOnboardingBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const resolvedVideoUrl = videoUrl?.trim() || "https://www.youtube.com/watch?v=ysz5S6PUM-U";

  const storageKey = useMemo(
    () => `onboarding_banner_dismissed:${dashboard}:${userId}`,
    [dashboard, userId]
  );

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(storageKey);
      setIsVisible(dismissed !== "1");
    } catch {
      setIsVisible(true);
    }
  }, [storageKey]);

  const embedVideoUrl = useMemo(() => toEmbedVideoUrl(resolvedVideoUrl), [resolvedVideoUrl]);

  if (!isVisible) return null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-2xl font-bold text-[#0f1f52]">
        {firstName?.trim()
          ? `Bienvenue, ${firstName.trim()} sur `
          : "Bienvenue sur "}
        <span className="text-[#213398]">salledeculte.com</span>!
      </h2>
      <div className="my-4 border-t border-slate-200" />
      <p className="text-sm text-slate-500">
        Apprenez à utiliser la plateforme facilement.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#213398] px-5 text-sm font-medium text-white hover:bg-[#1a2980]"
          onClick={() => setVideoOpen(true)}
        >
          <Play className="h-5 w-5" />
          Voir la vidéo (1 min 45)
        </button>
        <Link
          href={tourUrl}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-[#0f1f52] hover:bg-slate-50"
        >
          <BookOpenText className="h-5 w-5" />
          Faire la visite guidée
        </Link>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="text-sm text-[#213398] underline hover:text-[#1a2980]"
          onClick={() => {
            try {
              window.localStorage.setItem(storageKey, "1");
            } catch {
              // no-op
            }
            setIsVisible(false);
          }}
        >
          Ne plus afficher
        </button>
      </div>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle>Vidéo de prise en main</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
            {embedVideoUrl ? (
              <iframe
                title="Vidéo onboarding"
                src={embedVideoUrl}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-sm text-white">
                <p>Impossible d&apos;intégrer cette vidéo dans la popup.</p>
                <a
                  href={resolvedVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-100"
                >
                  Ouvrir la vidéo dans un nouvel onglet
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function toEmbedVideoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = u.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        videoId = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/").filter(Boolean)[1] ?? null;
      } else if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/").filter(Boolean)[1] ?? null;
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const vimeoId =
        host === "player.vimeo.com"
          ? parts[parts.indexOf("video") + 1] ?? null
          : parts[0] ?? null;

      if (vimeoId && /^\d+$/.test(vimeoId)) {
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
      }
    }

    return null;
  } catch {
    return null;
  }
}
