export type LegacyOffer = {
  id: string;
  salle_id: string;
  seeker_id: string;
  owner_id: string;
  date_debut: string;
  date_fin: string;
  amount_cents: number;
  deposit_amount_cents?: number | null;
  status: "pending" | "paid" | "cancelled" | "rejected";
};

export type GsBookingUpsert = {
  id: string;
  listing_id: string;
  customer_id: string;
  provider_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_amount: number;
  status: "pending" | "accepted" | "refused" | "cancelled" | "completed";
};

export function mapLegacyOfferToGsBooking(offer: LegacyOffer): GsBookingUpsert {
  const statusMap: Record<LegacyOffer["status"], GsBookingUpsert["status"]> = {
    pending: "pending",
    paid: "accepted",
    cancelled: "cancelled",
    rejected: "refused",
  };

  return {
    id: offer.id,
    listing_id: offer.salle_id,
    customer_id: offer.seeker_id,
    provider_id: offer.owner_id,
    start_date: offer.date_debut,
    end_date: offer.date_fin,
    total_price: Number((offer.amount_cents ?? 0) / 100),
    deposit_amount: Number((offer.deposit_amount_cents ?? 0) / 100),
    status: statusMap[offer.status],
  };
}
