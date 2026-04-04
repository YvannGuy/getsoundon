"use client";

import Image from "next/image";
import Link from "next/link";
import { format, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import {
  Briefcase,
  Cable,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Plug,
  Star,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

import { ListingZoneMapCard } from "@/components/items/listing-zone-map-card";
import {
  cancellationPolicyLegalNoteShort,
  getCancellationPolicyLabel,
  getCancellationPolicySummaryLines,
} from "@/lib/gs-cancellation-policy-ui";
import { computeGsBookingCheckoutTotals } from "@/lib/gs-booking-platform-fee";
import { DEMO_PROVIDER_SLUG } from "@/lib/provider-storefront-demo";
import { cn } from "@/lib/utils";

export type ListingDetailImage = {
  id: string;
  url: string;
  position: number;
  is_cover: boolean;
};

export type ListingDetailModel = {
  id: string;
  /** Prestataire catalogue (panier mono-prestataire). */
  owner_id?: string;
  owner_display_name?: string | null;
  title: string;
  description: string;
  category: "sound" | "dj" | "lighting" | "services";
  price_per_day: number;
  /** false = annonce désactivée ; réservation impossible (aligné POST /api/bookings). */
  is_active?: boolean | null;
  /** Caution configurée par le prestataire (en euros). 0 ou null = pas de caution. */
  deposit_amount?: number | null;
  location: string;
  rating_avg: number;
  rating_count: number;
  images: ListingDetailImage[];
  /** Slug public `/boutique/[slug]` — si absent, repli démo SoundElite. */
  owner_boutique_slug?: string | null;
  /** true = le listing est configuré pour la réservation directe. */
  immediate_confirmation?: boolean;
  /** true = immediate_confirmation ET compte Stripe Connect du prestataire actif. */
  can_accept_instant_booking?: boolean;
  /** Politique stockée (`flexible` | `moderate` | `strict`). */
  cancellation_policy?: string | null;
  /** Zone affichée (ex. Montreuil (93)) — pas d’adresse précise. */
  zone_label?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const CATEGORY_UI: Record<
  ListingDetailModel["category"],
  { breadcrumb: string; badge: string }
> = {
  sound: { breadcrumb: "Sono", badge: "SONO" },
  dj: { breadcrumb: "DJ", badge: "CONTRÔLEUR DJ" },
  lighting: { breadcrumb: "Lumière", badge: "LUMIÈRE" },
  services: { breadcrumb: "Services", badge: "SERVICES" },
};

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80&auto=format&fit=crop";

const SPECS_DJ: { k: string; v: string; highlight?: boolean }[] = [
  { k: "Marque", v: "Pioneer DJ" },
  { k: "Modèle", v: "XDJ-RX3" },
  { k: "Voies", v: "2 Canaux" },
  { k: "Écran", v: "10.1 pouces tactile" },
  { k: "État", v: "Excellent état", highlight: true },
  { k: "Logiciels", v: "Rekordbox / Serato" },
];

function specsForCategory(
  category: ListingDetailModel["category"],
  title: string
): { k: string; v: string; highlight?: boolean }[] {
  if (category === "dj") return SPECS_DJ;
  const t = title.toLowerCase();
  if (category === "sound") {
    return [
      { k: "Type", v: t.includes("micro") ? "Microphone" : "Enceinte / sono" },
      { k: "Référence", v: title.slice(0, 40) },
      { k: "État", v: "Excellent état", highlight: true },
      { k: "Puissance", v: "Selon fiche technique" },
      { k: "Connectique", v: "XLR / Jack selon modèle" },
      { k: "Accessoires", v: "Sur demande" },
    ];
  }
  if (category === "lighting") {
    return [
      { k: "Type", v: "Éclairage scène / LED" },
      { k: "Référence", v: title.slice(0, 40) },
      { k: "État", v: "Excellent état", highlight: true },
      { k: "Contrôle", v: "DMX / autonome" },
      { k: "Alimentation", v: "Secteur" },
      { k: "Montage", v: "Pieds / suspension selon lot" },
    ];
  }
  return [
    { k: "Type", v: "Prestation / matériel" },
    { k: "Référence", v: title.slice(0, 40) },
    { k: "État", v: "Excellent état", highlight: true },
    { k: "Zone", v: "Île-de-France" },
    { k: "Options", v: "Livraison & installation" },
    { k: "Logiciel", v: "Sur devis" },
  ];
}

const OPTION_DELIVERY = 35;
const OPTION_INSTALL = 120;
const OPTION_TECH = 150;

type ToggleRowProps = {
  label: string;
  priceNote: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({ label, priceNote, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gs-line py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gs-dark">
          {label}{" "}
          <span className="font-normal text-[#666]">{priceNote}</span>
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-gs-orange" : "bg-[#ddd]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked ? "left-[calc(100%-1.625rem)]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

type ListingDetailPremiumViewProps = {
  listing: ListingDetailModel | null;
  loading: boolean;
  error: string | null;
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  bookingLoading: boolean;
  bookingFeedback: string | null;
  lastBookingId: string | null;
  payLoading: boolean;
  onReserve: () => void;
  onPay: () => void;
  estimatedDays: number;
  /** Panier mono-prestataire (optionnel) : ajoute la ligne avec la quantité sélectionnée dans le bloc réservation. */
  cartLoading?: boolean;
  cartFeedback?: string | null;
  onAddToCart?: (quantity: number) => void;
  cartProviderMismatch?: boolean;
  cartClearLoading?: boolean;
  onClearCartMismatch?: () => void;
};

export function ListingDetailPremiumView({
  listing,
  loading,
  error,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  bookingLoading,
  bookingFeedback,
  lastBookingId,
  payLoading,
  onReserve,
  onPay,
  estimatedDays,
  cartLoading = false,
  cartFeedback = null,
  onAddToCart,
  cartProviderMismatch = false,
  cartClearLoading = false,
  onClearCartMismatch,
}: ListingDetailPremiumViewProps) {
  const todayIso = useMemo(() => format(startOfDay(new Date()), "yyyy-MM-dd"), []);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [optDelivery, setOptDelivery] = useState(true);
  const [optInstall, setOptInstall] = useState(false);
  const [optTech, setOptTech] = useState(false);

  const sortedImages = useMemo(() => {
    if (!listing) return [];
    const imgs = [...(listing.images ?? [])].sort((a, b) => a.position - b.position);
    return imgs.length ? imgs : [{ id: "fallback", url: FALLBACK_HERO, position: 0, is_cover: true }];
  }, [listing]);

  const gallerySlots = useMemo(() => {
    const urls = sortedImages.map((i) => i.url);
    const out: string[] = [];
    for (let i = 0; i < 4; i++) {
      out.push(urls[i % urls.length] ?? FALLBACK_HERO);
    }
    return out;
  }, [sortedImages]);

  const mainImageUrl = gallerySlots[activeImageIndex] ?? FALLBACK_HERO;
  const cat = listing ? CATEGORY_UI[listing.category] : { breadcrumb: "…", badge: "…" };

  /** Montant aligné sur `POST /api/bookings` : prix/jour × jours (1 unité — quantité / options non persistées). */
  const rentalSubtotalOnline = useMemo(() => {
    if (!listing) return 0;
    const days = estimatedDays > 0 ? estimatedDays : 0;
    if (days <= 0) return 0;
    return Math.round(listing.price_per_day * days * 100) / 100;
  }, [estimatedDays, listing]);

  const checkoutPreview = useMemo(() => {
    if (rentalSubtotalOnline <= 0) return null;
    try {
      return computeGsBookingCheckoutTotals(rentalSubtotalOnline);
    } catch {
      return null;
    }
  }, [rentalSubtotalOnline]);

  const optionsExtraIndicative =
    (optDelivery ? OPTION_DELIVERY : 0) +
    (optInstall ? OPTION_INSTALL : 0) +
    (optTech ? OPTION_TECH : 0);

  const ratingLabel =
    listing && listing.rating_count > 0 ? listing.rating_avg.toFixed(1) : "4.9";
  const reviewCount =
    listing && listing.rating_count >= 28 ? listing.rating_count : 28;
  const techRows = listing
    ? specsForCategory(listing.category, listing.title)
    : SPECS_DJ;

  const listingUnavailable = listing ? listing.is_active === false : false;
  const canInstantBook = listing ? listing.can_accept_instant_booking === true : false;
  const connectMissing = listing
    ? listing.immediate_confirmation === true &&
      !listing.can_accept_instant_booking &&
      !listingUnavailable
    : false;
  const zoneDisplay =
    listing?.zone_label?.trim() || listing?.location?.trim() || "Île-de-France";
  const latNum = listing?.lat != null ? Number(listing.lat) : NaN;
  const lngNum = listing?.lng != null ? Number(listing.lng) : NaN;
  const showZoneMap = listing ? Number.isFinite(latNum) && Number.isFinite(lngNum) : false;

  return (
    <div className="font-landing-body text-gs-dark">
      {/* Breadcrumb */}
      <div className="border-b border-gs-line bg-white">
        <nav
          className="landing-container py-3 text-[13px] text-[#888]"
          aria-label="Fil d’Ariane"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-gs-orange hover:underline">
                Accueil
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/catalogue" className="hover:text-gs-orange hover:underline">
                Catalogue
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              {listing ? (
                <Link
                  href={`/catalogue?category=${listing.category}`}
                  className="hover:text-gs-orange hover:underline"
                >
                  {cat.breadcrumb}
                </Link>
              ) : (
                <span>…</span>
              )}
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-gs-dark">{listing?.title ?? "…"}</li>
          </ol>
        </nav>
      </div>

      <div className="landing-container py-8 pb-16 md:py-10 md:pb-20">
        {loading ? (
          <p className="text-sm text-[#666]">Chargement de l&apos;annonce…</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && !error && listing ? (
          <div className="mt-0 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,380px)] lg:items-start lg:gap-x-10 lg:gap-y-10 xl:gap-x-12">
            {listingUnavailable ? (
              <div
                className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] font-medium text-amber-950"
                role="status"
              >
                Annonce indisponible — cette fiche n&apos;accepte plus de nouvelles réservations sur
                GetSoundOn.
              </div>
            ) : null}
            {/* Hero (galerie) — mobile row 1, desktop col1 row1 */}
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <span className="font-landing-badge rounded-md bg-[#E8E8E8] px-2.5 py-1 text-[11px] font-bold tracking-wide text-gs-dark">
                  {cat.badge}
                </span>
                <span className="flex items-center gap-1 text-[13px] font-semibold text-gs-dark">
                  <Star className="h-3.5 w-3.5 fill-gs-orange text-gs-orange" aria-hidden />
                  {ratingLabel}/5
                </span>
                <span className="flex items-center gap-1 text-[13px] font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  Vérifié
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-black md:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
                {listing.title}
              </h1>

              <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-[#444] md:text-base">
                {listing.description}
              </p>

              {/* Main image */}
              <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#f0f0f0] shadow-sm ring-1 ring-black/5">
                <Image
                  src={mainImageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 65vw"
                  priority
                />
              </div>

              {/* Thumbnails */}
              <div className="mt-4 grid grid-cols-4 gap-3 sm:gap-4">
                {gallerySlots.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImageIndex(i)}
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-xl ring-2 transition-shadow",
                      activeImageIndex === i
                        ? "ring-gs-orange ring-offset-2 ring-offset-gs-beige"
                        : "ring-transparent hover:ring-gs-line"
                    )}
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="(max-width:640px) 22vw, 180px" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sticky booking — mobile row 2, desktop col2 rows 1–2 */}
            <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-gs-line bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] md:p-6">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-bold text-black md:text-4xl">
                    {Math.round(listing.price_per_day)}
                  </span>
                  <span className="text-lg font-semibold text-[#666]">€ / jour</span>
                </div>
                {listingUnavailable ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-amber-900">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden />
                    Réservation fermée
                  </p>
                ) : canInstantBook ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-gs-orange">
                    <Zap className="h-4 w-4" aria-hidden />
                    Confirmation immédiate
                  </p>
                ) : (
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#666]">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden />
                    {connectMissing
                      ? "Demande au prestataire — paiement en ligne indisponible pour l’instant"
                      : "Validation par le prestataire"}
                  </p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">
                      Du
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      min={todayIso}
                      disabled={listingUnavailable}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStartDate(next);
                        if (endDate && next && endDate < next) {
                          setEndDate(next);
                        }
                      }}
                      className={cn(
                        "h-11 w-full rounded-lg border border-gs-line bg-white px-3 text-sm text-gs-dark outline-none focus:border-gs-orange",
                        listingUnavailable && "cursor-not-allowed opacity-60"
                      )}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">
                      Au
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || todayIso}
                      disabled={listingUnavailable}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={cn(
                        "h-11 w-full rounded-lg border border-gs-line bg-white px-3 text-sm text-gs-dark outline-none focus:border-gs-orange",
                        listingUnavailable && "cursor-not-allowed opacity-60"
                      )}
                    />
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#888]">
                    Quantité
                  </span>
                  <div className="relative">
                    <select
                      value={quantity}
                      disabled={listingUnavailable}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className={cn(
                        "h-11 w-full appearance-none rounded-lg border border-gs-line bg-white px-3 pr-10 text-sm font-medium text-gs-dark outline-none focus:border-gs-orange",
                        listingUnavailable && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} unité{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888]" />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#999]">
                    Indicatif : le montant réservable en ligne correspond à <span className="font-medium">1 unité</span>.
                  </p>
                </label>

                <p className="mt-3 text-[11px] leading-relaxed text-[#888]">
                  Options ci-dessous : montants indicatifs,{" "}
                  <span className="font-medium">non inclus</span> dans le total payable sur la plateforme pour
                  l’instant — à confirmer avec le prestataire.
                </p>

                <div className="mt-2 border-t border-gs-line">
                  <ToggleRow
                    label="Livraison & Reprise"
                    priceNote={`(+${OPTION_DELIVERY}€)`}
                    checked={optDelivery}
                    onChange={setOptDelivery}
                    disabled={listingUnavailable}
                  />
                  <ToggleRow
                    label="Installation"
                    priceNote={`(+${OPTION_INSTALL}€)`}
                    checked={optInstall}
                    onChange={setOptInstall}
                    disabled={listingUnavailable}
                  />
                  <ToggleRow
                    label="Technicien"
                    priceNote={`(+${OPTION_TECH}€)`}
                    checked={optTech}
                    onChange={setOptTech}
                    disabled={listingUnavailable}
                  />
                </div>

                <div className="mt-6 space-y-2.5 border-t border-gs-line pt-5 text-[14px]">
                  <div className="flex justify-between text-[#555]">
                    <span>
                      Location ({estimatedDays > 0 ? estimatedDays : "—"} jour
                      {estimatedDays !== 1 ? "s" : ""}, 1 unité)
                    </span>
                    <span className="font-semibold text-gs-dark">
                      {estimatedDays > 0 ? `${checkoutPreview ? checkoutPreview.grossEur.toFixed(2) : rentalSubtotalOnline} €` : "—"}
                    </span>
                  </div>
                  {checkoutPreview && estimatedDays > 0 ? (
                    <div className="flex justify-between text-[#555]">
                      <span>Frais de service</span>
                      <span className="font-semibold text-gs-dark">
                        {checkoutPreview.serviceFeeEur.toFixed(2)} €
                      </span>
                    </div>
                  ) : null}
                  {optDelivery || optInstall || optTech ? (
                    <div className="rounded-md border border-dashed border-gs-line bg-slate-50/80 px-2.5 py-2 text-[12px] text-[#666]">
                      <p className="font-medium text-[#555]">Options (hors total en ligne)</p>
                      <ul className="mt-1 space-y-0.5">
                        {optDelivery ? (
                          <li className="flex justify-between gap-2">
                            <span>Livraison & Reprise</span>
                            <span className="shrink-0 font-medium text-gs-dark">{OPTION_DELIVERY} €</span>
                          </li>
                        ) : null}
                        {optInstall ? (
                          <li className="flex justify-between gap-2">
                            <span>Installation</span>
                            <span className="shrink-0 font-medium text-gs-dark">{OPTION_INSTALL} €</span>
                          </li>
                        ) : null}
                        {optTech ? (
                          <li className="flex justify-between gap-2">
                            <span>Technicien</span>
                            <span className="shrink-0 font-medium text-gs-dark">{OPTION_TECH} €</span>
                          </li>
                        ) : null}
                      </ul>
                      {optionsExtraIndicative > 0 ? (
                        <p className="mt-1.5 text-[11px] text-[#888]">
                          Indicatif total options : {optionsExtraIndicative} € — non facturé sur cette page.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {listing.deposit_amount != null && listing.deposit_amount > 0 ? (
                    <>
                      <div className="flex justify-between text-[#555]">
                        <span className="flex items-center gap-1">
                          Caution (empreinte)
                        </span>
                        <span className="font-semibold text-gs-dark">{listing.deposit_amount} €</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#aaa]">
                        Non débitée — autorisation bancaire après validation du paiement.
                      </p>
                    </>
                  ) : null}
                  {checkoutPreview && estimatedDays > 0 ? (
                    <p className="text-[11px] leading-relaxed text-[#888]">
                      Les frais de service couvrent le traitement sécurisé du paiement et le fonctionnement de la
                      plateforme.
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-gs-line pt-4">
                    <span className="text-base font-bold text-black">Total à payer</span>
                    <span className="text-2xl font-bold text-gs-orange">
                      {estimatedDays > 0
                        ? `${checkoutPreview ? checkoutPreview.checkoutTotalEur.toFixed(2) : rentalSubtotalOnline} €`
                        : "—"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onReserve}
                  disabled={
                    listingUnavailable ||
                    bookingLoading ||
                    payLoading ||
                    !startDate ||
                    !endDate
                  }
                  className="font-landing-btn mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-gs-orange text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bookingLoading || payLoading
                    ? canInstantBook
                      ? "En cours…"
                      : "Envoi…"
                    : canInstantBook
                      ? "Réserver maintenant"
                      : "Envoyer la demande"}
                </button>

                {onAddToCart ? (
                  <button
                    type="button"
                    onClick={() => onAddToCart(quantity)}
                    disabled={
                      listingUnavailable || cartLoading || bookingLoading || payLoading || !startDate || !endDate
                    }
                    className="font-landing-btn mt-3 flex h-12 w-full items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-slate-800 transition hover:border-gs-orange hover:text-gs-orange disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cartLoading ? "Ajout…" : "Ajouter au panier"}
                  </button>
                ) : null}

                {cartFeedback ? (
                  <p className="mt-2 text-center text-[12px] text-slate-600">{cartFeedback}</p>
                ) : null}

                {cartProviderMismatch && onClearCartMismatch ? (
                  <button
                    type="button"
                    disabled={cartClearLoading}
                    onClick={onClearCartMismatch}
                    className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {cartClearLoading ? "…" : "Vider le panier et continuer"}
                  </button>
                ) : null}

                {connectMissing ? (
                  <p className="mt-2 text-center text-[12px] leading-relaxed text-amber-700">
                    La réservation instantanée n’est pas disponible : les paiements du prestataire ne sont pas
                    finalisés. Vous pouvez envoyer une demande ; le prestataire vous répondra hors flux instantané.
                  </p>
                ) : null}

                {canInstantBook && lastBookingId && bookingFeedback && !listingUnavailable ? (
                  <button
                    type="button"
                    onClick={onPay}
                    disabled={payLoading || listingUnavailable}
                    className="font-landing-btn mt-3 flex h-12 w-full items-center justify-center rounded-lg border-2 border-gs-orange bg-white text-gs-orange transition hover:bg-gs-orange/5 disabled:opacity-50"
                  >
                    {payLoading ? "Redirection…" : "Relancer le paiement"}
                  </button>
                ) : null}

                {bookingFeedback ? (
                  <p className="mt-4 text-center text-[13px] text-[#555]">{bookingFeedback}</p>
                ) : null}

                <div className="mt-4 rounded-lg border border-gs-line bg-slate-50/90 p-3 text-left text-[11px] leading-relaxed text-[#555]">
                  <p className="font-semibold text-gs-dark">
                    Politique d’annulation — {getCancellationPolicyLabel(listing.cancellation_policy)}
                  </p>
                  <p className="mt-1">
                    Les demandes d’annulation sont examinées par GetSoundOn selon cette grille indicative et le
                    contexte de la réservation.
                  </p>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-[#888]">
                    Remboursement du montant de location (indicatif)
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-[#555]">
                    {getCancellationPolicySummaryLines(listing.cancellation_policy).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-[#888]">{cancellationPolicyLegalNoteShort()}</p>
                </div>

                <p className="mt-3 text-center text-[11px] leading-relaxed text-[#999]">
                  {listingUnavailable ? (
                    <>Les réservations ne sont plus possibles sur cette annonce.</>
                  ) : canInstantBook ? (
                    <>
                      Paiement sécurisé par GetSoundOn.
                      {listing.deposit_amount != null && listing.deposit_amount > 0 ? (
                        <>
                          {" "}
                          Si une caution est requise, une empreinte bancaire sera autorisée après validation du
                          paiement. Elle n’est pas débitée immédiatement.
                        </>
                      ) : null}
                    </>
                  ) : connectMissing ? (
                    <>
                      Vous pouvez envoyer une demande sans payer en ligne. Le prestataire pourra accepter et vous
                      guider si ses paiements ne sont pas encore activés.
                    </>
                  ) : (
                    <>
                      Aucun paiement en ligne tant que le prestataire n’a pas accepté votre demande. Après
                      acceptation, le paiement suit le parcours indiqué sur GetSoundOn.
                    </>
                  )}
                </p>
              </div>
            </aside>

            {/* Sections sous la ligne de flottaison — mobile row 3, desktop col1 row2 */}
            <div className="flex min-w-0 flex-col gap-12 md:gap-14 lg:col-start-1 lg:row-start-2">
              {/* Technical */}
              <section>
                <h2 className="text-xl font-bold text-black md:text-2xl">Informations Techniques</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {techRows.map((row) => (
                    <div
                      key={row.k}
                      className="flex flex-col rounded-xl border border-gs-line bg-white px-4 py-3.5 shadow-sm"
                    >
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#888]">
                        {row.k}
                      </span>
                      <span
                        className={cn(
                          "mt-1 text-[15px] font-semibold text-gs-dark",
                          row.highlight && "text-gs-orange"
                        )}
                      >
                        {row.v}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Inclus + Logistique */}
              <section className="grid gap-10 md:grid-cols-2 md:gap-8">
                <div>
                  <h2 className="text-lg font-bold text-black md:text-xl">Inclus dans la location</h2>
                  <ul className="mt-5 space-y-4">
                    {[
                      { icon: Briefcase, text: "Flight Case de transport pro" },
                      { icon: Plug, text: "Câble d’alimentation original" },
                      { icon: Cable, text: "Câble Pro Link / Ethernet" },
                    ].map((item) => (
                      <li key={item.text} className="flex gap-3">
                        <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" strokeWidth={2} />
                        <span className="text-[15px] leading-snug text-[#333]">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-black md:text-xl">Logistique</h2>
                  <ul className="mt-5 space-y-5">
                    <li className="flex gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" strokeWidth={2} />
                      <div>
                        <p className="font-semibold text-gs-dark">Retrait gratuit</p>
                        <p className="mt-0.5 text-sm text-[#666]">À l’entrepôt (Paris 11e)</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <Truck className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" strokeWidth={2} />
                      <div>
                        <p className="font-semibold text-gs-dark">Livraison disponible</p>
                        <p className="mt-0.5 text-sm text-[#666]">À partir de 35€ (Île-de-France)</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" strokeWidth={2} />
                      <div>
                        <p className="font-semibold text-gs-dark">Installation en option</p>
                        <p className="mt-0.5 text-sm text-[#666]">Paramétrage complet sur site</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Provider */}
              <section>
                <div className="flex flex-col gap-4 rounded-2xl border border-gs-line bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:p-6">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#222]">
                      <Image
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80&auto=format&fit=crop"
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-black">SoundElite Paris</p>
                      <p className="mt-0.5 text-sm text-[#666]">142 annonces</p>
                      <p className="mt-1 text-sm font-semibold text-gs-orange">Réponse en 5 min</p>
                    </div>
                  </div>
                  <Link
                    href={`/boutique/${listing.owner_boutique_slug?.trim() || DEMO_PROVIDER_SLUG}`}
                    className="font-landing-btn inline-flex h-11 w-full shrink-0 items-center justify-center rounded-lg border-2 border-gs-line bg-white px-6 text-sm text-gs-dark transition hover:bg-[#fafafa] sm:w-auto sm:min-w-[200px]"
                  >
                    Voir le profil
                  </Link>
                </div>
              </section>

              {/* Zone approximative (carte) */}
              <section aria-labelledby="listing-zone-heading">
                <div className="overflow-hidden rounded-2xl border border-gs-line bg-white shadow-sm">
                  <div className="border-b border-gs-line px-5 py-4 md:px-6">
                    <h2 id="listing-zone-heading" className="text-lg font-bold text-black md:text-xl">
                      Zone d&apos;intervention
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-[#666]">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gs-orange" strokeWidth={2} aria-hidden />
                      <span>
                        Emplacement indicatif : <strong className="font-semibold text-gs-dark">{zoneDisplay}</strong>.
                        L&apos;adresse précise est communiquée après validation de la location.
                      </span>
                    </p>
                  </div>
                  {showZoneMap && listing ? (
                    <ListingZoneMapCard
                      lat={latNum}
                      lng={lngNum}
                      listingId={listing.id}
                      zoneLabel={zoneDisplay}
                    />
                  ) : (
                    <div className="flex min-h-[180px] items-center justify-center bg-gs-beige/40 px-4 py-10 text-center text-sm text-[#888]">
                      Zone géographique non disponible pour cette annonce.
                    </div>
                  )}
                </div>
              </section>

              {/* Reviews */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-black md:text-2xl">
                    Avis clients ({reviewCount})
                  </h2>
                  <span className="flex items-center gap-1 text-lg font-bold text-gs-dark">
                    <Star className="h-5 w-5 fill-gs-orange text-gs-orange" />
                    {ratingLabel}
                  </span>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6">
                  {[
                    {
                      name: "Marc-Antoine D.",
                      date: "12 Mai 2024",
                      text: "Matériel au top, livré à l’heure pile pour notre vin d’honneur. Le XDJ est une bête, merci SoundElite !",
                    },
                    {
                      name: "Sophie L.",
                      date: "28 Avril 2024",
                      text: "Très pro et pédagogue pour l’installation. Je recommande vivement pour les événements pros.",
                    },
                  ].map((rev) => (
                    <div
                      key={rev.name}
                      className="rounded-2xl border border-gs-line bg-white p-5 shadow-sm md:p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-bold text-gs-dark">{rev.name}</p>
                        <p className="text-xs text-[#888]">{rev.date}</p>
                      </div>
                      <div className="mt-2 flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-gs-orange text-gs-orange"
                            aria-hidden
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-[15px] italic leading-relaxed text-[#444]">
                        &ldquo;{rev.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : !loading && !error ? (
          <p className="mt-4 text-sm text-[#666]">Cette annonce est introuvable.</p>
        ) : null}
      </div>
    </div>
  );
}
