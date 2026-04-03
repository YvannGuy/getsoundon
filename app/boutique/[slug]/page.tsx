import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ProviderStoreHero } from "@/components/storefront/provider-store-hero";
import { ProviderStorefrontBody } from "@/components/storefront/provider-storefront-body";
import { siteConfig } from "@/config/site";
import { DEMO_PROVIDER_SLUG, demoProvider } from "@/lib/provider-storefront-demo";
import { buildCanonical } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublishListingHref } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";
import { rowToSalle } from "@/lib/types/salle";
import { getSallePriceFrom } from "@/lib/types/salle";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type ProviderProfile = {
  id: string;
  full_name: string | null;
  boutique_slug: string | null;
  boutique_name: string | null;
  boutique_cover_url: string | null;
  boutique_city: string | null;
};

async function getProviderBySlug(slug: string): Promise<ProviderProfile | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, boutique_slug, boutique_name, boutique_cover_url, boutique_city")
    .eq("boutique_slug", slug)
    .maybeSingle();
  return (data as ProviderProfile | null) ?? null;
}

async function getProviderSalles(ownerId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("salles")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);
  return (data ?? []).map((row) => rowToSalle(row as Parameters<typeof rowToSalle>[0]));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === DEMO_PROVIDER_SLUG) {
    const title = `${demoProvider.name} — Boutique | ${siteConfig.name}`;
    return {
      title,
      description: `Découvrez les annonces et le parc matériel de ${demoProvider.name} sur ${siteConfig.name}.`,
      alternates: { canonical: buildCanonical(`/boutique/${slug}`) },
    };
  }

  const provider = await getProviderBySlug(slug);
  if (!provider) return { title: "Boutique | " + siteConfig.name };

  const name = provider.boutique_name ?? provider.full_name ?? "Prestataire";
  return {
    title: `${name} — Boutique | ${siteConfig.name}`,
    description: `Découvrez les annonces de ${name} sur ${siteConfig.name}.`,
    alternates: { canonical: buildCanonical(`/boutique/${slug}`) },
  };
}

export default async function ProviderStorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const { user, supabase } = await getUserOrNull();
  const publishListingHref = await resolvePublishListingHref(user, supabase);

  // Démo statique
  if (slug === DEMO_PROVIDER_SLUG) {
    return (
      <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
        <LandingHeader />
        <main>
          <ProviderStoreHero
            name={demoProvider.name}
            rating={demoProvider.rating}
            reviewCount={demoProvider.reviewCount}
            location={demoProvider.location}
            heroImageSrc={demoProvider.heroImageSrc}
          />
          <ProviderStorefrontBody />
        </main>
        <LandingFooter isLoggedIn={!!user} publishListingHref={publishListingHref} />
      </div>
    );
  }

  // Prestataire réel
  const provider = await getProviderBySlug(slug);
  if (!provider) notFound();

  const salles = await getProviderSalles(provider.id);
  const displayName = provider.boutique_name ?? provider.full_name ?? "Prestataire";
  const city = provider.boutique_city ?? (salles[0]?.city ?? "");
  const coverUrl =
    provider.boutique_cover_url ??
    salles[0]?.images[0] ??
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=2000&q=80";

  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader />
      <main>
        <ProviderStoreHero
          name={displayName}
          rating={0}
          reviewCount={0}
          location={city}
          heroImageSrc={coverUrl}
        />

        <section className="landing-container py-10">
          <h2 className="mb-6 font-landing-heading text-2xl font-bold text-black">
            Annonces disponibles
          </h2>

          {salles.length === 0 ? (
            <p className="text-slate-500">Aucune annonce publiée pour le moment.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {salles.map((salle) => {
                const priceFrom = getSallePriceFrom(salle);
                return (
                  <Link
                    key={salle.id}
                    href="/catalogue"
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="relative aspect-[16/10] bg-slate-100">
                      {salle.images[0] ? (
                        <Image
                          src={salle.images[0]}
                          alt={salle.name}
                          fill
                          className="object-cover transition group-hover:scale-[1.02]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <MapPin className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-black">{salle.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {salle.city}
                      </p>
                      {priceFrom && (
                        <p className="mt-2 text-sm font-medium text-gs-orange">
                          À partir de {priceFrom.value} € {priceFrom.label}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <LandingFooter isLoggedIn={!!user} publishListingHref={publishListingHref} />
    </div>
  );
}
