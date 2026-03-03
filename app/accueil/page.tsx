import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, Facebook, Headphones, Instagram, Shield, Star, Zap } from "lucide-react";

import { buildCanonical } from "@/lib/seo";
import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { CategoryRotatingBold } from "@/components/home/category-rotating-bold";
import { HeroBackgroundCarousel } from "@/components/home/hero-background-carousel";
import { HeroSearchBar } from "@/components/home/hero-search-bar";
import { InstallAppPopup } from "@/components/home/install-app-popup";
import { PourquoiReserverCarousel } from "@/components/home/pourquoi-reserver-carousel";
import { SectionReveal } from "@/components/ui/section-reveal";
import { siteConfig } from "@/config/site";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { getFeaturedDepartments } from "@/lib/salles";
import { getUserOrNull } from "@/lib/supabase/server";

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
      "En créant un compte et en cliquant sur « Ajoutez ma salle », vous pouvez publier gratuitement votre lieu. Vous recevrez ensuite des demandes ciblées de locataires d'événements cultuels.",
  },
  {
    question: "Quels types d'événements puis-je organiser ?",
    answer:
      "La plateforme accueille les cultes réguliers, conférences, baptêmes, célébrations, retraites et autres événements à caractère cultuel. Vous pouvez préciser le type lors de votre recherche.",
  },
];

export const metadata: Metadata = {
  alternates: { canonical: buildCanonical("/accueil") },
};

export default async function Home() {
  const [departmentCards, authResult] = await Promise.all([
    getFeaturedDepartments(),
    getUserOrNull(),
  ]);
  const { user } = authResult;

  return (
    <main className="bg-[#f3f6fa] text-black">
      <SiteHeader />
      <InstallAppPopup />

      <SectionReveal id="recherche" className="relative min-h-[480px] overflow-hidden md:min-h-[560px]">
        <HeroBackgroundCarousel />
        <div className="container relative z-10 flex flex-col items-center px-4 py-12 md:py-16">
          <h1 className="max-w-3xl text-center text-[28px] font-bold leading-tight text-white sm:text-[38px] md:text-[44px] lg:text-[52px]">
            Trouvez et réservez un lieu adapté en toute sérénité
          </h1>
          <p className="mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-white/95 sm:text-[16px]">
            Des lieux sélectionnés et vérifiés pour accueillir vos cultes et évènements.
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

      <PourquoiReserverCarousel />

      {departmentCards.length > 0 && (
      <SectionReveal className="bg-white py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[46px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">
            Découvrir les lieux en Île-de-France
          </h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">
            Explorez les espaces disponibles par département
          </p>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2 md:grid-cols-3">
            {departmentCards.map((item) => (
              <Link
                key={item.departmentCode}
                href={`/rechercher?departement=${encodeURIComponent(item.departmentCode)}`}
                className="group relative block overflow-hidden rounded-xl border border-slate-200 transition hover:border-slate-300 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image
                    src={item.image}
                    alt={item.departmentLabel}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div
                    className="absolute inset-0 bg-black/15 transition duration-300 group-hover:bg-black/20"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-semibold text-white drop-shadow-sm">
                      {item.departmentLabel} ({item.departmentCode})
                    </p>
                    <p className="mt-0.5 text-sm text-white/90">
                      {item.count} salle{item.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SectionReveal>
      )}

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

      <SectionReveal className="relative min-h-[320px] overflow-hidden sm:min-h-[400px]">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=85"
            alt=""
            fill
            className="object-cover object-center"
            priority={false}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/55" aria-hidden />
        </div>
        <div className="relative z-10 flex min-h-[320px] items-center justify-center px-4 sm:min-h-[400px]">
          <h2 className="text-center text-[36px] font-bold leading-tight text-white drop-shadow-md sm:text-[48px] md:text-[56px]">
            Plus que de simples{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              espaces
            </span>
            , vos lieux pour les moments essentiels
          </h2>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white py-14">
        <div className="container max-w-[1200px]">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-stretch lg:gap-14">
            <div className="flex flex-col">
              <h2 className="text-[36px] font-semibold leading-tight text-black sm:text-[44px]">
                {siteConfig.name} pour chaque{" "}
                <span className="font-bold text-[#213398]">occasion</span>
              </h2>
              <CategoryRotatingBold />
              <Link
                href="/#recherche"
                className="mt-10 inline-flex h-11 w-fit shrink-0 items-center justify-center rounded-lg bg-[#213398] px-4 text-base font-semibold text-white transition hover:bg-[#1a2980]"
              >
                Trouvez une salle
              </Link>
            </div>
            <div className="relative min-h-[320px] overflow-hidden rounded-xl sm:min-h-[380px] lg:min-h-0 lg:h-full">
              <Image
                src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=85"
                alt="Salle adaptée aux événements cultuels"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="comment-ca-marche" className="py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[46px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">
            Comment ça marche
          </h2>
          <p className="mt-2 text-center text-[25px] text-slate-500 [zoom:0.5]">
            Trois étapes pour réserver en toute simplicité
          </p>
          <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-8">
            {steps.flatMap((step, idx) => [
              <div
                key={step.title}
                className="w-full max-w-[360px] flex-1 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm transition hover:border-[#213398]/30 hover:shadow-md sm:max-w-none"
              >
                <div className="flex items-start gap-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#213398]/20 bg-[#213398]/5 text-base font-semibold text-[#213398]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold text-black">{step.title}</p>
                    <p className="mt-3 text-base leading-snug text-slate-500">{step.desc}</p>
                  </div>
                </div>
              </div>,
              ...(idx < steps.length - 1
                ? [
                    <ChevronRight
                      key={`arrow-${idx}`}
                      className="h-8 w-8 shrink-0 rotate-90 text-slate-300 sm:rotate-0"
                      aria-hidden
                    />,
                  ]
                : []),
            ])}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="proprietaire" className="bg-white py-16">
        <div className="container max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div>
              <h2 className="text-[32px] font-bold tracking-tight text-black sm:text-[40px] lg:text-[48px]">
                Pourquoi lister votre salle chez nous ?
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-slate-600">
                Mettez-le en ligne dès aujourd&apos;hui et gérez simplement vos demandes, visites et paiements.
              </p>
              <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
                Une plateforme claire, conçue pour simplifier votre organisation.
              </p>
              <Link
                href="/avantages"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#213398] px-6 text-[15px] font-semibold text-white transition hover:bg-[#1a2980]"
              >
                Voir les avantages
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="relative flex flex-col items-center">
              <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl shadow-lg">
                <Image
                  src="/images/proprietaire-lifestyle.png"
                  alt="Un propriétaire gère ses annonces depuis chez lui"
                  width={800}
                  height={534}
                  className="h-auto w-full object-cover"
                />
              </div>
              <div id="avantages" className="mt-4 flex flex-wrap justify-center gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-center">
                  <p className="text-[18px] font-bold tracking-tight text-black">100%</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-600">Gratuit</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-center">
                  <p className="text-[18px] font-bold tracking-tight text-black">5min</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-600">Mise en ligne</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-center">
                  <p className="text-[18px] font-bold tracking-tight text-black">24/7</p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-600">Gestion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="blog" className="bg-slate-50 py-12">
        <div className="container max-w-[1120px]">
          <h2 className="text-center text-[52px] font-semibold tracking-[-0.02em] text-black [zoom:0.5]">Blog</h2>
          <p className="mt-1 text-center text-[24px] text-slate-500 [zoom:0.5]">Conseils et guides pour vos événements</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.slice(0, 3).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block h-full">
                <Card className="flex h-full flex-col overflow-hidden transition hover:border-slate-300 hover:shadow-md">
                  <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-200">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <h3 className="text-[17px] font-semibold leading-snug text-black">{post.title}</h3>
                    <p className="line-clamp-2 flex-1 text-[14px] leading-[1.45] text-slate-600">{post.excerpt}</p>
                    <span className="mt-auto flex items-center gap-1 text-[13px] font-medium text-[#213398]">
                      Lire l&apos;article
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg bg-[#213398] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#1a2980]"
            >
              Voir tous les articles
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal id="faq" className="pt-12 pb-12">
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
            <div className="mt-6 text-center">
              <Link href="/centre-aide" className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#213398] hover:underline">
                Accéder au centre d&apos;aide →
              </Link>
            </div>
          </div>
        </div>
      </SectionReveal>

      <footer className="bg-[#213398] py-12 text-slate-300">
        <div className="container max-w-[1120px]">
          <div className="grid gap-8 md:grid-cols-4 md:items-start">
            <div>
              <Link href="/" className="flex items-center text-xl font-semibold leading-none text-white hover:text-white">
                <Image src="/logosdcbl.png" alt="" width={60} height={60} className="h-[60px] w-[60px] shrink-0 object-contain -mr-3" />
                {siteConfig.name}
              </Link>
              <p className="mt-3 max-w-[240px] text-[12px] leading-[1.6] text-slate-300">
                La plateforme de référence pour trouver et proposer des salles dédiées aux événements cultuels.
              </p>
            </div>
            <div>
              <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Plateforme</p>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
                <li><Link href="/#recherche" className="hover:text-white">Rechercher une salle</Link></li>
                <li><Link href="/auth?tab=signup&userType=owner" className="hover:text-white">Ajoutez ma salle</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/centre-aide" className="hover:text-white">Centre d&apos;aide</Link></li>
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
                <li><Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></li>
                <li><Link href="/cgu" className="hover:text-white">CGU</Link></li>
                <li><Link href="/confidentialite" className="hover:text-white">Confidentialité</Link></li>
                <li><Link href="/cookies" className="hover:text-white">Cookies</Link></li>
                <li>
                  <CookiePreferencesLink className="hover:text-white">Gérer mes cookies</CookiePreferencesLink>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 h-px w-full bg-white/15" />

          <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-[13px] text-slate-300">© 2025 {siteConfig.name}. Tous droits réservés.</p>
            <div className="flex items-center gap-3">
              <a
                href={siteConfig.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
