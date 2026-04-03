"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, LogOut, Settings, User } from "lucide-react";

import { signOutAdminAction } from "@/app/actions/auth-admin";
import { siteConfig } from "@/config/site";

type AdminHeaderProps = {
  title?: string;
  subtitle?: string;
};

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 pl-16 lg:pl-6">
      <div>
        <a
          href={siteConfig.url}
          rel="noopener noreferrer"
          className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-gs-orange"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour vers le site
        </a>
        <h1 className="text-xl font-bold text-black">{title ?? "Dashboard Admin"}</h1>
        <p className="text-sm text-slate-600">
          {subtitle ?? "Vue d'ensemble de votre plateforme"}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/admin/parametres"
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5" />
        </Link>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 transition hover:bg-slate-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
              <User className="h-5 w-5 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-black">Admin</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <form action={signOutAdminAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
