import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Facebook, Gift, Instagram, Shield, Star, Zap } from "lucide-react";

import { getTrialActivated } from "@/app/actions/trial";
import { getEffectiveUserType } from "@/lib/auth-utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ActiverEssaiButton } from "@/components/home/activer-essai-button";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { HeroSearchBar } from "@/components/home/hero-search-bar";
import { SectionReveal } from "@/components/ui/section-reveal";
import { siteConfig } from "@/config/site";
import { getVilleImage } from "@/config/ville-images";
import { getFeaturedCities } from "@/lib/salles";
import { createClient } from "@/lib/supabase/server";

const plans = [
  {
    name: "Pass 24h",
    price: "9,90€",
    features: ["Demandes illimitées pendant 24h", "Accès complet aux annonces", "Support prioritaire"],
    cta: "Choisir ce pass",
  },
  {
    name: "Pass 48h",
    price: "19,90€",
    badge: "Plus populaire",
    features: ["Demandes illimitées pendant 48h", "Accès complet aux annonces", "Support prioritaire", "Historique des demandes"],
    cta: "Choisir ce pass",
    highlighted: true,
  },
  {
    name: "Abonnement Récurrence",
    price: "29,90€",
    period: "/mois",
    features: ["Demandes illimitées", "Accès complet aux annonces", "Support prioritaire 7j/7", "Gestion multi-événements", "Notifications personnalisées"],
    cta: "Choisir ce pass",
  },
];

const steps = [
  {
    title: "Explorez librement",
    desc: "Parcourez les annonces et découvrez les salles disponibles dans votre région",
  },
  {
    title: "Envoyez vos demandes",
    desc: "Contactez directement les propriétaires pour vérifier la disponibilité",
  },
  {
    title: "Recevez les réponses",
    desc: "Obtenez rapidement des confirmations et organisez votre événement",
  },
];

const faqSectionItems = [
  {
    question: "Comment fonctionne la réservation ?",
    answer:
      "Vous parcourez les annonces, envoyez des demandes aux propriétaires et recevez leurs réponses directement. La plateforme facilite la mise en relation, mais la confirmation finale se fait entre vous et le propriétaire.",
  },
  {
    question: "Les salles sont-elles toutes adaptées aux événements cultuels ?",
    answer:
      "Chaque annonce précise les conditions d'accueil et d'usage. Vous pouvez filtrer selon vos critères pour voir uniquement les lieux compatibles aux cultes, conférences, baptêmes ou autres célébrations.",
  },
  {
    question: "Puis-je annuler une demande ?",
    answer:
      "Oui, vous pouvez retirer une demande depuis votre espace personnel tant qu'elle n'a pas été confirmée par le propriétaire.",
  },
  {
    question: "Pourquoi la recherche est-elle limitée à l'Île-de-France ?",
    answer:
      "salledeculte.com se concentre actuellement sur l'Île-de-France pour offrir un service localisé et de qualité. Toutes les communes de la région sont couvertes pour vous aider à trouver une salle près de chez vous.",
  },
  {
    question: "Comment ajouter ma salle sur la plateforme ?",
    answer:
      "En créant un compte et en cliquant sur « Ajoutez ma salle », vous pouvez publier gratuitement votre lieu. Vous recevrez ensuite des demandes ciblées d'organisateurs d'événements cultuels.",
  },
  {
    question: "Quels types d'événements puis-je organiser ?",
    answer:
      "La plateforme accueille les cultes réguliers, conférences, baptêmes, célébrations, retraites et autres événements à caractère cultuel. Vous pouvez préciser le type lors de votre recherche.",
  },
  {
    question: "La consultation des annonces est-elle payante ?",
    answer:
      "La consultation des annonces est gratuite. Pour envoyer des demandes aux propriétaires, vous aurez besoin d'un pass (24h, 48h ou abonnement) selon vos besoins.",
  },
  {
    question: "Sous quel délai obtient-on une réponse ?",
    answer:
      "Les propriétaires sont notifiés immédiatement de vos demandes. Le délai de réponse varie selon chacun, mais la plupart répondent sous 24 à 48 heures.",
  },
];

export default async function Home() {
  const [cityCards, supabase] = await Promise.all([
    getFeaturedCities(getVilleImage),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const getProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("user_type").eq("id", uid).maybeSingle();
    return data;
  };
  const [trialActivated, userType] = await Promise.all([
    getTrialActivated(user?.id ?? null),
    user ? getEffectiveUserType(user, getProfile) : Promise.resolve(null),
  ]);
  const paiementTrialUrl = userType === "owner" ? "/proprietaire/paiement?trial=1" : "/dashboard/paiement?trial=1";

  return (
    <main className="bg-[#f3f6fa] text-black">
      <SiteHeader />

      <SectionReveal className="relative min-h-[480px] overflow-hidden md:min-h-[560px]">
        <div className="absolute inset-0">
          <Image
            src="/img.png"
            alt="Intérieur d'une salle de culte"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"
            aria-hidden
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center px-4 py-12 md:py-16">
          <h1 className="max-w-3xl text-center text-[28px] font-bold leading-tight text-white sm:text-[38px] md:text-[44px] lg:text-[52px]">
            Le bon espace, pour chaque occasion
          </h1>
          <p className="mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-white/95 sm:text-[16px]">
            Parce que chaque moment mérite un lieu adapté. Découvrez des lieux sélectionnés et vérifiés, pensés pour accueillir vos événements dans les meilleures conditions.
          </p>
          <div className="mt-8 w-full max-w-4xl">
            <HeroSearchBar />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/90">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              Consultation gratuite
            </span>
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0 text-blue-400" />
              Lieux vérifiés
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 text-amber-400" />
              Demandes rapides
            </span>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[46px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">
            Découvrir les lieux en Île-de-France
          </h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">
            Explorez les espaces disponibles dans votre région
          </p>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2 md:grid-cols-3">
            {(cityCards.length > 0 ? cityCards : [
              { city: "Paris", count: 24, image: getVilleImage("Paris") },
              { city: "Versailles", count: 8, image: getVilleImage("Versailles") },
              { city: "Saint-Denis", count: 6, image: getVilleImage("Saint-Denis") },
              { city: "Créteil", count: 9, image: getVilleImage("Créteil") },
              { city: "Nanterre", count: 11, image: getVilleImage("Nanterre") },
              { city: "Boulogne-Billancourt", count: 5, image: getVilleImage("Boulogne-Billancourt") },
            ]).map((item) => (
              <Link
                key={item.city}
                href={`/rechercher?ville=${encodeURIComponent(item.city)}`}
                className="group relative block overflow-hidden rounded-xl border border-slate-200 transition hover:border-slate-300 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image
                    src={item.image}
                    alt={item.city}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-semibold text-white drop-shadow-sm">{item.city}</p>
                    <p className="mt-0.5 text-sm text-white/90">
                      {item.count} lieu{item.count > 1 ? "x" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="categories-evenement" className="bg-slate-50 py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[46px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">
            Catégories d&apos;événement
          </h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">
            Découvrez des espaces exceptionnels adaptés à chaque type d&apos;événement
          </p>
          <div className="mt-10 px-4 sm:px-8">
            <CategoryCarousel />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="comment-ca-marche" className="py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[50px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">Comment ça marche</h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">Trois étapes simples pour trouver votre salle</p>

          <div className="mx-auto mt-9 max-w-5xl">
            <div className="relative">
              <div className="absolute left-10 right-10 top-6 h-px bg-slate-200" />
              <div className="grid gap-4 md:grid-cols-3">
                {steps.map((step, idx) => (
                  <div key={step.title} className="text-center">
                    <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#213398] text-[16px] font-semibold text-white shadow-sm">
                      {idx + 1}
                    </div>
                    <p className="mt-4 text-[28px] font-semibold text-black [zoom:0.5]">{step.title}</p>
                    <p className="mx-auto mt-2 max-w-[210px] text-[22px] leading-[1.45] text-slate-500 [zoom:0.5]">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-[#edf2f7] py-12">
        <div className="container max-w-[1120px]">
          <Card className="mx-auto max-w-3xl rounded-2xl border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.09)]">
            <CardContent className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#213398]/10">
                <Gift className="h-5 w-5 text-black" />
              </div>
              <h3 className="text-[48px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">
                3 demandes offertes pour découvrir la plateforme
              </h3>
              <p className="text-[24px] text-slate-500 [zoom:0.5]">Testez notre service sans engagement et trouvez la salle idéale</p>
              <ActiverEssaiButton isLoggedIn={!!user} trialActivated={trialActivated} paiementTrialUrl={paiementTrialUrl} />
              <p className="text-[11px] text-slate-400">Valable une seule fois</p>
            </CardContent>
          </Card>
        </div>
      </SectionReveal>

      <SectionReveal id="tarifs" className="bg-[#f3f6fa] py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[52px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">Tarifs transparents</h2>
          <p className="mt-1 text-center text-[24px] text-slate-500 [zoom:0.5]">Choisissez la formule adaptée à vos besoins</p>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "h-full border-[#213398] bg-[#213398] text-white shadow-[0_14px_26px_rgba(33,51,152,0.35)]"
                    : "h-full border-slate-200 bg-white"
                }
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="h-6">
                    {plan.badge ? (
                      <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold text-white">{plan.badge}</span>
                    ) : null}
                  </div>
                  <p
                    className={
                      plan.highlighted
                        ? "mt-3 min-h-[50px] text-[19px] font-semibold leading-[1.2] text-white"
                        : "mt-3 min-h-[50px] text-[19px] font-semibold leading-[1.2] text-black"
                    }
                  >
                    {plan.name}
                  </p>
                  <p
                    className={
                      plan.highlighted
                        ? "mt-1 flex min-h-[44px] items-end text-[42px] font-semibold leading-none text-white"
                        : "mt-1 flex min-h-[44px] items-end text-[42px] font-semibold leading-none text-black"
                    }
                  >
                    {plan.price}
                    {plan.period ? (
                      <span className={plan.highlighted ? "mb-1 ml-1 text-[14px] font-medium text-white/90" : "mb-1 ml-1 text-[14px] font-medium text-slate-500"}>{plan.period}</span>
                    ) : null}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className={plan.highlighted ? "flex items-start gap-2 text-[13px] leading-[1.35] text-white/95" : "flex items-start gap-2 text-[13px] leading-[1.35] text-slate-600"}>
                        <CheckCircle2 className={plan.highlighted ? "mt-0.5 h-4 w-4 text-white" : "mt-0.5 h-4 w-4 text-black"} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex-shrink-0">
                    <Button
                      variant={plan.highlighted ? "secondary" : "outline"}
                      className={
                        plan.highlighted
                          ? "h-10 w-full border-0 bg-white text-[14px] font-semibold text-black hover:bg-[#213398]/5"
                          : "h-10 w-full border-0 bg-slate-100 text-[14px] font-semibold text-slate-600 hover:bg-slate-200"
                      }
                  >
                    {plan.cta}
                  </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-12">
        <div className="container max-w-[1120px]">
          <Card className="mx-auto max-w-5xl rounded-2xl border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <CardContent className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-10">
              <div className="space-y-5">
                <h3 className="text-[52px] font-semibold leading-[1.08] tracking-[-0.02em] text-black [zoom:0.5]">Vous possédez une salle ?</h3>
                <p className="max-w-[520px] text-[24px] leading-[1.55] text-slate-500 [zoom:0.5]">
                  Publiez votre lieu gratuitement et recevez des demandes ciblées de la part d&apos;organisateurs d&apos;événements cultuels
                </p>
                <Link href="/auth?tab=signup" className="mt-6 inline-block">
                  <Button className="h-10 rounded-md bg-[#213398] px-6 text-[14px] font-semibold text-white hover:bg-[#1a2980]">
                    Ajoutez ma salle
                  </Button>
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Image
                  src="/img2.png"
                  alt="Photo de salle"
                  width={1200}
                  height={700}
                  className="h-[230px] w-full object-cover object-center"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionReveal>

      <SectionReveal id="faq" className="pb-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[52px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">Questions fréquentes</h2>
          <p className="mt-1 text-center text-[24px] text-slate-500 [zoom:0.5]">Tout ce que vous devez savoir</p>
          <div className="mx-auto mt-6 max-w-4xl">
            <Accordion type="single" collapsible defaultValue="item-0">
              {faqSectionItems.map((item, index) => (
                <AccordionItem key={item.question} value={`item-${index}`} className="mb-3 rounded-xl border-0 bg-[#eef2f6] px-4">
                  <AccordionTrigger className="py-4 text-[15px] font-semibold text-black hover:no-underline">{item.question}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-[13px] leading-[1.5] text-slate-500">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </SectionReveal>

      <footer className="bg-[#213398] py-12 text-slate-300">
        <div className="container max-w-[1120px]">
          <div className="grid gap-8 md:grid-cols-4 md:items-start">
            <div>
              <Link href="/" className="flex items-center text-xl font-semibold leading-none text-white hover:text-white">
                <Image src="/loheadb.png" alt="" width={60} height={60} className="h-[60px] w-[60px] shrink-0 object-contain -mr-3" />
                {siteConfig.name}
              </Link>
              <p className="mt-3 max-w-[240px] text-[12px] leading-[1.6] text-slate-300">
                La plateforme de référence pour trouver et proposer des salles dédiées aux événements cultuels.
              </p>
            </div>
            <div>
              <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Plateforme</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li><Link href="/rechercher" className="hover:text-white">Rechercher une salle</Link></li>
                <li><Link href="/auth?tab=signup" className="hover:text-white">Ajoutez ma salle</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Entreprise</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li>À propos</li>
                <li>
                  <a href="mailto:contact@salledeculte.com" className="hover:text-white">Contact</a>
                </li>
                <li><Link href="/#categories-evenement" className="hover:text-white">Catégories</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Légal</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li>Mentions légales</li>
                <li>CGU</li>
                <li>Confidentialité</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 h-px w-full bg-white/15" />

          <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-[13px] text-slate-300">© 2025 {siteConfig.name}. Tous droits réservés.</p>
            <div className="flex items-center gap-3">
              {[Facebook, Instagram].map((Icon, index) => (
                <a key={index} href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
