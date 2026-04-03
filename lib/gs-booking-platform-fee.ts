/**
 * Réservations matériel (`gs_*`) — montants et commissions.
 *
 * Convention `gs_bookings.total_price` : **montant de la location** (base prestataire), hors frais de service client.
 * - Commission plateforme 15 % et net prestataire : calculés **sur la location uniquement**.
 * - Frais de service client 3 % : calculés **sur la location**, ajoutés au total Checkout (payés par le client).
 */
export const GS_BOOKING_PLATFORM_FEE_PERCENT = 15;
export const GS_BOOKING_CUSTOMER_SERVICE_FEE_PERCENT = 3;

export type GsBookingPaymentSplit = {
  /** Montant location en centimes */
  grossCents: number;
  platformFeeCents: number;
  providerNetCents: number;
  grossEur: number;
  platformFeeEur: number;
  providerNetEur: number;
};

export type GsBookingCheckoutTotals = GsBookingPaymentSplit & {
  serviceFeeCents: number;
  serviceFeeEur: number;
  checkoutTotalCents: number;
  checkoutTotalEur: number;
};

/** Commission 15 % + net prestataire sur le montant location (`total_price`). */
export function computeGsBookingPaymentSplit(locationAmountEur: number): GsBookingPaymentSplit {
  const grossCents = Math.round(Number(locationAmountEur) * 100);
  if (!Number.isFinite(grossCents) || grossCents <= 0) {
    throw new Error("computeGsBookingPaymentSplit: montant location invalide");
  }
  const platformFeeCents = Math.round((grossCents * GS_BOOKING_PLATFORM_FEE_PERCENT) / 100);
  const providerNetCents = grossCents - platformFeeCents;
  return {
    grossCents,
    platformFeeCents,
    providerNetCents,
    grossEur: grossCents / 100,
    platformFeeEur: platformFeeCents / 100,
    providerNetEur: providerNetCents / 100,
  };
}

/**
 * Location + frais de service client + total Checkout (centimes cohérents).
 * serviceFeeCents = round(locationCents * 3 / 100), checkoutTotalCents = locationCents + serviceFeeCents.
 */
export function computeGsBookingCheckoutTotals(locationAmountEur: number): GsBookingCheckoutTotals {
  const split = computeGsBookingPaymentSplit(locationAmountEur);
  const serviceFeeCents = Math.round(
    (split.grossCents * GS_BOOKING_CUSTOMER_SERVICE_FEE_PERCENT) / 100
  );
  const checkoutTotalCents = split.grossCents + serviceFeeCents;
  return {
    ...split,
    serviceFeeCents,
    serviceFeeEur: serviceFeeCents / 100,
    checkoutTotalCents,
    checkoutTotalEur: checkoutTotalCents / 100,
  };
}

/**
 * Total débité sur le PaymentIntent principal (location ± frais de service), en centimes.
 * Priorité à `checkout_total_eur` (vérité après webhook) ; sinon repli = montant location uniquement (réservations anciennes sans frais).
 */
export function getCheckoutTotalPaidCents(row: {
  total_price: number | string;
  checkout_total_eur?: number | string | null;
}): number | null {
  const fromCol = row.checkout_total_eur;
  if (fromCol != null && fromCol !== "") {
    const n = Number(fromCol);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
  }
  const loc = Number(row.total_price);
  if (!Number.isFinite(loc) || loc <= 0) return null;
  return Math.round(loc * 100);
}

/**
 * Montant à transférer vers Stripe Connect (centimes), basé sur le **montant location** uniquement.
 */
export function getProviderNetTransferCents(row: {
  total_price: number | string;
  provider_net_eur?: number | string | null;
}): number | null {
  const locationEur = Number(row.total_price);
  if (!Number.isFinite(locationEur) || locationEur <= 0) return null;
  const fromCol = row.provider_net_eur;
  if (fromCol != null && fromCol !== "") {
    const n = Number(fromCol);
    if (Number.isFinite(n) && n > 0) {
      return Math.round(n * 100);
    }
  }
  try {
    return computeGsBookingPaymentSplit(locationEur).providerNetCents;
  } catch {
    return null;
  }
}
