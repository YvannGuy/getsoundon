import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  Check,
  Mail,
  Search,
  SlidersHorizontal,
  Speaker,
  User,
} from "lucide-react";

import { HowItWorksContactForm } from "@/components/landing/how-it-works-contact-form";
import { siteConfig } from "@/config/site";

const IMG_HERO =
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80";
const IMG_BOOK_1 =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80";
const IMG_BOOK_2 =
  "https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=900&q=80";
const IMG_BOOK_3 =
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80";

const OWNER_HREF = "/auth?tab=signup&userType=owner";
const CATALOGUE_HREF = "/catalogue";

const LISTING_STEPS = [
  {
    n: 1,
    title: "Création de votre annonce",
    text: "Ajoutez votre matériel en quelques minutes : titre, catégorie, photos, prix, description, disponibilité, options de livraison ou retrait.",
  },
  {
    n: 2,
    title: "Vérification et validation",
    text: "Une fois créée, votre annonce est vérifiée afin de s’assurer qu’elle est complète, claire et conforme aux standards de qualité de GetSoundOn.",
  },
  {
    n: 3,
    title: "Mise en ligne et gestion",
    text: "Votre annonce est en ligne. Vous pouvez recevoir des demandes, gérer vos disponibilités, échanger avec les clients et suivre vos réservations.",
  },
] as const;

const BOOKING_STEPS = [
  {
    title: "Recherche adaptée",
    text: "Utilisez GetSoundOn pour trouver rapidement du matériel sono, lumière, DJ, vidéo, micros ou packs événementiels.",
    img: IMG_BOOK_1,
    Icon: Search,
  },
  {
    title: "Configuration",
    text: "Consultez la disponibilité du matériel, choisissez les options nécessaires comme la livraison, l’installation ou un technicien.",
    img: IMG_BOOK_2,
    Icon: SlidersHorizontal,
  },
  {
    title: "Confirmation",
    text: "Contactez le prestataire ou réservez directement selon l’annonce. Recevez une confirmation avec les détails utiles.",
    img: IMG_BOOK_3,
    Icon: Check,
  },
] as const;

const CLIENT_BULLETS = [
  "Trouver rapidement tout votre matériel au même endroit",
  "Réserver en quelques étapes avec un paiement sécurisé",
  "Choisir des options de service adaptées",
  "Gagner du temps sur l’organisation de vos événements",
] as const;

const PROVIDER_BULLETS = [
  "Mettre son matériel en valeur auprès d’une audience qualifiée",
  "Recevoir des demandes de réservation centralisées",
  "Gérer ses annonces et réservations avec simplicité",
  "Développer ses revenus grâce au matériel sous-utilisé",
] as const;

export function HowItWorksView() {
  return (
    <main>
      {/* Hero */}
      <section className="landing-container pb-14 pt-10 sm:pb-16 sm:pt-12 md:pb-20 md:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16">
          <div className="min-w-0">
            <h1 className="font-landing-heading text-3xl font-bold leading-tight tracking-tight text-gs-dark sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
              Louez et réservez en toute simplicité
            </h1>
            <p className="font-landing-body mt-5 max-w-xl text-base leading-relaxed text-[#444] sm:text-lg">
              Découvrez comment GetSoundOn facilite la location de matériel événementiel entre particuliers et
              prestataires.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={OWNER_HREF}
                className="font-landing-btn inline-flex min-h-[48px] items-center justify-center rounded-lg bg-gs-orange px-6 py-3 text-center text-white transition hover:brightness-105 sm:px-7"
              >
                Mettre mon matériel en location
              </Link>
              <Link
                href={CATALOGUE_HREF}
                className="font-landing-btn inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 border-gs-line bg-white px-6 py-3 text-center text-gs-dark transition hover:bg-white/90 sm:px-7"
              >
                Explorer le catalogue
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-gs-line shadow-ds-ambient sm:aspect-[4/5] lg:aspect-[3/4] lg:max-h-[min(520px,70vh)]">
              <Image
                src={IMG_HERO}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mettre son matériel en location */}
      <section className="border-t border-gs-line/80 bg-white py-14 sm:py-16 md:py-20">
        <div className="landing-container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-landing-section-title text-gs-dark">Mettre son matériel en location</h2>
            <p className="font-landing-body mt-3 text-[#555] sm:text-lg">
              Les 3 étapes essentielles pour publier votre matériel sur GetSoundOn
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-5 lg:mt-14 lg:gap-8">
            {LISTING_STEPS.map((step) => (
              <article
                key={step.n}
                className="flex h-full flex-col rounded-xl border border-gs-line bg-gs-beige/50 p-6 shadow-sm sm:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gs-orange/12 text-lg font-bold text-gs-orange">
                  {step.n}
                </div>
                <h3 className="font-landing-heading mt-5 text-lg font-bold text-gs-dark">{step.title}</h3>
                <p className="font-landing-body mt-3 flex-1 text-sm leading-relaxed text-[#555]">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Réserver du matériel */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="landing-container">
          <div className="mb-10 text-left md:mb-12 md:text-right">
            <h2 className="font-landing-section-title text-gs-dark">Réserver du matériel</h2>
            <p className="font-landing-body mt-3 text-[#555] sm:text-lg md:ml-auto md:max-w-xl">
              Trouvez et réservez ce qu&apos;il vous faut en 3 étapes simples
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
            {BOOKING_STEPS.map((step) => (
              <article key={step.title} className="flex flex-col overflow-hidden rounded-xl border border-gs-line bg-white shadow-sm">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1a1a1a]">
                  <Image
                    src={step.img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <step.Icon className="h-6 w-6 text-gs-orange" strokeWidth={2} aria-hidden />
                  <h3 className="font-landing-heading mt-3 text-lg font-bold text-gs-dark">{step.title}</h3>
                  <p className="font-landing-body mt-2 text-sm leading-relaxed text-[#555]">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi GetSoundOn */}
      <section className="border-t border-gs-line/80 bg-white py-14 sm:py-16 md:py-20">
        <div className="landing-container">
          <h2 className="font-landing-section-title text-center text-gs-dark">Pourquoi utiliser GetSoundOn ?</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8 lg:mt-14">
            <article className="rounded-2xl border border-gs-line bg-gs-beige/40 p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gs-orange/12">
                  <User className="h-5 w-5 text-gs-orange" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="font-landing-heading text-xl font-bold text-gs-dark">Pour les clients</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {CLIENT_BULLETS.map((line) => (
                  <li key={line} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" strokeWidth={2.5} aria-hidden />
                    <span className="font-landing-body text-[15px] leading-snug text-[#333]">{line}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-gs-line bg-gs-beige/40 p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gs-orange/12">
                  <Briefcase className="h-5 w-5 text-gs-orange" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="font-landing-heading text-xl font-bold text-gs-dark">Pour les prestataires</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {PROVIDER_BULLETS.map((line) => (
                  <li key={line} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-gs-orange" strokeWidth={2.5} aria-hidden />
                    <span className="font-landing-body text-[15px] leading-snug text-[#333]">{line}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="landing-container">
          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            <div className="relative overflow-hidden rounded-2xl border border-gs-line bg-[#ece8e4] p-8 shadow-sm sm:p-10">
              <Speaker
                className="pointer-events-none absolute -right-4 -bottom-6 h-40 w-40 text-black/[0.06] sm:h-48 sm:w-48"
                strokeWidth={1}
                aria-hidden
              />
              <h3 className="font-landing-heading relative max-w-[280px] text-xl font-bold leading-snug text-gs-dark sm:text-2xl">
                Louez votre matériel et développez vos revenus
              </h3>
              <Link
                href={OWNER_HREF}
                className="font-landing-btn relative mt-8 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-gs-orange px-6 py-3 text-white transition hover:brightness-105"
              >
                Mettre mon matériel en location
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-gs-line bg-[#ece8e4] p-8 shadow-sm sm:p-10">
              <Speaker
                className="pointer-events-none absolute -right-4 -bottom-6 h-40 w-40 text-black/[0.06] sm:h-48 sm:w-48"
                strokeWidth={1}
                aria-hidden
              />
              <h3 className="font-landing-heading relative max-w-[320px] text-xl font-bold leading-snug text-gs-dark sm:text-2xl">
                Besoin de matériel pour votre prochain événement ?
              </h3>
              <Link
                href={CATALOGUE_HREF}
                className="font-landing-btn relative mt-8 inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 border-gs-dark/25 bg-white px-6 py-3 text-gs-dark transition hover:bg-white/95"
              >
                Explorer le catalogue
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-gs-line/80 bg-white py-14 sm:py-16 md:py-20">
        <div className="landing-container">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div>
              <h2 className="font-landing-section-title text-gs-dark">Une question ?</h2>
              <p className="font-landing-body mt-4 max-w-md text-[15px] leading-relaxed text-[#555] sm:text-base">
                Notre équipe est à votre disposition pour vous accompagner dans la réussite de vos événements ou la
                gestion de vos annonces.
              </p>
              <ul className="mt-8 space-y-4">
                <li>
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-landing-body inline-flex items-center gap-3 text-[15px] font-medium text-gs-dark hover:text-gs-orange"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gs-orange/12">
                      <Mail className="h-5 w-5 text-gs-orange" strokeWidth={2} aria-hidden />
                    </span>
                    {siteConfig.supportEmail}
                  </a>
                </li>
              </ul>
            </div>
            <HowItWorksContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
