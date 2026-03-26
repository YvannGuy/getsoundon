"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ListingImage = {
  id: string;
  url: string;
  position: number;
  is_cover: boolean;
};

type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: "sound" | "dj" | "lighting" | "services";
  price_per_day: number;
  location: string;
  rating_avg: number;
  rating_count: number;
  images: ListingImage[];
};

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const listingId = params?.id;
  const [listing, setListing] = useState<Listing | null>(null);
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
        const json = (await res.json()) as { data?: Listing; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Impossible de charger le listing.");
        }
        if (!cancelled) {
          setListing(json.data ?? null);
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("bookingPaid") === "1") {
      const bid = params.get("bookingId");
      setBookingFeedback(
        bid
          ? `Paiement reussi pour la reservation ${bid}. Statut mis a jour.`
          : "Paiement reussi. Statut de la reservation mis a jour."
      );
      window.history.replaceState({}, "", `/items/${listingId}`);
    }
    if (params.get("bookingCancel") === "1") {
      setBookingFeedback("Paiement annule. Tu peux relancer le checkout quand tu veux.");
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

  const estimatedTotal = useMemo(() => {
    if (!listing || estimatedDays <= 0) return 0;
    return Number((listing.price_per_day * estimatedDays).toFixed(2));
  }, [estimatedDays, listing]);

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
        throw new Error(json.error ?? "Booking impossible.");
      }
      const bookingId = json.data?.id ?? null;
      setLastBookingId(bookingId);
      setBookingFeedback(
        bookingId
          ? `Reservation creee. Tu peux payer en ligne ou ouvrir la messagerie.`
          : "Reservation creee."
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
        throw new Error(json.error ?? "Impossible de demarrer le paiement.");
      }
      window.location.href = json.url;
    } catch (err) {
      setBookingFeedback(err instanceof Error ? err.message : "Erreur paiement.");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <main className="container max-w-4xl py-10">
      <Link href="/items" className="text-sm text-slate-600 hover:underline">
        Retour a la marketplace
      </Link>

      {loading ? <p className="mt-4 text-sm text-slate-500">Chargement...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {listing ? (
        <section className="mt-4 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{listing.category}</p>
            <h1 className="mt-1 text-2xl font-bold text-black">{listing.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{listing.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-black">{listing.price_per_day.toFixed(2)} EUR / jour</span>
              <span className="text-slate-500">{listing.location}</span>
              <span className="text-slate-500">
                Note: {listing.rating_avg?.toFixed(1) ?? "0.0"} ({listing.rating_count ?? 0})
              </span>
            </div>
            {listing.images?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {listing.images.map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt=""
                    className="h-44 w-full rounded-lg border border-slate-200 object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-black">Reserver ce listing</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-600">Date debut</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-600">Date fin</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-600">Caution (EUR)</span>
                <input
                  type="number"
                  min={0}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
              <p>Jours: {estimatedDays > 0 ? estimatedDays : "-"}</p>
              <p className="font-medium text-black">Total estime: {estimatedTotal.toFixed(2)} EUR</p>
            </div>

            <button
              type="button"
              onClick={submitBooking}
              disabled={bookingLoading || !startDate || !endDate}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-gs-orange px-4 text-sm font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bookingLoading ? "Creation..." : "Creer une reservation"}
            </button>
            {lastBookingId ? (
              <button
                type="button"
                onClick={payBooking}
                disabled={payLoading}
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-gs-orange bg-white px-4 text-sm font-medium text-gs-orange hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payLoading ? "Redirection..." : "Payer avec Stripe"}
              </button>
            ) : null}
            {bookingFeedback ? <p className="mt-3 text-sm text-slate-700">{bookingFeedback}</p> : null}
            <Link href="/customer/messages" className="mt-3 inline-block text-xs text-gs-orange hover:underline">
              Ouvrir la messagerie (polling)
            </Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
