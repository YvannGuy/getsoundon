"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { siteConfig } from "@/config/site";

const STORAGE_KEY = "salledeculte-install-dismissed";
const DELAY_MS = 7000;

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function InstallAppPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isMobile()) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [mounted]);

  const handleClose = () => {
    setOpen(false);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="pr-10 pt-1 text-[18px] font-semibold text-black">
          Installer {siteConfig.name}
        </h3>
        <p className="mt-3 text-[14px] leading-[1.5] text-slate-600">
          Appuyer sur <strong>Partager</strong> puis &quot;Sur l&apos;écran d&apos;accueil&quot;
        </p>
        <button
          type="button"
          onClick={handleClose}
          className="mt-6 w-full text-center text-[12px] text-slate-400 hover:text-slate-500"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
