import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, MapPin, Package, Truck, Zap } from "lucide-react";

import { LandingReveal } from "@/components/landing/LandingReveal";
import {
  CATALOGUE_SEGMENT_ORDER,
  CATALOGUE_SEGMENTS,
  type CatalogueSegmentSlug,
} from "@/lib/catalogue-segments";

/** Visuels par segment — filtres réels dans `/api/listings?segment=…` (catégorie + mots-clés). */
const CATALOGUE_TILE_IMAGES: Record<CatalogueSegmentSlug, string> = {
  enceintes:
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80&auto=format&fit=crop",
  lumieres:
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80&auto=format&fit=crop",
  dj: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80&auto=format&fit=crop",
  videoprojecteurs:
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80&auto=format&fit=crop",
  microphones:
    "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=600&q=80&auto=format&fit=crop",
  "tables-mixage":
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80&auto=format&fit=crop",
};

function catalogueTileHref(slug: CatalogueSegmentSlug): string {
  return `/items?segment=${encodeURIComponent(slug)}`;
}

const popular = [
  {
    badge: "Populaire",
    title: "JBL EON 715",
    price: "26",
    img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80&auto=format&fit=crop",
  },
  {
    badge: "Nouveau",
    title: "Pioneer XDJ-RR",
    price: "45",
    img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80&auto=format&fit=crop",
  },
  {
    badge: "Populaire",
    title: "Shure SM58",
    price: "8",
    img: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=600&q=80&auto=format&fit=crop",
  },
];

/** Logos `public/images/logobrand` — grille type vitrine (cartes blanches, logos centrés) */
const marquesLogos: { src: string; alt: string }[] = [
  { src: "/images/logobrand/pioneer-dj.jpg.png", alt: "Pioneer DJ" },
  { src: "/images/logobrand/Shure_Logo.svg.png", alt: "Shure" },
  { src: "/images/logobrand/Sennheiser-logo-new.png", alt: "Sennheiser" },
  { src: "/images/logobrand/Bose_Logo.png", alt: "Bose" },
  { src: "/images/logobrand/yamaha_logo_black-42.jpg", alt: "Yamaha" },
  { src: "/images/logobrand/rcf.png", alt: "RCF" },
  { src: "/images/logobrand/fbt.png", alt: "FBT" },
  { src: "/images/logobrand/images.png", alt: "Marque partenaire" },
];

export function LandingFeaturesStrip() {
  return (
    <section className="landing-section bg-white">
      <div className="landing-container grid gap-10 md:grid-cols-3 md:gap-8">
        {[
          {
            icon: MapPin,
            title: "Disponible près de toi",
            desc: "Trouve du matériel proche de ton lieu d’événement, sans perdre de temps.",
          },
          {
            icon: Package,
            title: "Prêts à réserver",
            desc: "Des packs et configurations prêtes à l’emploi, réservables en quelques clics.",
          },
          {
            icon: Truck,
            title: "Livraison & installation",
            desc: "Options de retrait, livraison et mise en service selon les annonces.",
          },
        ].map((item) => (
          <div key={item.title} className="flex flex-col items-center text-center md:items-start md:text-left">
            <item.icon className="h-8 w-8 text-gs-orange" strokeWidth={1.75} aria-hidden />
            <h3 className="font-landing-heading mt-4 text-lg font-bold text-gs-dark">{item.title}</h3>
            <p className="font-landing-body mt-2 text-[#444]">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingCatalogue() {
  return (
    <section className="landing-section bg-gs-beige">
      <div className="landing-container">
        <h2 className="font-landing-section-title text-center text-gs-dark">Parcourez le catalogue</h2>
        <p className="font-landing-body mx-auto mt-3 max-w-2xl text-center text-[#444]">
          Louez parmi des centaines de matériels pour vos événements.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOGUE_SEGMENT_ORDER.map((slug) => {
            const label = CATALOGUE_SEGMENTS[slug].label;
            const img = CATALOGUE_TILE_IMAGES[slug];
            return (
              <Link
                key={slug}
                href={catalogueTileHref(slug)}
                className="group relative block overflow-hidden rounded-2xl shadow-md transition duration-300 hover:scale-[1.03] hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={img}
                    alt={label}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                    aria-hidden
                  />
                  <span className="font-landing-heading absolute bottom-4 left-4 text-xl font-bold text-white md:text-2xl">
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function LandingPopularModels() {
  return (
    <section className="landing-section bg-white">
      <div className="landing-container">
        <h2 className="font-landing-section-title text-center text-gs-dark">Modèles populaires</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((p) => (
            <div
              key={p.title}
              className="group overflow-hidden rounded-2xl border border-gs-line bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={p.img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                />
                <span className="font-landing-badge absolute left-3 top-3 rounded-full bg-gs-orange px-3 py-1 text-white">
                  {p.badge}
                </span>
              </div>
              <div className="p-5">
                <p className="font-landing-heading text-lg font-bold text-gs-dark">{p.title}</p>
                <p className="font-landing-body mt-1 text-[#444]">À partir de {p.price} € / jour</p>
                <Link
                  href="/catalogue"
                  className="font-landing-btn mt-4 inline-flex w-full items-center justify-center rounded-md bg-gs-orange py-3 text-white transition hover:brightness-105"
                >
                  Réserver
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingInfoStrip() {
  return (
    <section className="landing-section bg-gs-beige">
      <div className="landing-container flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <Zap className="h-8 w-8 text-gs-orange" />
            <h3 className="font-landing-heading mt-4 text-lg font-bold text-gs-dark">Filtres intelligents</h3>
            <p className="font-landing-body mt-2 text-[#444]">
            Affinez par ville, type de matériel, budget et disponibilités.
          </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <Headphones className="h-8 w-8 text-gs-orange" />
            <h3 className="font-landing-heading mt-4 text-lg font-bold text-gs-dark">Assurance incluse</h3>
            <p className="font-landing-body mt-2 text-[#444]">
            Des options de protection selon les annonces et partenaires.
          </p>
          </div>
          <Link
            href="/comment-ca-marche"
            className="group flex flex-col justify-between rounded-2xl bg-gs-orange p-6 text-white shadow-md transition hover:brightness-105 hover:shadow-lg"
          >
            <div>
              <h3 className="font-landing-heading text-lg font-bold">Je découvre GetSoundOn</h3>
              <p className="font-landing-body mt-2 text-sm text-white/95">
                Découvre comment ça marche : louer du matériel ou le mettre en ligne, en quelques étapes.
              </p>
            </div>
            <ArrowRight className="mt-6 h-6 w-6 self-end transition group-hover:translate-x-1" />
          </Link>
        </div>

        <LandingReveal>
          <div className="flex flex-col items-stretch justify-between gap-6 rounded-2xl border border-gs-line bg-white p-6 shadow-sm md:flex-row md:items-center md:p-8">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gs-beige">
                <Zap className="h-7 w-7 text-gs-orange" />
              </div>
              <div>
                <h3 className="font-landing-heading text-xl font-bold text-gs-dark">Réservation rapide</h3>
                <p className="font-landing-body mt-2 max-w-xl text-[#444]">
                  Envoie une demande, reçois une offre et paie en ligne en toute sécurité.
                </p>
              </div>
            </div>
            <Zap className="hidden h-16 w-16 shrink-0 text-gs-orange md:block" strokeWidth={1.25} />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingBrands() {
  return (
    <section id="marques" className="landing-section scroll-mt-24 bg-gs-beige">
      <div className="landing-container">
        <h2 className="font-landing-section-title text-center text-gs-dark">
          Les marques disponibles sur GetSoundOn
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-5 lg:gap-6">
          {marquesLogos.map(({ src, alt }) => (
            <div
              key={src}
              className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] md:rounded-2xl"
            >
              <div className="absolute inset-0 p-4 sm:p-5 md:p-6">
                <div className="relative h-full w-full">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="(max-width: 640px) 45vw, 22vw"
                    className="object-contain object-center grayscale transition duration-300 hover:grayscale-0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
