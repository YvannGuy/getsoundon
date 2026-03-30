import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ProviderStoreHero } from "@/components/storefront/provider-store-hero";
import { ProviderStorefrontBody } from "@/components/storefront/provider-storefront-body";
import { siteConfig } from "@/config/site";
import { DEMO_PROVIDER_SLUG, demoProvider } from "@/lib/provider-storefront-demo";
import { buildCanonical } from "@/lib/seo";
import { getUserOrNull } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ slug: DEMO_PROVIDER_SLUG }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== DEMO_PROVIDER_SLUG) {
    return { title: "Boutique | " + siteConfig.name };
  }
  const title = `${demoProvider.name} — Boutique | ${siteConfig.name}`;
  return {
    title,
    description: `Découvrez les annonces et le parc matériel de ${demoProvider.name} sur ${siteConfig.name}.`,
    alternates: { canonical: buildCanonical(`/boutique/${slug}`) },
  };
}

export default async function ProviderStorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug !== DEMO_PROVIDER_SLUG) {
    notFound();
  }

  const { user } = await getUserOrNull();

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
      <LandingFooter isLoggedIn={!!user} />
    </div>
  );
}
