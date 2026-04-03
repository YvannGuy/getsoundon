import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { resolvePublishListingHref } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

/**
 * Même socle que la homepage : header / footer landing + fond beige charte.
 * Le bandeau « Catalogue » vs « Résultats » est géré dans ItemsSearchContent (searchParams).
 */
export async function CatalogueMarketplaceLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getUserOrNull();
  const publishListingHref = await resolvePublishListingHref(user, supabase);

  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader />
      {children}
      <LandingFooter isLoggedIn={!!user} publishListingHref={publishListingHref} />
    </div>
  );
}
