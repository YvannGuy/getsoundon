import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { getLandingHeaderProps } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

/**
 * Même enveloppe que la homepage : header landing + footer landing, fond gs-beige.
 */
export async function PublicSiteShell({ children }: { children: React.ReactNode }) {
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
