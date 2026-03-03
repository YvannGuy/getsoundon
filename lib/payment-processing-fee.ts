export const PAYMENT_PROCESSING_RATE = 0.015; // 1.5%
export const PAYMENT_PROCESSING_FIXED_CENTS = 25; // 0.25 EUR

export function computePaymentProcessingFeeCents(amountToChargeCents: number): number {
  const normalized = Math.max(0, Math.round(amountToChargeCents));
  if (normalized === 0) return 0;
  return Math.round(normalized * PAYMENT_PROCESSING_RATE + PAYMENT_PROCESSING_FIXED_CENTS);
}
