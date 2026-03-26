"use client";

import { Package, Search } from "lucide-react";

const COOKIE_NAME = "dashboard_view";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

function setCookie(view: "seeker" | "owner") {
  document.cookie = `${COOKIE_NAME}=${view}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function SwitchToOwnerView({ collapsed }: { collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        setCookie("owner");
        window.location.assign("/proprietaire");
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-black"
      title={collapsed ? "Voir en tant que prestataire" : undefined}
    >
      <Package className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">Voir en tant que prestataire</span>}
    </button>
  );
}

export function SwitchToSeekerView({ collapsed }: { collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        setCookie("seeker");
        window.location.assign("/dashboard");
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-black"
      title={collapsed ? "Voir en tant que locataire" : undefined}
    >
      <Search className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">Voir en tant que locataire</span>}
    </button>
  );
}
