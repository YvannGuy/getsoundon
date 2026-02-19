"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, Heart, Home, MessageCircle, Search, Settings, User } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/dashboard/rechercher", label: "Rechercher une salle", icon: Search },
  { href: "/dashboard/demandes", label: "Mes demandes", icon: FileText, badge: 5 },
  { href: "/dashboard/paiement", label: "Paiement", icon: CreditCard },
  { href: "/dashboard/messagerie", label: "Messagerie", icon: MessageCircle, badge: 2 },
  { href: "/dashboard/favoris", label: "Favoris", icon: Heart },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

export function DashboardSidebar({
  user,
}: {
  user: { email?: string | null; displayName?: string };
}) {
  const pathname = usePathname();
  const displayName = user.displayName ?? "Utilisateur";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center px-6">
        <Link href="/dashboard" className="text-lg font-semibold text-[#303B4A]">
          {siteConfig.name}
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
            <p className="truncate text-xs text-slate-500">{user.email}</p>
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
    </aside>
  );
}
