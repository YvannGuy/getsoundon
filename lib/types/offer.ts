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
  expires_at: string;
  status: OfferStatus;
  message: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
};
