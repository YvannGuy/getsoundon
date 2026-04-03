import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { resolvePublishListingHref } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

/**
 * Même enveloppe que la homepage : header landing + footer landing, fond gs-beige.
 */
export async function PublicSiteShell({ children }: { children: React.ReactNode }) {
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
