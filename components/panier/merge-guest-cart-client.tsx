"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { mergeGuestCartAction } from "@/app/actions/gs-orders";
import { clearGuestCartStorage, readGuestCartFromStorage } from "@/lib/guest-cart";

/**
 * Après retour auth avec `?mergeGuest=1`, fusionne le panier localStorage dans le brouillon serveur.
 */
export function MergeGuestCartClient({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;

    const cart = readGuestCartFromStorage();
    if (!cart?.lines.length) {
      router.replace("/panier");
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await mergeGuestCartAction(cart);
      if (cancelled) return;
      if (res.ok) {
        clearGuestCartStorage();
      }
      router.replace("/panier");
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, router]);

  return null;
}
