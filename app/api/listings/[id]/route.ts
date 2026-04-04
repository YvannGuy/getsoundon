import { NextResponse } from "next/server";
import { z } from "zod";

import {
  findMockListingById,
  mockGsListingsEnabled,
  mockListingToDetail,
} from "@/lib/mock-gs-listings";
import { providerStripeCanReceivePayments } from "@/lib/gs-provider-stripe-connect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const listingIdSchema = z.string().uuid();

const updateListingSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: z.enum(["sound", "dj", "lighting", "services"]).optional(),
  pricePerDay: z.number().nonnegative().optional(),
  location: z.string().trim().min(2).max(255).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  /** Politique indicative pour les demandes d'annulation (matériel) */
  cancellationPolicy: z.enum(["flexible", "moderate", "strict"]).optional(),
  depositAmount: z.number().nonnegative().optional(),
  immediateConfirmation: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const listingId = listingIdSchema.parse(id);

    if (mockGsListingsEnabled()) {
      const row = findMockListingById(listingId);
      if (!row) {
        return NextResponse.json({ error: "Listing introuvable." }, { status: 404 });
      }
      return NextResponse.json({ data: mockListingToDetail(row) });
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const [{ data: listing, error: listingError }, { data: images, error: imagesError }] = await Promise.all([
      supabase
        .from("gs_listings")
        .select(
          "id, owner_id, title, description, category, price_per_day, deposit_amount, location, lat, lng, rating_avg, rating_count, is_active, immediate_confirmation, cancellation_policy, created_at"
        )
        .eq("id", listingId)
        .maybeSingle(),
      supabase
        .from("gs_listing_images")
        .select("id, url, position, is_cover")
        .eq("listing_id", listingId)
        .order("position", { ascending: true }),
    ]);

    if (listingError || imagesError) {
      return NextResponse.json({ error: "Impossible de recuperer ce listing." }, { status: 500 });
    }
    if (!listing) {
      return NextResponse.json({ error: "Listing introuvable." }, { status: 404 });
    }

    // Enrichissement depuis profiles : Connect status + boutique slug.
    // owner_id === profiles.id (même UUID auth). stripe_account_id non exposé dans la réponse.
    const listingRow = listing as {
      owner_id: string;
      immediate_confirmation?: boolean | null;
      is_active?: boolean | null;
    };
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("stripe_account_id, boutique_slug, full_name, boutique_name")
      .eq("id", listingRow.owner_id)
      .maybeSingle();

    const op = ownerProfile as {
      stripe_account_id?: string | null;
      boutique_slug?: string | null;
      full_name?: string | null;
      boutique_name?: string | null;
    } | null;
    const stripeAccountId = op?.stripe_account_id ?? null;
    const hasConnect = !!stripeAccountId;
    const boutique_slug = op?.boutique_slug ?? null;
    const owner_display_name =
      op?.boutique_name?.trim() || op?.full_name?.trim() || null;
    const immediateConfirmation = listingRow.immediate_confirmation === true;
    const listingActive = listingRow.is_active === true;

    // Annonce inactive : pas d’appel Stripe (aligné POST /api/bookings — pas de réservation).
    // has_connect reste dérivé du profil pour cohérence d’affichage si l’annonce est réactivée côté client.
    const connectReceives =
      listingActive && hasConnect && (await providerStripeCanReceivePayments(admin, listingRow.owner_id));

    return NextResponse.json({
      data: {
        ...listing,
        images: images ?? [],
        owner_boutique_slug: boutique_slug,
        owner_display_name,
        has_connect: hasConnect,
        can_accept_instant_booking: listingActive && immediateConfirmation && connectReceives,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const listingId = listingIdSchema.parse(id);
    const payload = updateListingSchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.category !== undefined) updatePayload.category = payload.category;
    if (payload.pricePerDay !== undefined) updatePayload.price_per_day = payload.pricePerDay;
    if (payload.location !== undefined) updatePayload.location = payload.location;
    if (payload.lat !== undefined) updatePayload.lat = payload.lat;
    if (payload.lng !== undefined) updatePayload.lng = payload.lng;
    if (payload.isActive !== undefined) updatePayload.is_active = payload.isActive;
    if (payload.cancellationPolicy !== undefined) {
      updatePayload.cancellation_policy = payload.cancellationPolicy;
    }
    if (payload.depositAmount !== undefined) {
      updatePayload.deposit_amount = payload.depositAmount;
    }
    if (payload.immediateConfirmation !== undefined) {
      updatePayload.immediate_confirmation = payload.immediateConfirmation;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("gs_listings")
      .update(updatePayload)
      .eq("id", listingId)
      .eq("owner_id", user.id)
      .select(
        "id, owner_id, title, description, category, price_per_day, deposit_amount, location, lat, lng, is_active, immediate_confirmation, cancellation_policy, updated_at"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Mise a jour impossible." }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Listing introuvable ou acces refuse." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const listingId = listingIdSchema.parse(id);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("gs_listings")
      .update({ is_active: false })
      .eq("id", listingId)
      .eq("owner_id", user.id)
      .select("id, is_active, updated_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Suppression impossible." }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Listing introuvable ou acces refuse." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
