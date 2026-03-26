import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Rechercher | ${siteConfig.name}`,
  description: `${siteConfig.description} Recherche de lieux et de disponibilités en Île-de-France.`,
  alternates: { canonical: buildCanonical("/rechercher") },
};

export default function RechercherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <section className="border-b border-slate-100 bg-slate-50/80 py-6">
        <div className="container max-w-[1400px]">
          <h1 className="sr-only">Rechercher un lieu pour votre événement sur GetSoundOn</h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Trouvez une salle adaptée à votre événement en Île-de-France — filtrez par ville, date et capacité sur GetSoundOn.
          </p>
        </div>
      </section>
      {children}
      <SiteFooter />
    </div>
  );
}
