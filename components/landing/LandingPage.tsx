import { LandingCtaDark } from "@/components/landing/LandingCtaDark";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFeaturesStrip, LandingBrands, LandingCatalogue, LandingInfoStrip, LandingPopularModels } from "@/components/landing/LandingMidSections";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSmartEventAssistant } from "@/components/landing/LandingSmartEventAssistant";
import { getUserOrNull } from "@/lib/supabase/server";

export async function LandingPage() {
  const { user } = await getUserOrNull();

  return (
    <main className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader />
      <LandingHero />
      <LandingSmartEventAssistant />
      <LandingFeaturesStrip />
      <LandingCtaDark />
      <LandingCatalogue />
      <LandingPopularModels />
      <LandingInfoStrip />
      <LandingBrands />
      <LandingFinalCta />
      <LandingFaq />
      <LandingFooter isLoggedIn={!!user} />
    </main>
  );
}
