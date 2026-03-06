import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Rechercher une salle",
  description:
    "Trouvez une salle pour votre culte, baptême, conférence ou événement cultuel en Île-de-France. Filtrez par ville, capacité et type d'événement.",
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
          <h1 className="sr-only">Rechercher une salle pour votre culte ou événement cultuel en Île-de-France</h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Trouvez une salle pour vos cultes, baptêmes et événements cultuels en Île-de-France — filtrez par ville, date et capacité.
          </p>
        </div>
      </section>
      {children}
      <SiteFooter />
    </div>
  );
}
