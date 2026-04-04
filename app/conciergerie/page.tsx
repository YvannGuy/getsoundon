import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { ConciergeForm, type ConciergeInitialValues } from "@/components/concierge/concierge-form";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { getLandingHeaderProps } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Conciergerie — Aide à la recherche matériel & événement | ${siteConfig.name}`,
  description:
    "Décrivez votre besoin matériel ou logistique : l’équipe GetSoundOn vous oriente vers le catalogue et des pistes adaptées.",
  alternates: { canonical: buildCanonical("/conciergerie") },
};

const STEPS = [
  "Vous décrivez votre besoin (2 minutes)",
  "On vous propose des pistes (matériel, prestataires, options)",
  "On vous aide à cadrer les prochaines étapes",
  "Vous validez sur la plateforme quand vous êtes prêt",
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

  const { user, supabase } = await getUserOrNull();
  const {
    publishListingHref,
    dashboardHref,
    userType,
    draftCartPreview,
    accountAvatarUrl,
    accountDisplayName,
    accountEmail,
  } = await getLandingHeaderProps(user, supabase);

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
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader
        publishListingHref={publishListingHref}
        dashboardHref={dashboardHref}
        userType={userType}
        draftCartPreview={draftCartPreview}
        accountAvatarUrl={accountAvatarUrl}
        accountDisplayName={accountDisplayName}
        accountEmail={accountEmail}
      />
      <main className="landing-container max-w-[800px] px-4 py-12">
        <section className="text-center">
          <h1 className="text-[32px] font-bold leading-tight text-black sm:text-[40px]">
            On vous aide à cadrer votre besoin matériel.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-600">
            Décrivez votre événement et votre besoin (sono, lumière, logistique). Nous vous répondons avec des pistes
            alignées sur le catalogue GetSoundOn.
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
            Décrivez votre besoin. Nous vous recontactons sous 24–72h avec des recommandations matériel / prestataires.
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
      <LandingFooter isLoggedIn={!!user} publishListingHref={publishListingHref} />
    </div>
  );
}
