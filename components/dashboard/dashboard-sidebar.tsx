"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search/search-modal";
import { SwitchToOwnerView } from "@/components/dashboard/dashboard-view-switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type SeekerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: string;
  opensSearchModal?: boolean;
};

const seekerNavItems: SeekerNavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/catalogue", label: "Catalogue matériel", icon: Search, opensSearchModal: true },
  { href: "/dashboard/materiel", label: "Mes locations matériel", icon: Package, badgeKey: "materiel_chat" },
  { href: "/dashboard/paiement", label: "Paiements & carte", icon: CreditCard },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

const seekerNavSections: { title: string; itemHrefs: string[] }[] = [
  { title: "Vue d'ensemble", itemHrefs: ["/dashboard", "/catalogue"] },
  { title: "Locations matériel", itemHrefs: ["/dashboard/materiel"] },
  { title: "Finances", itemHrefs: ["/dashboard/paiement"] },
  { title: "Compte", itemHrefs: ["/dashboard/parametres"] },
];

const SEEKER_ROOT = "/dashboard";

function isSeekerNavActive(pathname: string, href: string): boolean {
  if (href === SEEKER_ROOT) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SEEKER_BADGE_STORAGE_KEY = "seeker_nav_seen_badges_v1";

function NavContent({
  pathname,
  displayName,
  userEmail,
  materielUnreadCount,
  collapsed = false,
  onItemClick,
  searchModalOpen,
  setSearchModalOpen,
  canAccessOwner = false,
  tourLock = false,
  publishMaterialHref = "/auth?tab=signup&userType=owner",
}: {
  pathname: string;
  displayName: string;
  userEmail?: string | null;
  materielUnreadCount: number;
  collapsed?: boolean;
  onItemClick?: () => void;
  searchModalOpen?: boolean;
  setSearchModalOpen?: (open: boolean) => void;
  canAccessOwner?: boolean;
  tourLock?: boolean;
  publishMaterialHref?: string;
}) {
  const [seenByKey, setSeenByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SEEKER_BADGE_STORAGE_KEY);
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
      if ((prev[badgeKey] ?? 0) >= rawValue) return prev;
      const next = { ...prev, [badgeKey]: rawValue };
      window.localStorage.setItem(SEEKER_BADGE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const rawByKey: Record<string, number> = {
    materiel_chat: materielUnreadCount,
  };

  const unreadFor = (badgeKey: string | undefined): number => {
    if (!badgeKey) return 0;
    const raw = rawByKey[badgeKey] ?? 0;
    const seen = seenByKey[badgeKey] ?? 0;
    return Math.max(raw - seen, 0);
  };

  useEffect(() => {
    const activeItem = seekerNavItems.find(
      (item) => !item.opensSearchModal && isSeekerNavActive(pathname, item.href) && item.badgeKey
    );
    if (!activeItem?.badgeKey) return;
    markSeen(activeItem.badgeKey, rawByKey[activeItem.badgeKey] ?? 0);
  }, [pathname, materielUnreadCount]);

  return (
    <>
      <nav
        className={cn(
          "flex-1 space-y-0.5 overflow-y-auto px-3 py-4",
          tourLock && "pointer-events-none select-none"
        )}
      >
        <Link
          href="/"
          onClick={onItemClick}
          className={cn(
            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            collapsed ? "justify-center px-2" : "",
            "text-slate-600 hover:bg-slate-100 hover:text-black"
          )}
          title={collapsed ? "Revenir à l'accueil" : undefined}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="flex-1 truncate">Revenir à l&apos;accueil</span>}
        </Link>
        {canAccessOwner && !tourLock && <SwitchToOwnerView collapsed={collapsed} />}
        {!canAccessOwner && (
          <Link
            href={publishMaterialHref}
            onClick={onItemClick}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "",
              "text-slate-600 hover:bg-slate-100 hover:text-black"
            )}
            title={collapsed ? "Proposer du matériel" : undefined}
          >
            <Package className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">Proposer du matériel</span>}
          </Link>
        )}
        <div className="my-2 border-t border-slate-100" />
        {seekerNavSections.map((section) => {
          const sectionItems = seekerNavItems.filter((item) => section.itemHrefs.includes(item.href));
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.title} className="mt-1 first:mt-0">
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </p>
              )}
              {sectionItems.map((item) => {
          const opensSearchModal = item.opensSearchModal;
          const isActive = !opensSearchModal && isSeekerNavActive(pathname, item.href);
          const Icon = item.icon;
          const badgeVal = item.badgeKey ? (isActive ? 0 : unreadFor(item.badgeKey)) : null;
          const navClassName = cn(
            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            collapsed ? "justify-center px-2" : "",
            isActive
              ? "bg-gs-orange text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-black"
          );
          const content = (
            <>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badgeVal != null && badgeVal > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeKey === "materiel_chat"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {badgeVal}
                    </span>
                  )}
                </>
              )}
              {collapsed && badgeVal != null && badgeVal > 0 && (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white",
                    item.badgeKey === "materiel_chat" ? "bg-sky-500" : "bg-emerald-500"
                  )}
                >
                  {badgeVal > 99 ? "99+" : badgeVal}
                </span>
              )}
            </>
          );
                if (opensSearchModal && setSearchModalOpen) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      data-tour-nav={item.href}
                      onClick={() => {
                        if (item.badgeKey) markSeen(item.badgeKey, rawByKey[item.badgeKey] ?? 0);
                        setSearchModalOpen(true);
                      }}
                      className={navClassName}
                      title={collapsed ? item.label : undefined}
                    >
                      {content}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour-nav={item.href}
                    onClick={() => {
                      if (item.badgeKey) markSeen(item.badgeKey, rawByKey[item.badgeKey] ?? 0);
                      onItemClick?.();
                    }}
                    className={navClassName}
                    title={collapsed ? item.label : undefined}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      {!tourLock && (
        <div className="border-t border-slate-200 p-4">
          <div className={cn("flex items-center gap-3 rounded-lg bg-slate-50 p-3", collapsed && "justify-center px-0")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gs-orange text-white">
              <User className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-black">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              </div>
            )}
          </div>
          <form action={signOutAction} className="mt-3">
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-black",
                collapsed && "justify-center px-0"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export function DashboardSidebar({
  user,
  materielUnreadCount = 0,
  canAccessOwner = false,
  publishMaterialHref = "/auth?tab=signup&userType=owner",
}: {
  user: { email?: string | null; displayName?: string };
  materielUnreadCount?: number;
  canAccessOwner?: boolean;
  publishMaterialHref?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourLock, setTourLock] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const displayName = user.displayName ?? "Utilisateur";
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const onTourSidebarToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ dashboard?: "seeker" | "owner"; open?: boolean }>;
      if (customEvent.detail?.dashboard !== "seeker") return;
      if (typeof customEvent.detail?.open === "boolean") {
        setTourLock(customEvent.detail.open);
        setMobileOpen(customEvent.detail.open);
      }
    };
    window.addEventListener("tour:sidebar-toggle", onTourSidebarToggle as EventListener);
    return () => window.removeEventListener("tour:sidebar-toggle", onTourSidebarToggle as EventListener);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const syncFromBody = () => {
      const active = document.body.getAttribute("data-onboarding-tour-active") === "1";
      setTourLock(active);
      if (active) setMobileOpen(true);
    };
    syncFromBody();
    const observer = new MutationObserver(syncFromBody);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-onboarding-tour-active"] });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Mobile: header avec menu hamburger */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Link href="/dashboard" className="font-landing-logo-mark flex items-center gap-1.5 text-lg text-gs-orange">
          {isHydrated && (
            <Image
              src="/images/logosound.png"
              alt={siteConfig.name}
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          )}
          {siteConfig.name.toUpperCase()}
        </Link>
        <div className="w-10" />
      </header>

      {/* Mobile: drawer */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          const isTourActive =
            typeof document !== "undefined" &&
            document.body.getAttribute("data-onboarding-tour-active") === "1";
          if (!open && (tourLock || isTourActive)) {
            setMobileOpen(true);
            return;
          }
          setMobileOpen(open);
        }}
      >
        <SheetContent
          side="left"
          data-tour-sidebar-mobile="seeker"
          className="flex w-72 max-w-[85vw] flex-col p-0"
          onPointerDownOutside={(event) => {
            if (tourLock) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (tourLock) event.preventDefault();
          }}
          onFocusOutside={(event) => {
            if (tourLock) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (tourLock) event.preventDefault();
          }}
        >
          <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4">
            <Link
              href="/dashboard"
              className="font-landing-logo-mark flex min-w-0 flex-1 items-center gap-1.5 text-lg text-gs-orange"
              onClick={() => setMobileOpen(false)}
            >
              {isHydrated && (
                <Image
                  src="/images/logosound.png"
                  alt={siteConfig.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              )}
              <span className="truncate">{siteConfig.name.toUpperCase()}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (tourLock) return;
                setMobileOpen(false);
              }}
              disabled={tourLock}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-black",
                tourLock && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
              aria-label="Réduire le menu"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <NavContent
            pathname={pathname}
            displayName={displayName}
            userEmail={user.email}
            materielUnreadCount={materielUnreadCount}
            onItemClick={() => setMobileOpen(false)}
            searchModalOpen={searchModalOpen}
            setSearchModalOpen={(open) => {
              setSearchModalOpen(open);
              if (!open) setMobileOpen(false);
            }}
            canAccessOwner={canAccessOwner}
            tourLock={tourLock}
            publishMaterialHref={publishMaterialHref}
          />
        </SheetContent>
      </Sheet>

      <SearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />

      {/* Desktop: sidebar retractable sticky */}
      <aside
        data-tour-sidebar-desktop="seeker"
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex",
          collapsed ? "sticky top-0 h-screen w-20" : "sticky top-0 h-screen w-64"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-slate-200",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="font-landing-logo-mark flex items-center gap-1.5 text-lg text-gs-orange">
              {isHydrated && (
                <Image
                  src="/images/logosound.png"
                  alt={siteConfig.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              )}
              {siteConfig.name.toUpperCase()}
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
        <NavContent
          pathname={pathname}
          displayName={displayName}
          userEmail={user.email}
          materielUnreadCount={materielUnreadCount}
          collapsed={collapsed}
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
          canAccessOwner={canAccessOwner}
          tourLock={false}
          publishMaterialHref={publishMaterialHref}
        />
      </aside>
    </>
  );
}
