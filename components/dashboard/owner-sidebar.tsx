"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Calendar,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  User,
} from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { SwitchToSeekerView } from "@/components/dashboard/dashboard-view-switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/proprietaire", label: "Tableau de bord", icon: Home },
  { href: "/proprietaire/annonces", label: "Mes annonces", icon: Building2 },
  { href: "/proprietaire/demandes", label: "Demandes reçues", icon: FolderOpen, badgeKey: "demandes" },
  { href: "/proprietaire/visites", label: "Visites", icon: Calendar, badgeKey: "visites" },
  { href: "/proprietaire/messagerie", label: "Messagerie", icon: MessageCircle, badgeKey: "messagerie" },
  { href: "/proprietaire/paiement", label: "Paiement", icon: CreditCard },
  { href: "/proprietaire/contrat", label: "Contrat & facture", icon: FileText },
  { href: "/proprietaire/parametres", label: "Paramètres", icon: Settings },
];

function NavContent({
  pathname,
  displayName,
  userEmail,
  demandeCount,
  visiteCount,
  messageCount,
  collapsed = false,
  onItemClick,
  canAccessSeeker = false,
}: {
  pathname: string;
  displayName: string;
  userEmail?: string | null;
  demandeCount: number;
  visiteCount: number;
  messageCount: number;
  collapsed?: boolean;
  onItemClick?: () => void;
  canAccessSeeker?: boolean;
}) {
  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
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
        {canAccessSeeker && <SwitchToSeekerView collapsed={collapsed} />}
        <div className="my-2 border-t border-slate-100" />
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-[#213398] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-black"
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
                        isActive ? "bg-white/20 text-white" : "bg-[#213398]/20 text-[#1a2980]"
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
              {collapsed && item.badgeKey === "visites" && visiteCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold text-white">
                  {visiteCount > 99 ? "99+" : visiteCount}
                </span>
              )}
              {collapsed && item.badgeKey === "messagerie" && messageCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#213398] px-1 text-[10px] font-semibold text-white">
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

export function OwnerSidebar({
  user,
  demandeCount = 0,
  visiteCount = 0,
  messageCount = 0,
  canAccessSeeker = false,
}: {
  user: { email?: string | null; displayName?: string };
  demandeCount?: number;
  visiteCount?: number;
  messageCount?: number;
  canAccessSeeker?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user.displayName ?? "Utilisateur";

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
        <Link href="/proprietaire" className="text-lg font-semibold text-[#303B4A]">
          {siteConfig.name}
        </Link>
        <div className="w-10" />
      </header>

      {/* Mobile: drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col p-0">
          <div className="flex h-14 items-center border-b border-slate-200 px-4">
            <Link
              href="/proprietaire"
              className="text-lg font-semibold text-[#303B4A]"
              onClick={() => setMobileOpen(false)}
            >
              {siteConfig.name}
            </Link>
          </div>
          <NavContent
            pathname={pathname}
            displayName={displayName}
            userEmail={user.email}
            demandeCount={demandeCount}
            visiteCount={visiteCount}
            messageCount={messageCount}
            onItemClick={() => setMobileOpen(false)}
            canAccessSeeker={canAccessSeeker}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: sidebar avec collapse */}
      <aside
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
            <Link href="/proprietaire" className="text-lg font-semibold text-[#303B4A]">
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
          visiteCount={visiteCount}
          messageCount={messageCount}
          collapsed={collapsed}
          canAccessSeeker={canAccessSeeker}
        />
      </aside>
    </>
  );
}
