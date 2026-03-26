import type { Metadata } from "next";
import Home from "@/app/accueil/page";

import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Louer ou proposer du materiel son, DJ et lumiere | ${siteConfig.name}`,
  description: siteConfig.description,
  alternates: { canonical: buildCanonical("/") },
};

export default function HomePage() {
  return <Home />;
}
