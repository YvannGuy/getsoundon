import { filterMockListings, type MockListingRow } from "@/lib/mock-gs-listings";

import { MatchingProvider } from "./types";

function mapRowToProvider(row: MockListingRow): MatchingProvider {
  const categories = [row.category];
  const services = {
    delivery: true,
    installation: row.category !== "services" ? true : false,
    technician: row.category !== "services" ? true : false,
  };

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.zone_label ?? row.location,
    pricePerDay: row.price_per_day,
    rating: row.rating_avg,
    ratingCount: row.rating_count,
    capabilities: {
      categories,
      services,
      coverageLabel: row.zone_label ?? row.location,
      lat: row.lat,
      lng: row.lng,
    },
    image: row.image_url,
  };
}

export function getMockProviders(limit = 50): MatchingProvider[] {
  const { data } = filterMockListings({
    segmentRaw: "",
    query: undefined,
    categoryParam: undefined,
    location: undefined,
    minPrice: 0,
    maxPrice: 100000,
    page: 1,
    limit,
  });
  return data.map(mapRowToProvider);
}
