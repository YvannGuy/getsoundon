/**
 * Données factices pour tester le catalogue / recherche sans Supabase.
 * Active avec MOCK_GS_LISTINGS=true (ou 1) dans .env.local — ne pas activer en prod.
 */

import { CATALOGUE_SEGMENTS, isCatalogueSegmentSlug } from "@/lib/catalogue-segments";
import { DEMO_PROVIDER_SLUG } from "@/lib/provider-storefront-demo";
import {
  listingHaystack,
  locationMatchesRow,
  matchesAnyKeyword,
  matchesSingleQuery,
} from "@/lib/listings-filter-utils";

const OWNER = "00000000-0000-0000-0000-00000000d001";

export type MockListingRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: "sound" | "dj" | "lighting" | "services";
  price_per_day: number;
  location: string;
  lat: number;
  lng: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  image_url: string;
  /** Si true : bouton « Réserver maintenant » + paiement ; sinon « Envoyer la demande ». */
  immediate_confirmation?: boolean;
  /** Libellé public type « Montreuil (93) » (sans adresse précise). */
  zone_label?: string | null;
};

/** Une annonce par « famille » + quelques variantes pour le rendu liste / cartes. */
const MOCK_ROWS: MockListingRow[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    owner_id: OWNER,
    immediate_confirmation: false,
    zone_label: "Paris (75) — secteur 11e",
    title: "Enceintes actives JBL EON 715",
    description:
      "Paire d’enceintes amplifiées 15 pouces, idéale soirées et petites salles. Son clair, caisson intégré possible en option.",
    category: "sound",
    price_per_day: 45,
    location: "Paris 75011",
    lat: 48.8566,
    lng: 2.3522,
    rating_avg: 4.7,
    rating_count: 12,
    created_at: "2025-11-02T10:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    owner_id: OWNER,
    title: "Line array RCF + caisson de basses",
    description:
      "Système sono line array pour événements moyens. Satellite + caisson basse, livraison possible IDF.",
    category: "sound",
    price_per_day: 120,
    location: "Versailles (78000)",
    lat: 48.8049,
    lng: 2.1204,
    rating_avg: 4.9,
    rating_count: 8,
    created_at: "2025-10-15T14:30:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    owner_id: OWNER,
    immediate_confirmation: false,
    zone_label: "Montreuil (93)",
    title: "Microphone Shure SM58 + pied",
    description:
      "Micro dynamique filaire, standard scène et discours. Câble XLR fourni. Idéal voix et micro chant léger.",
    category: "sound",
    price_per_day: 12,
    location: "Montreuil (93100)",
    lat: 48.8534,
    lng: 2.4432,
    rating_avg: 4.8,
    rating_count: 34,
    created_at: "2025-12-01T09:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    owner_id: OWNER,
    title: "Pack 2 micros HF Sennheiser sans fil",
    description:
      "Deux micros main UHF, récepteur double. Parfait mariages et conférences. Batteries et housses incluses.",
    category: "sound",
    price_per_day: 38,
    location: "Paris 75020",
    lat: 48.8647,
    lng: 2.3984,
    rating_avg: 4.6,
    rating_count: 19,
    created_at: "2025-09-20T16:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    owner_id: OWNER,
    title: "Lyre LED Beam + flight case",
    description:
      "Lyre asservie LED, effets prismes et gobos. DMX512. Idéal soirées DJ et scène.",
    category: "lighting",
    price_per_day: 35,
    location: "Paris 75012",
    lat: 48.8412,
    lng: 2.3876,
    rating_avg: 4.5,
    rating_count: 7,
    created_at: "2025-11-28T11:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    owner_id: OWNER,
    title: "Kit barres LED + pars RGB",
    description:
      "Pack lumière ambiance : 4 barres LED et 6 pars RGB sur pieds. Contrôle simple ou DMX.",
    category: "lighting",
    price_per_day: 42,
    location: "Neuilly-sur-Seine (92200)",
    lat: 48.8848,
    lng: 2.2687,
    rating_avg: 4.4,
    rating_count: 5,
    created_at: "2025-10-05T08:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000007",
    owner_id: OWNER,
    immediate_confirmation: true,
    zone_label: "Paris (75) — secteur 18e",
    title: "Pioneer XDJ-RX3",
    description:
      "Système DJ tout-en-un haute performance, idéal pour les soirées privées, les mariages et les sets professionnels exigeants. Une flexibilité totale sans ordinateur.",
    category: "dj",
    price_per_day: 85,
    location: "Paris 75018",
    lat: 48.8867,
    lng: 2.3431,
    rating_avg: 4.9,
    rating_count: 28,
    created_at: "2025-12-10T18:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000008",
    owner_id: OWNER,
    title: "Platines Technics SL-1200 + table DJM",
    description:
      "Paire de platines vinyle + mixer Pioneer DJM. Pack DJ club, installation possible.",
    category: "dj",
    price_per_day: 95,
    location: "Boulogne-Billancourt (92100)",
    lat: 48.8352,
    lng: 2.2412,
    rating_avg: 5,
    rating_count: 11,
    created_at: "2025-08-01T12:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1571266028243-e8f59f7d9ccf?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-000000000009",
    owner_id: OWNER,
    title: "Console de mixage Yamaha MG16XU",
    description:
      "Console 16 voies avec effets et USB. Idéal live et petite sono. Flight case inclus.",
    category: "dj",
    price_per_day: 28,
    location: "Issy-les-Moulineaux (92130)",
    lat: 48.8239,
    lng: 2.2697,
    rating_avg: 4.3,
    rating_count: 9,
    created_at: "2025-07-22T15:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=600&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-00000000000a",
    owner_id: OWNER,
    title: "Vidéoprojecteur Full HD Epson EB",
    description:
      "Projecteur 4000 lumens, HDMI et VGA. Écran sur demande. Location vidéoprojecteur événement pro.",
    category: "services",
    price_per_day: 32,
    location: "Paris 75015",
    lat: 48.8422,
    lng: 2.3004,
    rating_avg: 4.6,
    rating_count: 14,
    created_at: "2025-11-18T10:00:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "a1000000-0000-4000-8000-00000000000b",
    owner_id: OWNER,
    title: "Rétroprojecteur BenQ + HDMI",
    description:
      "Vidéo projection conférence, format large. Câbles et télécommande. Livraison Île-de-France.",
    category: "services",
    price_per_day: 27,
    location: "Saint-Denis (93200)",
    lat: 48.9362,
    lng: 2.3574,
    rating_avg: 4.2,
    rating_count: 6,
    created_at: "2025-06-10T09:30:00.000Z",
    image_url:
      "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800&q=80&auto=format&fit=crop",
  },
];

export function mockGsListingsEnabled(): boolean {
  const v = process.env.MOCK_GS_LISTINGS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function rowMatchesFilters(
  row: MockListingRow,
  opts: {
    categoryFilter: string | undefined;
    keywords: readonly string[] | undefined;
    singleQuery: string | undefined;
    location: string | undefined;
    minPrice: number;
    maxPrice: number;
  }
): boolean {
  if (row.price_per_day < opts.minPrice || row.price_per_day > opts.maxPrice) return false;
  if (opts.categoryFilter && row.category !== opts.categoryFilter) return false;

  const hay = listingHaystack(row.title, row.description);
  if (opts.keywords?.length) {
    if (!matchesAnyKeyword(hay, opts.keywords)) return false;
  } else if (opts.singleQuery) {
    if (!matchesSingleQuery(hay, opts.singleQuery)) return false;
  }

  if (!locationMatchesRow(row.location, opts.location)) return false;
  return true;
}

export function filterMockListings(input: {
  segmentRaw: string;
  query: string | undefined;
  categoryParam: string | undefined;
  location: string | undefined;
  minPrice: number;
  maxPrice: number;
  page: number;
  limit: number;
}): { data: MockListingRow[]; total: number } {
  let categoryFilter = input.categoryParam?.trim() || undefined;
  let keywords: readonly string[] | undefined;
  let singleQuery: string | undefined;

  const seg = input.segmentRaw.trim();
  if (seg && isCatalogueSegmentSlug(seg)) {
    const cfg = CATALOGUE_SEGMENTS[seg];
    categoryFilter = cfg.category;
    if ("textAnyOf" in cfg && cfg.textAnyOf?.length) {
      keywords = cfg.textAnyOf;
    }
  } else if (input.query?.trim()) {
    singleQuery = input.query.trim();
  }

  const filtered = MOCK_ROWS.filter((row) =>
    rowMatchesFilters(row, {
      categoryFilter,
      keywords,
      singleQuery,
      location: input.location,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
    })
  );

  filtered.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const total = filtered.length;
  const from = (input.page - 1) * input.limit;
  const data = filtered.slice(from, from + input.limit);

  return { data, total };
}

export function findMockListingById(id: string): MockListingRow | undefined {
  return MOCK_ROWS.find((r) => r.id === id);
}

/** Payload attendu par GET /api/listings/[id] */
export function mockListingToDetail(row: MockListingRow) {
  const { image_url, ...rest } = row;
  const immediateConfirmation = row.immediate_confirmation ?? false;
  return {
    ...rest,
    is_active: true,
    deposit_amount: 0,
    owner_boutique_slug: DEMO_PROVIDER_SLUG,
    immediate_confirmation: immediateConfirmation,
    /** En mode mock, les annonces instant booking sont supposées avoir Connect actif. */
    has_connect: immediateConfirmation,
    can_accept_instant_booking: immediateConfirmation,
    images: [
      {
        id: `${row.id}-cover`,
        url: image_url,
        position: 0,
        is_cover: true,
      },
    ],
  };
}
