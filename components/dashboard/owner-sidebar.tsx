"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  User,
} from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/proprietaire", label: "Tableau de bord", icon: Home },
  { href: "/proprietaire/annonces", label: "Mes annonces", icon: Building2 },
  { href: "/proprietaire/demandes", label: "Demandes reçues", icon: FolderOpen, badgeKey: "demandes" },
  { href: "/proprietaire/messagerie", label: "Messagerie", icon: MessageCircle, badgeKey: "messagerie" },
  { href: "/proprietaire/parametres", label: "Paramètres", icon: Settings },
];

export function OwnerSidebar({
  user,
  demandeCount = 0,
  messageCount = 0,
}: {
  user: { email?: string | null; displayName?: string };
  demandeCount?: number;
  messageCount?: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const displayName = user.displayName ?? "Utilisateur";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-slate-200",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/proprietaire" className="text-lg font-semibold text-[#303B4A]">
            {siteConfig.name}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label={collapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-[#6366f1] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badgeKey === "demandes" && demandeCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {demandeCount}
                    </span>
                  )}
                  {item.badgeKey === "messagerie" && messageCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-[#6366f1]/20 text-[#4f46e5]"
                      )}
                    >
                      {messageCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badgeKey === "demandes" && demandeCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                  {demandeCount > 99 ? "99+" : demandeCount}
                </span>
              )}
              {collapsed && item.badgeKey === "messagerie" && messageCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#6366f1] px-1 text-[10px] font-semibold text-white">
                  {messageCount > 99 ? "99+" : messageCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg bg-slate-50 p-3",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-white">
            <User className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}
        </div>
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-slate-900",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
