"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  getHeaderAccountMenuItems,
  getHeaderAccountSpaceLabel,
} from "@/components/layout/header-account-nav-config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EffectiveUserType } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

/** Bordure gris chaud très légère, texte brun-charbon (réf. maquette « Mon compte »). */
const pillBorder = "border border-[#E6E4E1]";
const textAccount = "text-[#3a342f]";

function HeaderAccountAvatar({
  avatarUrl,
  displayName,
  email,
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
}) {
  const source =
    typeof avatarUrl === "string" && avatarUrl.trim() !== "" ? avatarUrl.trim() : null;

  if (source) {
    return (
      <span
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200 ring-1 ring-inset ring-black/[0.05]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URLs OAuth / diverses hors remotePatterns */}
        <img
          src={source}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  const label = displayName?.trim() || email?.split("@")[0]?.trim() || "";
  const initialMatch = label.match(/\p{L}/u);
  const initial = (initialMatch?.[0] ?? label[0] ?? "").toUpperCase();

  if (initial) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4a4a4a] text-[11px] font-semibold tracking-tight text-white ring-1 ring-inset ring-black/[0.06]"
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 ring-1 ring-inset ring-black/[0.05]"
      aria-hidden
    >
      <User className="h-4 w-4" strokeWidth={1.5} />
    </span>
  );
}

export function HeaderAuthDropdown({
  dashboardHref,
  userType,
  onNavigate,
  fullWidth,
  avatarUrl,
  displayName,
  email,
}: {
  dashboardHref: string;
  userType: EffectiveUserType;
  onNavigate?: () => void;
  fullWidth?: boolean;
  /** Photo profil ou avatar OAuth si disponible */
  avatarUrl?: string | null;
  /** Prénom / nom pour initiale fallback */
  displayName?: string | null;
  email?: string | null;
}) {
  const router = useRouter();
  const items = getHeaderAccountMenuItems(userType);
  const spaceLabel = getHeaderAccountSpaceLabel(userType);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  };

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center",
        fullWidth ? "w-full min-w-0" : "inline-flex max-w-full"
      )}
    >
      <div
        className={cn(
          "flex h-10 max-h-10 min-h-10 items-stretch overflow-hidden rounded-full bg-white shadow-none",
          pillBorder,
          "transition-[background-color] duration-150",
          "hover:bg-[#FAFAF9]",
          fullWidth ? "w-full" : ""
        )}
      >
        <Link
          href={dashboardHref}
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-2 pr-1 sm:pl-2.5 sm:pr-2",
            "rounded-l-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/35 focus-visible:ring-offset-0",
            textAccount
          )}
          aria-label="Mon compte — accueil de l’espace"
        >
          <HeaderAccountAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            email={email}
          />
          <span className="truncate text-left text-[14px] font-medium leading-none tracking-tight">
            Mon compte
          </span>
        </Link>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-9 shrink-0 items-center justify-center rounded-r-full border-l border-[#EDEAE6]",
                textAccount,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400/40"
              )}
              aria-label="Ouvrir le menu des raccourcis"
            >
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{spaceLabel}</p>
            </div>
            <nav className="max-h-[min(70vh,420px)] overflow-y-auto p-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-black"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
