/**
 * Types pour les offres de réservation (Owner → Seeker)
 */

export type OfferStatus = "pending" | "paid" | "refused" | "expired";

export type Offer = {
  id: string;
  conversation_id: string;
  demande_id: string;
  owner_id: string;
  seeker_id: string;
  salle_id: string;
  amount_cents: number;
  deposit_amount_cents: number;
  service_fee_cents: number;
  deposit_refunded_cents: number;
  deposit_status: "none" | "held" | "partially_refunded" | "refunded";
  deposit_payment_intent_id: string | null;
  deposit_hold_status: string;
  deposit_claim_amount_cents: number;
  deposit_claim_reason: string | null;
  deposit_claim_requested_at: string | null;
  deposit_released_at: string | null;
  deposit_captured_at: string | null;
  expires_at: string;
  status: OfferStatus;
  message: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OfferRow = {
  id: string;
  conversation_id: string;
  demande_id: string;
  owner_id: string;
  seeker_id: string;
  salle_id: string;
  amount_cents: number;
  deposit_amount_cents: number;
  service_fee_cents: number;
  deposit_refunded_cents: number;
  deposit_status: "none" | "held" | "partially_refunded" | "refunded";
  deposit_payment_intent_id: string | null;
  deposit_hold_status: string;
  deposit_claim_amount_cents: number;
  deposit_claim_reason: string | null;
  deposit_claim_requested_at: string | null;
  deposit_released_at: string | null;
  deposit_captured_at: string | null;
  expires_at: string;
  status: OfferStatus;
  message: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
};
