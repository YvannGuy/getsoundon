export type ListingCategory = "sound" | "dj" | "lighting" | "services";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "refused"
  | "cancelled"
  | "completed";

export type CreateListingInput = {
  title: string;
  description: string;
  category: ListingCategory;
  pricePerDay: number;
  location: string;
  lat?: number;
  lng?: number;
};

export type CreateBookingInput = {
  listingId: string;
  startDate: string;
  endDate: string;
  depositAmount?: number;
};

export type SendMessageInput = {
  bookingId: string;
  content: string;
};
