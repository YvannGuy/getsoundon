"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, ShoppingCart } from "lucide-react";

import { clearGsDraftCartAction } from "@/app/actions/gs-orders";
import {
  GUEST_CART_CHANGED_EVENT,
  clearGuestCartStorage,
  guestCartToDraftPreview,
  readGuestCartFromStorage,
} from "@/lib/guest-cart";
import type { DraftCartPreview } from "@/lib/gs-draft-cart-preview";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function emptyPreview(): DraftCartPreview {
  return {
    orderId: "empty",
    providerLabel: null,
    locationTotalEur: 0,
    lines: [],
    units: 0,
  };
}

type Props = {
  /** Panier serveur (connecté locataire). */
  serverPreview: DraftCartPreview | null;
  isAuthenticated: boolean;
  className?: string;
};

export function HeaderCartDropdown({ serverPreview, isAuthenticated, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [clearError, setClearError] = useState<string | null>(null);
  const [guestTick, setGuestTick] = useState(0);

  useEffect(() => {
    if (isAuthenticated) return;
    const onChange = () => setGuestTick((t) => t + 1);
    window.addEventListener(GUEST_CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(GUEST_CART_CHANGED_EVENT, onChange);
  }, [isAuthenticated]);

  const preview = useMemo((): DraftCartPreview => {
    if (isAuthenticated) {
      return serverPreview && (serverPreview.units > 0 || serverPreview.lines.length > 0)
        ? serverPreview
        : emptyPreview();
    }
    const cart = readGuestCartFromStorage();
    if (!cart || cart.lines.length === 0) return emptyPreview();
    return guestCartToDraftPreview(cart) ?? emptyPreview();
  }, [isAuthenticated, serverPreview, guestTick]);

  const units = preview.units;
  const hasLines = preview.lines.length > 0;

  const clearCart = () => {
    setClearError(null);
    if (!isAuthenticated) {
      clearGuestCartStorage();
      setOpen(false);
      router.refresh();
      return;
    }
    startTransition(async () => {
      const res = await clearGsDraftCartAction();
      if (!res.ok) {
        setClearError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 hover:text-black",
            className
          )}
          aria-label="Panier"
        >
          <ShoppingCart className="h-5 w-5" />
          {units > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gs-orange px-1 text-[10px] font-bold text-white">
              {units > 99 ? "99+" : units}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,20rem)] p-0 shadow-lg">
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">Panier</p>
          {!isAuthenticated && hasLines ? (
            <p className="mt-0.5 text-xs text-amber-800">
              Connecte-toi sur la page panier pour régler ta commande.
            </p>
          ) : null}
          {hasLines && preview.providerLabel ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Prestataire : <span className="font-medium text-slate-700">{preview.providerLabel}</span>
            </p>
          ) : null}
        </div>

        {!hasLines ? (
          <div className="px-3 py-6 text-center text-sm text-slate-600">Ton panier est vide.</div>
        ) : (
          <ul className="max-h-52 space-y-0 divide-y divide-slate-100 overflow-y-auto">
            {preview.lines.map((line) => (
              <li key={line.id} className="flex gap-2 px-3 py-2">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {line.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URLs catalogue variées
                    <img src={line.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium text-slate-900">{line.title_snapshot}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Qté {line.quantity} · {line.line_total_eur.toFixed(2)} €
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasLines ? (
          <div className="border-t border-slate-100 px-3 py-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Sous-total location</span>
              <span className="font-semibold text-slate-900">
                {preview.locationTotalEur.toFixed(2)} €
              </span>
            </div>
          </div>
        ) : null}

        {clearError ? (
          <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{clearError}</p>
        ) : null}

        <div className="flex flex-col gap-1.5 border-t border-slate-100 p-2">
          <Link
            href="/panier"
            onClick={() => setOpen(false)}
            className="flex h-9 items-center justify-center rounded-md bg-gs-orange text-sm font-semibold text-white transition hover:brightness-105"
          >
            Voir le panier
          </Link>
          <Link
            href="/items"
            onClick={() => setOpen(false)}
            className="flex h-9 items-center justify-center rounded-md text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Continuer les achats
          </Link>
          {hasLines ? (
            <button
              type="button"
              disabled={pending}
              onClick={clearCart}
              className="flex h-9 items-center justify-center rounded-md text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vider le panier"}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
