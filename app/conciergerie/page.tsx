import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { ConciergeForm, type ConciergeInitialValues } from "@/components/concierge/concierge-form";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Conciergerie — On vous aide à trouver la salle idéale | ${siteConfig.name}`,
  description:
    "Confiez-nous votre recherche de salle. Nous vous proposons 3 à 5 lieux compatibles et organisons les visites pour vous.",
  alternates: { canonical: buildCanonical("/conciergerie") },
};

const STEPS = [
  "Vous décrivez votre besoin (2 minutes)",
  "On vous propose une shortlist (3–5 lieux)",
  "On organise les visites",
  "Vous choisissez et on vous aide à finaliser",
];

export default async function ConciergeriePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ville = typeof params.ville === "string" ? params.ville : undefined;
  const departement = typeof params.departement === "string" ? params.departement : undefined;
  const date_debut = typeof params.date_debut === "string" ? params.date_debut : undefined;
  const date_fin = typeof params.date_fin === "string" ? params.date_fin : undefined;
  const personnes_min = typeof params.personnes_min === "string" ? params.personnes_min : undefined;
  const personnes_max = typeof params.personnes_max === "string" ? params.personnes_max : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;

  const { user } = await getUserOrNull();

  const initialValues: ConciergeInitialValues = {
    ville,
    departement,
    date_debut,
    date_fin,
    personnes_min,
    personnes_max,
    type,
  };

  const hasSearchParams = ville || departement || date_debut || date_fin || personnes_min || personnes_max || type;
  const source = hasSearchParams ? "search_zero_results" : "homepage";

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <SiteHeader />
      <main className="container max-w-[800px] px-4 py-12">
        <section className="text-center">
          <h1 className="text-[32px] font-bold leading-tight text-black sm:text-[40px]">
            On vous aide à trouver la bonne salle, plus vite.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-600">
            Vous nous donnez vos critères. On vous propose 3 à 5 lieux compatibles et on organise les visites.
          </p>
          <a href="#form">
            <Button className="mt-6 h-12 bg-gs-orange px-6 hover:brightness-95">
              Confier ma recherche
            </Button>
          </a>
        </section>

        <section id="comment-ca-marche" className="mt-16">
          <h2 className="text-center text-[28px] font-semibold text-black">
            Comment ça marche
          </h2>
          <ul className="mt-8 space-y-4">
            {STEPS.map((step, idx) => (
              <li key={idx} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gs-orange/10 text-[14px] font-semibold text-gs-orange">
                  {idx + 1}
                </span>
                <span className="pt-1.5 text-[15px] font-medium text-slate-800">{step}</span>
                <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-[22px] font-semibold text-black">Brief de recherche</h2>
          <p className="mt-2 text-[14px] text-slate-600">
            Décrivez votre besoin. Nous vous recontactons sous 24–72h avec une shortlist de lieux adaptés.
          </p>
          <div className="mt-6">
            <ConciergeForm
              initialValues={initialValues}
              isLoggedIn={!!user}
              source={source}
            />
          </div>
        </section>

        <p className="mt-8 text-center">
          <Link href="/" className="text-[14px] font-medium text-gs-orange hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
