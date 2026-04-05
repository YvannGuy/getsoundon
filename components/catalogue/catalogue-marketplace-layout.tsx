import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { getLandingHeaderProps } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

/**
 * Même socle que la homepage : header / footer landing + fond beige charte.
 * Le bandeau « Catalogue » vs « Résultats » est géré dans ItemsSearchContent (searchParams).
 */
export async function CatalogueMarketplaceLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getUserOrNull();
  const {
    publishListingHref,
    dashboardHref,
    userType,
    draftCartPreview,
    accountAvatarUrl,
    accountDisplayName,
    accountEmail,
  } = await getLandingHeaderProps(user, supabase);

  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader
        publishListingHref={publishListingHref}
        dashboardHref={dashboardHref}
        userType={userType}
        draftCartPreview={draftCartPreview}
        accountAvatarUrl={accountAvatarUrl}
        accountDisplayName={accountDisplayName}
        accountEmail={accountEmail}
      />
      {children}
      <LandingFooter publishListingHref={publishListingHref} />
    </div>
  );
}
