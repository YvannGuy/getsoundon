import type { Metadata } from "next";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HowItWorksView } from "@/components/landing/HowItWorksView";
import { buildCanonical } from "@/lib/seo";
import { getLandingHeaderProps } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description:
    "Découvrez comment louer ou mettre en location du matériel événementiel sur GetSoundOn : étapes pour les prestataires et les locataires, avantages et contact.",
  alternates: { canonical: buildCanonical("/comment-ca-marche") },
};

export default async function CommentCaMarchePage() {
  const { user, supabase } = await getUserOrNull();
  const { publishListingHref, dashboardHref } = await getLandingHeaderProps(user, supabase);

  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader publishListingHref={publishListingHref} dashboardHref={dashboardHref} />
      <HowItWorksView />
      <LandingFooter isLoggedIn={!!user} publishListingHref={publishListingHref} />
    </div>
  );
}
