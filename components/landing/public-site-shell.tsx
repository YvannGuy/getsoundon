import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { getUserOrNull } from "@/lib/supabase/server";

/**
 * Même enveloppe que la homepage : header landing + footer landing, fond gs-beige.
 */
export async function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const { user } = await getUserOrNull();
  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader />
      {children}
      <LandingFooter isLoggedIn={!!user} />
    </div>
  );
}
