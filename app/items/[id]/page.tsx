"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { addToGsCartAction, clearGsDraftCartAction } from "@/app/actions/gs-orders";
import { createClient } from "@/lib/supabase/client";
import { addLineToGuestCart, clearGuestCartStorage } from "@/lib/guest-cart";
import {
  ListingDetailPremiumView,
  type ListingDetailModel,
} from "@/components/items/listing-detail-premium-view";

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const listingId = params?.id;
  const [listing, setListing] = useState<ListingDetailModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);
  const [cartProviderMismatch, setCartProviderMismatch] = useState(false);
  const [cartClearLoading, setCartClearLoading] = useState(false);

  // Charger l'annonce
  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings/${listingId}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: ListingDetailModel; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Impossible de charger le listing.");
        if (!json.data) throw new Error("Cette annonce n'existe pas ou n'est plus disponible.");
        if (!cancelled) setListing(json.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inattendue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [listingId]);

  // Récupération sessionStorage : booking créé mais checkout non finalisé
  useEffect(() => {
    if (!listingId) return;
    try {
      const pending = sessionStorage.getItem(`gs_pending_booking_${listingId}`);
      if (pending) setLastBookingId(pending);
    } catch {}
  }, [listingId]);

  // Gestion des query params de retour Stripe
  useEffect(() => {
    if (typeof window === "undefined" || !listingId) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("bookingPaid") === "1") {
      const bid = sp.get("bookingId");
      setBookingFeedback(
        bid
          ? `Paiement réussi pour la réservation ${bid}. Statut mis à jour.`
          : "Paiement réussi. Statut de la réservation mis à jour."
      );
      window.history.replaceState({}, "", `/items/${listingId}`);
    }
    if (sp.get("bookingCancel") === "1") {
      setBookingFeedback("Paiement annulé. Tu peux relancer le checkout quand tu veux.");
      window.history.replaceState({}, "", `/items/${listingId}`);
    }
  }, [listingId]);

  const estimatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [endDate, startDate]);

  // Flow instant booking : création du booking + checkout enchaîné en un seul geste
  const reserveInstant = async () => {
    if (!listing || listing.is_active === false) return;
    setBookingLoading(true);
    setPayLoading(false);
    setBookingFeedback(null);
    let bookingId: string | null = null;

    try {
      // Étape 1 — Créer la gs_booking
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          startDate,
          endDate,
        }),
      });
      const bookingJson = (await bookingRes.json()) as { data?: { id: string }; error?: string };
      if (!bookingRes.ok) throw new Error(bookingJson.error ?? "Réservation impossible.");
      bookingId = bookingJson.data?.id ?? null;
      if (!bookingId) throw new Error("Réservation créée mais identifiant manquant.");

      // Persistance pour reprendre si le tab se ferme avant le redirect
      try { sessionStorage.setItem(`gs_pending_booking_${listing.id}`, bookingId); } catch {}
      setLastBookingId(bookingId);

      // Étape 2 — Checkout Stripe
      setBookingLoading(false);
      setPayLoading(true);
      const payRes = await fetch("/api/stripe/checkout-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const payJson = (await payRes.json()) as { url?: string; error?: string };
      if (!payRes.ok || !payJson.url) throw new Error(payJson.error ?? "Impossible de démarrer le paiement.");

      window.location.href = payJson.url;
      // La page redirect — rien après cette ligne n'est exécuté en cas de succès
    } catch (err) {
      setBookingLoading(false);
      setPayLoading(false);
      setBookingFeedback(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  };

  // Flow demande standard (non-instant) : création booking seulement
  const submitRequest = async () => {
    if (!listing || listing.is_active === false) return;
    setBookingLoading(true);
    setBookingFeedback(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          startDate,
          endDate,
        }),
      });
      const json = (await res.json()) as { data?: { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Réservation impossible.");
      const bookingId = json.data?.id ?? null;
      setLastBookingId(bookingId);
      setBookingFeedback(
        "Demande envoyée au prestataire. Tu recevras une réponse sous peu."
      );
    } catch (err) {
      setBookingFeedback(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Retry checkout si le booking est créé mais la redirection a échoué
  const addToCart = async (quantity: number) => {
    if (!listing || listing.is_active === false) return;
    setCartLoading(true);
    setCartFeedback(null);
    setCartProviderMismatch(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const res = await addToGsCartAction({
          listingId: listing.id,
          startDate,
          endDate,
          quantity,
        });
        if (!res.ok) {
          if (res.code === "PROVIDER_MISMATCH") {
            setCartProviderMismatch(true);
          }
          setCartFeedback(res.error);
          return;
        }
        setCartFeedback("Ajouté au panier. Tu peux continuer tes achats ou ouvrir le panier.");
        router.refresh();
        return;
      }

      const ownerId = listing.owner_id;
      if (!ownerId) {
        setCartFeedback("Impossible d’ajouter au panier : prestataire introuvable.");
        return;
      }
      const coverUrl =
        listing.images?.find((i) => i.is_cover)?.url ?? listing.images?.[0]?.url ?? null;
      const res = addLineToGuestCart({
        listing: {
          id: listing.id,
          owner_id: ownerId,
          title: listing.title,
          price_per_day: listing.price_per_day,
          deposit_amount: listing.deposit_amount,
          cover_url: coverUrl,
          owner_display_name: listing.owner_display_name ?? null,
        },
        startDate,
        endDate,
        quantity,
      });
      if (!res.ok) {
        if (res.code === "PROVIDER_MISMATCH") {
          setCartProviderMismatch(true);
        }
        setCartFeedback(res.error);
        return;
      }
      setCartFeedback("Ajouté au panier. Connecte-toi sur la page panier pour régler.");
      router.refresh();
    } finally {
      setCartLoading(false);
    }
  };

  const clearCartAndRetryHint = async () => {
    setCartClearLoading(true);
    setCartFeedback(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        clearGuestCartStorage();
        setCartProviderMismatch(false);
        setCartFeedback("Panier vidé. Tu peux ajouter à nouveau cet article.");
        router.refresh();
        return;
      }

      const res = await clearGsDraftCartAction();
      if (!res.ok) {
        setCartFeedback(res.error);
        return;
      }
      setCartProviderMismatch(false);
      setCartFeedback("Panier vidé. Tu peux ajouter à nouveau cet article.");
      router.refresh();
    } finally {
      setCartClearLoading(false);
    }
  };

  const retryCheckout = async () => {
    if (!lastBookingId || listing?.is_active === false) return;
    setPayLoading(true);
    setBookingFeedback(null);
    try {
      const res = await fetch("/api/stripe/checkout-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: lastBookingId }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Impossible de démarrer le paiement.");
      window.location.href = json.url;
    } catch (err) {
      setBookingFeedback(err instanceof Error ? err.message : "Erreur paiement.");
    } finally {
      setPayLoading(false);
    }
  };

  if (!listingId) {
    return (
      <div className="landing-container py-10">
        <p className="text-sm text-[#666]">Annonce introuvable.</p>
      </div>
    );
  }

  const isInstantBooking = listing?.can_accept_instant_booking === true;

  return (
    <ListingDetailPremiumView
      listing={listing}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      setStartDate={setStartDate}
      setEndDate={setEndDate}
      bookingLoading={bookingLoading}
      bookingFeedback={bookingFeedback}
      lastBookingId={lastBookingId}
      payLoading={payLoading}
      onReserve={isInstantBooking ? reserveInstant : submitRequest}
      onPay={retryCheckout}
      estimatedDays={estimatedDays}
      cartLoading={cartLoading}
      cartFeedback={cartFeedback}
      onAddToCart={addToCart}
      cartProviderMismatch={cartProviderMismatch}
      cartClearLoading={cartClearLoading}
      onClearCartMismatch={clearCartAndRetryHint}
    />
  );
}
