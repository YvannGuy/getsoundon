import type { Metadata } from "next";

import { CatalogueMarketplaceLayout } from "@/components/catalogue/catalogue-marketplace-layout";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Catalogue | ${siteConfig.name}`,
  description: `Parcourez le catalogue matériel et prestataires en Île-de-France sur ${siteConfig.name} — sono, DJ, lumière, filtres et carte.`,
  alternates: { canonical: buildCanonical("/catalogue") },
};

export default async function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return <CatalogueMarketplaceLayout>{children}</CatalogueMarketplaceLayout>;
}
