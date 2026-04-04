import type { Metadata } from "next";
import Home from "@/app/accueil/page";

import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Louer ou proposer du materiel son, DJ et lumiere | ${siteConfig.name}`,
  description: siteConfig.description,
  alternates: { canonical: buildCanonical("/") },
};

/** Évite une page d’accueil servie sans tenir compte des cookies de session. */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <Home />;
}
