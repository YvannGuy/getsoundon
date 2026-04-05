import { NextResponse } from "next/server";
import { z } from "zod";

import { getPlatformSettings } from "@/app/actions/admin-settings";
import { siteConfig } from "@/config/site";
import { CATALOGUE_SEGMENTS, isCatalogueSegmentSlug } from "@/lib/catalogue-segments";
import {
  locationSearchFragments,
  sanitizeIlikeToken,
} from "@/lib/listings-filter-utils";
import { filterMockListings, mockGsListingsEnabled } from "@/lib/mock-gs-listings";
import {
  sendGsListingPublishedProviderEmail,
  sendGsListingSubmittedProviderEmail,
  sendNewCatalogListingPendingAdminNotification,
  sendNewCatalogListingPublishedAdminNotification,
} from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

const createListingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(["sound", "dj", "lighting", "services"]),
  pricePerDay: z.number().nonnegative(),
  location: z.string().trim().min(2).max(255),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const LISTING_CATEGORIES = ["sound", "dj", "lighting", "services"] as const;

/** Conditions PostgREST `or` : titre ou description ilike pour chaque mot-clé. */
function titleDescriptionOrPartsFromKeywords(keywords: readonly string[]): string[] {
  const parts: string[] = [];
  for (const raw of keywords) {
    const s = sanitizeIlikeToken(raw);
    if (s.length >= 2) {
      parts.push(`title.ilike.%${s}%`);
      parts.push(`description.ilike.%${s}%`);
    }
  }
  return parts;
}

type ListingImageRow = { url: string; is_cover?: boolean; position?: number };

function pickListingCoverUrl(images: ListingImageRow[] | null | undefined): string | null {
  if (!images?.length) return null;
  const cover = images.find((i) => i.is_cover);
  if (cover?.url) return cover.url;
  return [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentRaw = searchParams.get("segment")?.trim() ?? "";
    const query = searchParams.get("q")?.trim();
    const categoryParam = searchParams.get("category")?.trim();
    const location = searchParams.get("location")?.trim();
    const minPrice = Number(searchParams.get("minPrice") ?? 0);
    const maxPrice = Number(searchParams.get("maxPrice") ?? Number.MAX_SAFE_INTEGER);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (mockGsListingsEnabled()) {
      const { data, total } = filterMockListings({
        segmentRaw,
        query,
        categoryParam,
        location,
        minPrice,
        maxPrice,
        page,
        limit,
      });
      return NextResponse.json({
        data,
        pagination: { page, limit, total },
      });
    }

    const supabase = await createClient();

    const SELECT_BASE =
      "id, owner_id, title, description, category, price_per_day, location, lat, lng, rating_avg, rating_count, created_at";
    const SELECT_WITH_IMAGES = `${SELECT_BASE}, gs_listing_images ( url, is_cover, position )`;

    let categoryFilter = categoryParam;
    let textOrParts: string[] | undefined;

    if (segmentRaw && isCatalogueSegmentSlug(segmentRaw)) {
      const cfg = CATALOGUE_SEGMENTS[segmentRaw];
      categoryFilter = cfg.category;
      if ("textAnyOf" in cfg && cfg.textAnyOf?.length) {
        textOrParts = titleDescriptionOrPartsFromKeywords(cfg.textAnyOf);
      }
    } else if (query) {
      const safeQ = sanitizeIlikeToken(query);
      if (safeQ.length >= 1) {
        textOrParts = [`title.ilike.%${safeQ}%`, `description.ilike.%${safeQ}%`];
      }
    }

    const buildQuery = (select: string) => {
      let qb = supabase
        .from("gs_listings")
        .select(select, { count: "exact" })
        .eq("is_active", true)
        .gte("price_per_day", Number.isFinite(minPrice) ? minPrice : 0)
        .lte("price_per_day", Number.isFinite(maxPrice) ? maxPrice : Number.MAX_SAFE_INTEGER)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (textOrParts && textOrParts.length > 0) {
        qb = qb.or(textOrParts.join(","));
      }
      if (location) {
        const frags = locationSearchFragments(location);
        if (frags.length === 1) {
          qb = qb.ilike("location", `%${frags[0]}%`);
        } else if (frags.length > 1) {
          qb = qb.or(frags.map((f) => `location.ilike.%${f}%`).join(","));
        }
      }
      if (categoryFilter && LISTING_CATEGORIES.includes(categoryFilter as (typeof LISTING_CATEGORIES)[number])) {
        qb = qb.eq("category", categoryFilter);
      }
      return qb;
    };

    let { data, error, count } = await buildQuery(SELECT_WITH_IMAGES);
    if (error) {
      ({ data, error, count } = await buildQuery(SELECT_BASE));
    }

    if (error) {
      return NextResponse.json({ error: "Impossible de recuperer les listings." }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const mapped = rows.map((row) => {
      const imgs = row.gs_listing_images as ListingImageRow[] | null | undefined;
      const { gs_listing_images: _drop, ...rest } = row;
      return {
        ...rest,
        image_url: pickListingCoverUrl(imgs),
      };
    });

    return NextResponse.json({
      data: mapped,
      pagination: {
        page,
        limit,
        total: count ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = createListingSchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("gs_users_profile")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Impossible de verifier le profil." }, { status: 500 });
    }

    const role = (profile as { role?: string } | null)?.role;
    if (role !== "provider" && role !== "admin") {
      return NextResponse.json({ error: "Role provider requis." }, { status: 403 });
    }

    const platformSettings = await getPlatformSettings();
    const { validation_manuelle, mode_publication } = platformSettings.validation;
    const isActive = !validation_manuelle || mode_publication === "auto";

    const { data, error } = await supabase
      .from("gs_listings")
      .insert({
        owner_id: user.id,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        price_per_day: payload.pricePerDay,
        location: payload.location,
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
        is_active: isActive,
        moderation_status: isActive ? "approved" : "pending",
      })
      .select("id, owner_id, title, description, category, price_per_day, location, lat, lng, is_active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Creation du listing impossible." }, { status: 400 });
    }

    const row = data as {
      id: string;
      title: string;
      location: string | null;
    };
    const siteBase = siteConfig.url.replace(/\/$/, "");
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const adminDashboardUrl = `${siteBase}/admin`;
    const locationLabel = row.location?.trim() || "—";

    if (adminEmails.length > 0) {
      if (isActive) {
        await sendNewCatalogListingPublishedAdminNotification(
          adminEmails,
          row.title,
          locationLabel,
          adminDashboardUrl
        ).catch(() => null);
      } else {
        await sendNewCatalogListingPendingAdminNotification(
          adminEmails,
          row.title,
          locationLabel,
          adminDashboardUrl
        ).catch(() => null);
      }
    }

    const providerTo = user.email?.trim();
    const manageUrl = `${siteBase}/proprietaire/materiel/listing/${row.id}/reglages`;
    if (providerTo) {
      if (isActive) {
        await sendGsListingPublishedProviderEmail(providerTo, {
          listingTitle: row.title,
          catalogueUrl: `${siteBase}/catalogue`,
          manageUrl,
        }).catch(() => null);
      } else {
        await sendGsListingSubmittedProviderEmail(providerTo, {
          listingTitle: row.title,
          manageUrl,
        }).catch(() => null);
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
