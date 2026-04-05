"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Headphones,
  Home,
  Menu,
  Wallet,
  Megaphone,
  Package,
  Settings,
  Users,
  X,
} from "lucide-react";

import { signOutAdminAction } from "@/app/actions/auth-admin";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export type AdminSidebarBadgeCounts = {
  utilisateurs: number;
  conciergeRequests: number;
  incidentsMateriel: number;
};

type AdminSidebarProps = {
  badgeCounts: AdminSidebarBadgeCounts;
  userEmail?: string | null;
};

const navItems = (counts: AdminSidebarBadgeCounts) => [
  { href: "/admin", label: "Tableau de bord", icon: Home },
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    icon: Users,
    badgeKey: "utilisateurs",
    badge: counts.utilisateurs,
    badgeTone: "info" as const,
  },
  { href: "/admin/annonces-materiel", label: "Annonces", icon: Megaphone },
  { href: "/admin/reservations-materiel", label: "Réservations", icon: ClipboardList },
  {
    href: "/admin/incidents-materiel",
    label: "Incidents matériel",
    icon: Package,
    badgeKey: "incidentsMateriel",
    badge: counts.incidentsMateriel,
    badgeTone: "danger" as const,
  },
  { href: "/admin/materiel-annulations", label: "Annulations matériel", icon: Ban },
  { href: "/admin/factures", label: "Factures", icon: FileText },
  { href: "/admin/paiements-virements", label: "Paiements & virements", icon: Wallet },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

const ADMIN_BADGE_STORAGE_KEY = "admin_nav_seen_badges_v3";

export function AdminSidebar({ badgeCounts, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seenByKey, setSeenByKey] = useState<Record<string, number>>({});
  const initial = (userEmail ?? "A")[0].toUpperCase();
  const items = navItems(badgeCounts);

  const rawByKey: Record<string, number> = {
    utilisateurs: badgeCounts.utilisateurs,
    conciergeRequests: badgeCounts.conciergeRequests,
    incidentsMateriel: badgeCounts.incidentsMateriel,
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(ADMIN_BADGE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      setSeenByKey(parsed);
    } catch {
      // Ignore malformed local storage payload
    }
  }, []);

  const markSeen = (badgeKey: string, rawValue: number) => {
    if (typeof window === "undefined" || rawValue <= 0) return;
    setSeenByKey((prev) => {
      if ((prev[badgeKey] ?? 0) >= rawValue) {
        return prev;
      }
      const next = { ...prev, [badgeKey]: rawValue };
      window.localStorage.setItem(ADMIN_BADGE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const displayBadge = (item: { badgeKey?: string }, isActive: boolean) => {
    if (isActive) return 0;
    if (!item.badgeKey) return 0;
    const raw = rawByKey[item.badgeKey] ?? 0;
    const seen = seenByKey[item.badgeKey] ?? 0;
    return Math.max(raw - seen, 0);
  };

  useEffect(() => {
    const activeItem = items.find((item) => item.href === pathname && item.badgeKey);
    if (!activeItem?.badgeKey) return;
    markSeen(activeItem.badgeKey, rawByKey[activeItem.badgeKey] ?? 0);
  }, [
    items,
    pathname,
    badgeCounts.utilisateurs,
    badgeCounts.conciergeRequests,
    badgeCounts.incidentsMateriel,
  ]);

  const sidebarContent = (
    <>
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200 bg-white",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link
            href="/admin"
            className="flex items-center gap-3 overflow-hidden"
            onClick={() => setMobileOpen(false)}
          >
            <Image
              src="/images/logosound.png"
              alt={siteConfig.name}
              width={32}
              height={32}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
            <div className="flex flex-col justify-center">
              <span className="truncate text-base font-bold text-gs-orange">{siteConfig.name}</span>
              <span className="truncate text-xs font-medium text-slate-500">Admin · matériel</span>
            </div>
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
          const badge = displayBadge(item, isActive);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (item.badgeKey) markSeen(item.badgeKey, rawByKey[item.badgeKey] ?? 0);
                setMobileOpen(false);
              }}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-gs-orange text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-black"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-600")} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeTone === "danger"
                            ? "bg-red-100 text-red-700"
                            : item.badgeTone === "info"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge > 0 && (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white",
                    item.badgeTone === "danger"
                      ? "bg-red-500"
                      : item.badgeTone === "info"
                        ? "bg-blue-500"
                        : "bg-amber-500"
                  )}
                >
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
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

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
            <p className="text-xs text-slate-500">Admin</p>
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
            const badge = displayBadge(item, isActive);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.badgeKey) markSeen(item.badgeKey, rawByKey[item.badgeKey] ?? 0);
                  setMobileOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-gs-orange text-white" : "text-slate-700 hover:bg-slate-100 hover:text-black"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-600")} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                      isActive
                        ? "bg-white/20 text-white"
                        : item.badgeTone === "danger"
                          ? "bg-red-100 text-red-700"
                          : item.badgeTone === "info"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                    )}
                  >
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
