"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Receipt,
  Scale,
  Settings,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { SwitchToSeekerView } from "@/components/dashboard/dashboard-view-switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type OwnerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: string;
};

/** Ordre = ordre d’affichage à l’intérieur de chaque section (filtrage par `navSections`). */
const ownerNavItems: OwnerNavItem[] = [
  { href: "/proprietaire", label: "Tableau de bord", icon: Home },
  { href: "/proprietaire/annonces", label: "Mes annonces", icon: LayoutGrid },
  { href: "/proprietaire/demandes", label: "Demandes", icon: FileText, badgeKey: "demandes" },
  { href: "/proprietaire/reservations", label: "Réservations", icon: CalendarCheck, badgeKey: "reservations" },
  { href: "/proprietaire/visites", label: "Calendrier", icon: Calendar, badgeKey: "visites" },
  { href: "/proprietaire/logistique", label: "Livraisons & retraits", icon: Truck },
  { href: "/proprietaire/etats-des-lieux", label: "État du matériel", icon: ClipboardCheck, badgeKey: "etats" },
  { href: "/proprietaire/cautions", label: "Cautions", icon: Wallet, badgeKey: "cautions" },
  { href: "/proprietaire/litiges", label: "Litiges", icon: Scale },
  { href: "/proprietaire/messagerie", label: "Messagerie", icon: MessageCircle, badgeKey: "messagerie" },
  { href: "/proprietaire/paiement", label: "Paiements", icon: CreditCard, badgeKey: "paiement" },
  { href: "/proprietaire/contrat", label: "Factures", icon: Receipt, badgeKey: "contrat" },
  { href: "/proprietaire/parametres", label: "Paramètres", icon: Settings },
];

const ownerNavSections: { title: string; itemHrefs: string[] }[] = [
  { title: "Vue d'ensemble", itemHrefs: ["/proprietaire", "/proprietaire/annonces"] },
  {
    title: "Demandes & réservations",
    itemHrefs: ["/proprietaire/demandes", "/proprietaire/reservations", "/proprietaire/visites"],
  },
  {
    title: "Logistique & suivi",
    itemHrefs: [
      "/proprietaire/logistique",
      "/proprietaire/etats-des-lieux",
      "/proprietaire/cautions",
      "/proprietaire/litiges",
    ],
  },
  { title: "Communication", itemHrefs: ["/proprietaire/messagerie"] },
  { title: "Finances & documents", itemHrefs: ["/proprietaire/paiement", "/proprietaire/contrat"] },
  { title: "Compte", itemHrefs: ["/proprietaire/parametres"] },
];

const OWNER_ROOT = "/proprietaire";

function isOwnerNavActive(pathname: string, href: string): boolean {
  if (href === OWNER_ROOT) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const OWNER_BADGE_STORAGE_KEY = "owner_nav_seen_badges_v1";

function NavContent({
  pathname,
  displayName,
  userEmail,
  demandeCount,
  visiteCount,
  reservationCount,
  messageCount,
  paymentCount,
  edlCount,
  cautionCount,
  contractCount,
  collapsed = false,
  onItemClick,
  canAccessSeeker = false,
  tourLock = false,
}: {
  pathname: string;
  displayName: string;
  userEmail?: string | null;
  demandeCount: number;
  visiteCount: number;
  reservationCount: number;
  messageCount: number;
  paymentCount: number;
  edlCount: number;
  cautionCount: number;
  contractCount: number;
  collapsed?: boolean;
  onItemClick?: () => void;
  canAccessSeeker?: boolean;
  tourLock?: boolean;
}) {
  const [seenByKey, setSeenByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(OWNER_BADGE_STORAGE_KEY);
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
      window.localStorage.setItem(OWNER_BADGE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const unreadFor = (badgeKey: string, rawValue: number) => {
    const seen = seenByKey[badgeKey] ?? 0;
    return Math.max(rawValue - seen, 0);
  };

  const unreadDemandeCount = unreadFor("demandes", demandeCount);
  const unreadVisiteCount = unreadFor("visites", visiteCount);
  const unreadReservationCount = unreadFor("reservations", reservationCount);
  const unreadMessageCount = unreadFor("messagerie", messageCount);
  const unreadPaymentCount = unreadFor("paiement", paymentCount);
  const unreadEdlCount = unreadFor("etats", edlCount);
  const unreadCautionCount = unreadFor("cautions", cautionCount);
  const unreadContractCount = unreadFor("contrat", contractCount);

  const getDisplayCount = (badgeKey: string | undefined, active: boolean) => {
    if (active) return 0;
    switch (badgeKey) {
      case "demandes": return unreadDemandeCount;
      case "visites": return unreadVisiteCount;
      case "reservations": return unreadReservationCount;
      case "messagerie": return unreadMessageCount;
      case "paiement": return unreadPaymentCount;
      case "etats": return unreadEdlCount;
      case "cautions": return unreadCautionCount;
      case "contrat": return unreadContractCount;
      default: return 0;
    }
  };

  useEffect(() => {
    const activeItem = ownerNavItems.find((item) => isOwnerNavActive(pathname, item.href) && item.badgeKey);
    if (!activeItem?.badgeKey) return;
    const rawValue =
      activeItem.badgeKey === "demandes"
        ? demandeCount
        : activeItem.badgeKey === "visites"
          ? visiteCount
          : activeItem.badgeKey === "reservations"
            ? reservationCount
            : activeItem.badgeKey === "messagerie"
              ? messageCount
              : activeItem.badgeKey === "paiement"
                ? paymentCount
                : activeItem.badgeKey === "etats"
                  ? edlCount
                  : activeItem.badgeKey === "cautions"
                    ? cautionCount
                    : activeItem.badgeKey === "contrat"
                      ? contractCount
                      : 0;
    markSeen(activeItem.badgeKey, rawValue);
  }, [pathname, demandeCount, visiteCount, reservationCount, messageCount, paymentCount, edlCount, cautionCount, contractCount]);

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
            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            collapsed ? "justify-center px-2" : "",
            "text-slate-600 hover:bg-slate-100 hover:text-black"
          )}
          title={collapsed ? "Revenir à l'accueil" : undefined}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="flex-1 truncate">Revenir à l&apos;accueil</span>}
        </Link>
        {canAccessSeeker && !tourLock && <SwitchToSeekerView collapsed={collapsed} />}
        <div className="my-2 border-t border-slate-100" />
        {ownerNavSections.map((section) => {
          const sectionItems = ownerNavItems.filter((item) => section.itemHrefs.includes(item.href));
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.title} className="mt-1 first:mt-0">
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </p>
              )}
              {sectionItems.map((item) => {
                const isActive = isOwnerNavActive(pathname, item.href);
                const Icon = item.icon;
                const displayCount = getDisplayCount(item.badgeKey, isActive);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour-nav={item.href}
                    onClick={() => {
                      if (item.badgeKey) {
                        const rawValue =
                          item.badgeKey === "demandes"
                            ? demandeCount
                            : item.badgeKey === "visites"
                              ? visiteCount
                              : item.badgeKey === "reservations"
                                ? reservationCount
                                : item.badgeKey === "messagerie"
                                  ? messageCount
                                  : item.badgeKey === "paiement"
                                    ? paymentCount
                                    : item.badgeKey === "etats"
                                      ? edlCount
                                      : item.badgeKey === "cautions"
                                        ? cautionCount
                                        : item.badgeKey === "contrat"
                                          ? contractCount
                                          : 0;
                        markSeen(item.badgeKey, rawValue);
                      }
                      onItemClick?.();
                    }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-2" : "",
                      isActive
                        ? "bg-gs-orange text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-black"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badgeKey === "demandes" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "visites" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "reservations" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "messagerie" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "paiement" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "etats" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "cautions" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                        {item.badgeKey === "contrat" && displayCount > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"
                      )}
                    >
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badgeKey === "demandes" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "visites" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "messagerie" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "paiement" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "reservations" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "etats" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "cautions" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                    {collapsed && item.badgeKey === "contrat" && displayCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      {!tourLock && (
        <div className="border-t border-slate-200 p-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg bg-slate-50 p-3",
              collapsed && "justify-center px-0"
            )}
          >
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

export function OwnerSidebar({
  user,
  demandeCount = 0,
  visiteCount = 0,
  reservationCount = 0,
  messageCount = 0,
  paymentCount = 0,
  edlCount = 0,
  cautionCount = 0,
  contractCount = 0,
  canAccessSeeker = false,
}: {
  user: { email?: string | null; displayName?: string };
  demandeCount?: number;
  visiteCount?: number;
  reservationCount?: number;
  messageCount?: number;
  paymentCount?: number;
  edlCount?: number;
  cautionCount?: number;
  contractCount?: number;
  canAccessSeeker?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourLock, setTourLock] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const displayName = user.displayName ?? "Utilisateur";
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const onTourSidebarToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ dashboard?: "seeker" | "owner"; open?: boolean }>;
      if (customEvent.detail?.dashboard !== "owner") return;
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
        <Link
          href="/proprietaire"
          className={cn("font-landing-logo-mark flex items-center gap-1.5 text-lg text-gs-orange")}
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
          data-tour-sidebar-mobile="owner"
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
              href="/proprietaire"
              className="font-landing-logo-mark flex items-center gap-1.5 text-lg text-gs-orange"
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
              {siteConfig.name.toUpperCase()}
            </Link>
          </div>
          <NavContent
            pathname={pathname}
            displayName={displayName}
            userEmail={user.email}
            demandeCount={demandeCount}
            visiteCount={visiteCount}
            reservationCount={reservationCount}
            messageCount={messageCount}
            paymentCount={paymentCount}
            edlCount={edlCount}
            cautionCount={cautionCount}
            contractCount={contractCount}
            onItemClick={() => setMobileOpen(false)}
            canAccessSeeker={canAccessSeeker}
            tourLock={tourLock}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: sidebar avec collapse */}
      <aside
        data-tour-sidebar-desktop="owner"
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex",
          collapsed ? "h-screen w-20" : "h-screen w-64"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-slate-200",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed && (
            <Link href="/proprietaire" className="font-landing-logo-mark flex items-center gap-1.5 text-lg text-gs-orange">
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
          demandeCount={demandeCount}
          visiteCount={visiteCount}
          reservationCount={reservationCount}
          messageCount={messageCount}
          paymentCount={paymentCount}
          edlCount={edlCount}
          cautionCount={cautionCount}
          contractCount={contractCount}
          collapsed={collapsed}
          canAccessSeeker={canAccessSeeker}
          tourLock={false}
        />
      </aside>
    </>
  );
}
