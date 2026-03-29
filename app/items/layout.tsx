import type { Metadata } from "next";

import { CatalogueMarketplaceLayout } from "@/components/catalogue/catalogue-marketplace-layout";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Catalogue | ${siteConfig.name}`,
  description: `Parcourez le catalogue matériel et prestataires sur ${siteConfig.name}.`,
  alternates: { canonical: buildCanonical("/catalogue") },
};

/**
 * Même habillage que /catalogue (header + footer) pour les liens directs /items?…
 */
export default async function ItemsLayout({ children }: { children: React.ReactNode }) {
  return <CatalogueMarketplaceLayout>{children}</CatalogueMarketplaceLayout>;
}
