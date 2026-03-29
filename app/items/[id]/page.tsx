"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ListingDetailPremiumView,
  type ListingDetailModel,
} from "@/components/items/listing-detail-premium-view";

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const listingId = params?.id;
  const [listing, setListing] = useState<ListingDetailModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings/${listingId}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: ListingDetailModel; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Impossible de charger le listing.");
        }
        if (!json.data) {
          throw new Error("Cette annonce n’existe pas ou n’est plus disponible.");
        }
        if (!cancelled) {
          setListing(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur inattendue.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

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

  const submitBooking = async () => {
    if (!listing) return;
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
          depositAmount: Number(depositAmount || "0"),
        }),
      });
      const json = (await res.json()) as { data?: { id: string }; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Réservation impossible.");
      }
      const bookingId = json.data?.id ?? null;
      setLastBookingId(bookingId);
      setBookingFeedback(
        bookingId
          ? "Réservation créée. Tu peux payer en ligne ou ouvrir la messagerie."
          : "Réservation créée."
      );
    } catch (err) {
      setBookingFeedback(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBookingLoading(false);
    }
  };

  const payBooking = async () => {
    if (!lastBookingId) return;
    setPayLoading(true);
    setBookingFeedback(null);
    try {
      const res = await fetch("/api/stripe/checkout-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: lastBookingId }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Impossible de démarrer le paiement.");
      }
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
      onReserve={submitBooking}
      onPay={payBooking}
      estimatedDays={estimatedDays}
    />
  );
}
