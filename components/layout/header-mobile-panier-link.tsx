"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { GUEST_CART_CHANGED_EVENT, readGuestCartFromStorage } from "@/lib/guest-cart";

type Props = {
  isAuthenticated: boolean;
  serverUnits: number;
  onNavigate?: () => void;
  /** Classes du lien (landing vs menu site). */
  className?: string;
};

export function HeaderMobilePanierLink({
  isAuthenticated,
  serverUnits,
  onNavigate,
  className,
}: Props) {
  const [guestUnits, setGuestUnits] = useState(0);

  useEffect(() => {
    if (isAuthenticated) return;
    const sync = () => {
      const c = readGuestCartFromStorage();
      let u = 0;
      for (const l of c?.lines ?? []) u += Math.max(0, Math.floor(l.quantity));
      setGuestUnits(u);
    };
    sync();
    window.addEventListener(GUEST_CART_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GUEST_CART_CHANGED_EVENT, sync);
  }, [isAuthenticated]);

  const units = isAuthenticated ? serverUnits : guestUnits;

  return (
    <Link
      href="/panier"
      onClick={onNavigate}
      className={
        className ??
        "font-landing-nav flex items-center justify-between border-b border-gs-line px-4 py-5 text-base text-gs-dark"
      }
    >
      <span className="flex items-center gap-3">
        <ShoppingCart className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
        Panier
      </span>
      {units > 0 ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gs-orange px-2 text-xs font-bold text-white">
          {units > 99 ? "99+" : units}
        </span>
      ) : null}
    </Link>
  );
}
