import type { Metadata } from "next";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Rechercher | ${siteConfig.name}`,
  description: `${siteConfig.description} Recherche de lieux et disponibilités en Île-de-France.`,
  alternates: { canonical: buildCanonical("/rechercher") },
};

export default async function RechercherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUserOrNull();

  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader />
      <section className="border-b border-gs-line bg-white/90 py-6">
        <div className="landing-container">
          <h1 className="sr-only">Rechercher un lieu pour votre événement sur {siteConfig.name}</h1>
          <p className="font-landing-body max-w-3xl text-[15px] leading-relaxed text-[#444]">
            Trouvez une salle adaptée à votre événement en Île-de-France — filtres par ville, date et capacité.
          </p>
        </div>
      </section>
      {children}
      <LandingFooter isLoggedIn={!!user} />
    </div>
  );
}
