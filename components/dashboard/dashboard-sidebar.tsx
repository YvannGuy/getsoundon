"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CreditCard, FileText, Heart, Home, Menu, MessageCircle, Search, Settings, User } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/dashboard/rechercher", label: "Rechercher une salle", icon: Search },
  { href: "/dashboard/demandes", label: "Mes demandes", icon: FileText, badge: 5 },
  { href: "/dashboard/paiement", label: "Paiement", icon: CreditCard },
  { href: "/dashboard/messagerie", label: "Messagerie", icon: MessageCircle, badge: 2 },
  { href: "/dashboard/favoris", label: "Favoris", icon: Heart },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

function NavContent({
  pathname,
  displayName,
  userEmail,
  onItemClick,
}: {
  pathname: string;
  displayName: string;
  userEmail?: string | null;
  onItemClick?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#6366f1] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span
                  className={cn(
                    "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-white">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </div>
        </div>
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="w-full text-left text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </>
  );
}

export function DashboardSidebar({
  user,
}: {
  user: { email?: string | null; displayName?: string };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user.displayName ?? "Utilisateur";

  return (
    <>
      {/* Mobile: header avec menu hamburger */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Link href="/dashboard" className="text-lg font-semibold text-[#303B4A]">
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
            onItemClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: sidebar fixe */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-14 items-center px-6">
          <Link href="/dashboard" className="text-lg font-semibold text-[#303B4A]">
            {siteConfig.name}
          </Link>
        </div>
        <NavContent pathname={pathname} displayName={displayName} userEmail={user.email} />
      </aside>
    </>
  );
}
