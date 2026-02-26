"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Camera, ChevronLeft, ChevronRight, CreditCard, FileText, Heart, Home, LogOut, Menu, MessageCircle, Search, Settings, User } from "lucide-react";

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
  { href: "/dashboard/etats-des-lieux", label: "États des lieux", icon: Camera, badgeKey: "etats" },
  { href: "/dashboard/messagerie", label: "Messagerie", icon: MessageCircle, badgeKey: "messagerie" },
  { href: "/dashboard/favoris", label: "Favoris", icon: Heart },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

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
}) {
  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
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
        {canAccessOwner && <SwitchToOwnerView collapsed={collapsed} />}
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
          const badgeVal =
            item.badgeKey === "demandes"
              ? demandeCount
              : item.badgeKey === "reservations"
                ? reservationCount
              : item.badgeKey === "messagerie"
                ? messageCount
                : item.badgeKey === "paiement"
                  ? paymentCount
                  : item.badgeKey === "etats"
                    ? edlCount
                  : null;
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
                onClick={() => setSearchModalOpen(true)}
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
              onClick={onItemClick}
              className={navClassName}
              title={collapsed ? item.label : undefined}
            >
              {content}
            </Link>
          );
        })}
      </nav>
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
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const displayName = user.displayName ?? "Utilisateur";
  useEffect(() => {
    setIsHydrated(true);
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
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col p-0">
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
          />
        </SheetContent>
      </Sheet>

      <SearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />

      {/* Desktop: sidebar retractable sticky */}
      <aside
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
        />
      </aside>
    </>
  );
}
