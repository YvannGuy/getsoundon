"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Flag,
  Home,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

import { signOutAdminAction } from "@/app/actions/auth-admin";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  pendingCount: number;
  reportsCount?: number;
  userEmail?: string | null;
};

const navItems = (
  pendingCount: number,
  reportsCount: number
) => [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/annonces-a-valider", label: "Annonces à valider", icon: Bell, badge: pendingCount },
  { href: "/admin/annonces", label: "Annonces", icon: Building2 },
  { href: "/admin/signalements", label: "Signalements", icon: Flag, badge: reportsCount },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export function AdminSidebar({ pendingCount, reportsCount = 0, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (userEmail ?? "A")[0].toUpperCase();
  const items = navItems(pendingCount, reportsCount);

  const sidebarContent = (
    <>
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link
            href="/admin"
            className="flex flex-col justify-center overflow-hidden"
            onClick={() => setMobileOpen(false)}
          >
            <span className="truncate text-base font-bold text-black">{siteConfig.name}</span>
            <span className="truncate text-xs text-slate-500">Admin Dashboard</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-black"
          aria-label={collapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-5">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badge = item.badge ?? null;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-black"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-600")} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge != null && badge > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge != null && badge > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <form action={signOutAdminAction}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-black",
              collapsed && "justify-center px-2"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {initial}
            </div>
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Bouton menu mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar desktop (toujours visible) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar mobile (drawer) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 lg:hidden">
          <div className="flex flex-col justify-center">
            <Link href="/admin" className="text-base font-bold text-black" onClick={() => setMobileOpen(false)}>
              {siteConfig.name}
            </Link>
            <p className="text-xs text-slate-500">Admin Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const badge = item.badge ?? null;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-black"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-600")} />
                <span className="flex-1">{item.label}</span>
                {badge != null && badge > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                      isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <form action={signOutAdminAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {initial}
              </div>
              <span>Déconnexion</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
