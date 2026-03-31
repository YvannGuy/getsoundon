import { Metadata } from "next";
import RecommendationEngineDebug from "@/components/debug/RecommendationEngineDebug";

export const metadata: Metadata = {
  title: "Debug Moteur Recommandation | GetSoundOn",
  description: "Outils de debug et test pour le moteur de recommandation événementielle",
  robots: "noindex, nofollow" // Page de debug privée
};

export default function RecommendationDebugPage() {
  return <RecommendationEngineDebug />;
}