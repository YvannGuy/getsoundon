"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Camera, ChevronLeft, ChevronRight, CreditCard, FileText, Heart, Home, LogOut, Menu, MessageCircle, Scale, Search, Settings, User } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search/search-modal";
import { SwitchToOwnerView } from "@/components/dashboard/dashboard-view-switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/dashboard/rechercher", label: "Rechercher une salle", icon: Search, opensSearchModal: true },
  { href: "/dashboard/demandes", label: "Mes demandes", icon: FileText, badgeKey: "demandes" },
  { href: "/dashboard/reservations", label: "Réservations", icon: FileText, badgeKey: "reservations" },
  { href: "/dashboard/paiement", label: "Paiement", icon: CreditCard, badgeKey: "paiement" },
  { href: "/dashboard/contrat", label: "Contrat & facture", icon: FileText },
  { href: "/dashboard/etats-des-lieux", label: "États des lieux", icon: Camera, badgeKey: "etats" },
  { href: "/dashboard/litiges", label: "Litiges", icon: Scale },
  { href: "/dashboard/messagerie", label: "Messagerie", icon: MessageCircle, badgeKey: "messagerie" },
  { href: "/dashboard/favoris", label: "Favoris", icon: Heart },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

const SEEKER_BADGE_STORAGE_KEY = "seeker_nav_seen_badges_v1";

function NavContent({
  pathname,
  displayName,
  userEmail,
  demandeCount,
  reservationCount,
  messageCount,
  paymentCount,
  edlCount,
  collapsed = false,
  onItemClick,
  searchModalOpen,
  setSearchModalOpen,
  canAccessOwner = false,
  tourLock = false,
}: {
  pathname: string;
  displayName: string;
  userEmail?: string | null;
  demandeCount: number;
  reservationCount: number;
  messageCount: number;
  paymentCount: number;
  edlCount: number;
  collapsed?: boolean;
  onItemClick?: () => void;
  searchModalOpen?: boolean;
  setSearchModalOpen?: (open: boolean) => void;
  canAccessOwner?: boolean;
  tourLock?: boolean;
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
    demandes: demandeCount,
    reservations: reservationCount,
    messagerie: messageCount,
    paiement: paymentCount,
    etats: edlCount,
  };

  const unreadFor = (badgeKey: string | undefined): number => {
    if (!badgeKey) return 0;
    const raw = rawByKey[badgeKey] ?? 0;
    const seen = seenByKey[badgeKey] ?? 0;
    return Math.max(raw - seen, 0);
  };

  useEffect(() => {
    const activeItem = navItems.find((item) => item.href === pathname && item.badgeKey);
    if (!activeItem?.badgeKey) return;
    markSeen(activeItem.badgeKey, rawByKey[activeItem.badgeKey] ?? 0);
  }, [pathname, demandeCount, reservationCount, messageCount, paymentCount, edlCount]);

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
            href="/onboarding/salle"
            onClick={onItemClick}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "",
              "text-slate-600 hover:bg-slate-100 hover:text-black"
            )}
            title={collapsed ? "Proposer une salle" : undefined}
          >
            <Building2 className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">Proposer une salle</span>}
          </Link>
        )}
        <div className="my-2 border-t border-slate-100" />
        {navItems.map((item) => {
          const isActive = pathname === item.href && !(item as { opensSearchModal?: boolean }).opensSearchModal;
          const Icon = item.icon;
          const badgeVal = item.badgeKey ? unreadFor(item.badgeKey) : null;
          const opensSearchModal = (item as { opensSearchModal?: boolean }).opensSearchModal;
          const navClassName = cn(
            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            collapsed ? "justify-center px-2" : "",
            isActive
              ? "bg-[#213398] text-white"
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
                          : item.badgeKey === "messagerie"
                            ? "bg-blue-100 text-blue-700"
                            : item.badgeKey === "paiement"
                              ? "bg-amber-100 text-amber-700"
                              : item.badgeKey === "etats"
                                ? "bg-violet-100 text-violet-700"
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
                    item.badgeKey === "messagerie"
                      ? "bg-blue-600"
                      : item.badgeKey === "paiement"
                        ? "bg-amber-500"
                        : item.badgeKey === "etats"
                          ? "bg-violet-500"
                        : "bg-emerald-500"
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
      </nav>
      {!tourLock && (
        <div className="border-t border-slate-200 p-4">
          <div className={cn("flex items-center gap-3 rounded-lg bg-slate-50 p-3", collapsed && "justify-center px-0")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#213398] text-white">
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
  demandeCount = 0,
  reservationCount = 0,
  messageCount = 0,
  paymentCount = 0,
  edlCount = 0,
  canAccessOwner = false,
}: {
  user: { email?: string | null; displayName?: string };
  demandeCount?: number;
  reservationCount?: number;
  messageCount?: number;
  paymentCount?: number;
  edlCount?: number;
  canAccessOwner?: boolean;
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
        <Link href="/dashboard" className={cn("text-lg font-semibold text-[#213398]", isHydrated && "flex items-center")}>
          {isHydrated && <Image src="/logopleinsdc.png" alt="" width={24} height={24} className="-mr-0.5 h-6 w-6 shrink-0 object-contain" />}
          {siteConfig.name}
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
          <div className="flex h-14 items-center border-b border-slate-200 px-4">
            <Link
              href="/dashboard"
              className={cn("text-lg font-semibold text-[#213398]", isHydrated && "flex items-center")}
              onClick={() => setMobileOpen(false)}
            >
              {isHydrated && <Image src="/logopleinsdc.png" alt="" width={24} height={24} className="-mr-0.5 h-6 w-6 shrink-0 object-contain" />}
              {siteConfig.name}
            </Link>
          </div>
          <NavContent
            pathname={pathname}
            displayName={displayName}
            userEmail={user.email}
            demandeCount={demandeCount}
            reservationCount={reservationCount}
            messageCount={messageCount}
            paymentCount={paymentCount}
            edlCount={edlCount}
            onItemClick={() => setMobileOpen(false)}
            searchModalOpen={searchModalOpen}
            setSearchModalOpen={(open) => {
              setSearchModalOpen(open);
              if (!open) setMobileOpen(false);
            }}
            canAccessOwner={canAccessOwner}
            tourLock={tourLock}
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
            <Link href="/dashboard" className={cn("text-lg font-semibold text-[#213398]", isHydrated && "flex items-center")}>
              {isHydrated && <Image src="/logopleinsdc.png" alt="" width={24} height={24} className="-mr-0.5 h-6 w-6 shrink-0 object-contain" />}
              {siteConfig.name}
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
          demandeCount={demandeCount}
          reservationCount={reservationCount}
          messageCount={messageCount}
          paymentCount={paymentCount}
          edlCount={edlCount}
          collapsed={collapsed}
          searchModalOpen={searchModalOpen}
          setSearchModalOpen={setSearchModalOpen}
          canAccessOwner={canAccessOwner}
          tourLock={false}
        />
      </aside>
    </>
  );
}
