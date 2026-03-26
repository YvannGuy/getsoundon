import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: buildCanonical("/accueil") },
};

/** Revalidation ISR hebdomadaire */
export const revalidate = 604800;

export default function Home() {
  return <LandingPage />;
}
