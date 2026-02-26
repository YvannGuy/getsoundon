import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ListChecks,
  Lock,
  MapPin,
  Phone,
  Car,
  CookingPot,
  Piano,
  Shield,
  Tv,
  Volume2,
  Users,
  Wifi,
} from "lucide-react";

import { UnlockAccessBloc } from "@/components/salles/unlock-access-bloc";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LocationAvailabilityCalendar } from "@/components/salles/location-availability-calendar";
import { SalleActionsBar } from "@/components/salles/salle-actions-bar";
import { SalleGallery } from "@/components/salles/salle-gallery";
import { SalleMap } from "@/components/salles/salle-map";
import { isFavori } from "@/app/actions/favoris";
import { getSalleRecentViewerCount, recordSalleView } from "@/app/actions/salle-views";
import { getSalleRatingStats } from "@/app/actions/salle-ratings";
import { getEffectiveUserType } from "@/lib/auth-utils";
import { hasAccessToContact } from "@/lib/pass-utils";
import { getBlockedLocationDatesForSalle } from "@/lib/location-disponibilite";
import { createClient } from "@/lib/supabase/server";
import { buildCanonical, defaultMetadata } from "@/lib/seo";
import { getSalleBySlug, getSallesByCity } from "@/lib/salles";
import { getSallePriceFrom, getSalleTarifParts } from "@/lib/types/salle";
import { siteConfig } from "@/config/site";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  check: CheckCircle2,
  parking: Car,
  wheelchair: CheckCircle2,
  furniture: ListChecks,
  speaker: Volume2,
  wifi: Wifi,
  clock: Clock,
  volume: Volume2,
  list: ListChecks,
  piano: Piano,
  video: Tv,
  kitchen: CookingPot,
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<import("next").Metadata> {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) return { title: "Salle introuvable" };

  const title = `${salle.name} - ${salle.city} | ${siteConfig.name}`;
  const priceFrom = getSallePriceFrom(salle);
  const description =
    salle.description?.slice(0, 155) + (salle.description?.length > 155 ? "…" : "") ||
    `Salle ${salle.name} à ${salle.city}. Capacité ${salle.capacity} personnes.${priceFrom ? ` À partir de ${priceFrom.value} € ${priceFrom.label}` : ""}`;
  const canonical = buildCanonical(`/salles/${slug}`);
  const ogImage = salle.images?.[0] || `${siteConfig.url}/og-image.png`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...defaultMetadata.openGraph,
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: salle.name }],
    },
    twitter: {
      ...defaultMetadata.twitter,
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SalleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const getProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("user_type").eq("id", uid).maybeSingle();
    return data;
  };
  const userType = user ? await getEffectiveUserType(user, getProfile) : null;
  const [favori, ratingStats, recentViewerCount, canContact, blockedLocationDates] = await Promise.all([
    isFavori(user?.id ?? null, salle.id),
    getSalleRatingStats(salle.id),
    getSalleRecentViewerCount(salle.id),
    hasAccessToContact(user?.id ?? null),
    getBlockedLocationDatesForSalle(salle.id),
  ]);
  const isOwnSalle = salle.ownerId === user?.id;
  const isLoggedIn = !!user;

  recordSalleView(salle.id, user?.id ?? null);

  const nearbySalles = await getSallesByCity(salle.city, slug);
  const tarifParts = getSalleTarifParts(salle);
  const priceFrom = getSallePriceFrom(salle);
  const canonical = buildCanonical(`/salles/${slug}`);
  const minTarif = tarifParts.length > 0 ? Math.min(...tarifParts.map((t) => t.value)) : null;
  const decisionRapideSortedTarifs = [...tarifParts].sort((a, b) => b.value - a.value);
  const decisionRapideTopTarif = decisionRapideSortedTarifs[0] ?? null;
  const decisionRapideTarifs = decisionRapideSortedTarifs
    .slice(1)
    .map((p) => `${p.value} € ${p.label}`)
    .join(" · ");
  const salleStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Rechercher",
            item: `${siteConfig.url}/rechercher`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: salle.name,
            item: canonical,
          },
        ],
      },
      {
        "@type": "Place",
        name: salle.name,
        description: salle.description,
        url: canonical,
        image: salle.images.slice(0, 5),
        address: {
          "@type": "PostalAddress",
          addressLocality: salle.city,
          addressCountry: "FR",
        },
        ...(minTarif
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: minTarif,
                availability: "https://schema.org/InStock",
                url: canonical,
              },
            }
          : {}),
        ...(ratingStats.count > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: ratingStats.avg,
                reviewCount: ratingStats.count,
              },
            }
          : {}),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(salleStructuredData) }}
      />

      <main className="container max-w-[1120px] py-8 pb-28 lg:pb-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <SalleGallery images={salle.images} name={salle.name} slug={slug} />
            <SalleActionsBar
              salleId={salle.id}
              salleName={salle.name}
              slug={slug}
              isLoggedIn={!!user}
              initialIsFavori={favori}
              initialRating={ratingStats}
            />

            <div className="space-y-8">
              <div>
                <h1 className="text-[28px] font-bold text-black">{salle.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {salle.city}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#213398]/10 px-3 py-1 text-[13px] font-medium text-black">
                    <Users className="h-4 w-4" />
                    Jusqu&apos;à {salle.capacity} personnes
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Annonce vérifiée
                  </span>
                </div>
              </div>

              <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Décision rapide
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#213398]">
                      {decisionRapideTopTarif
                        ? `${decisionRapideTopTarif.value} € ${decisionRapideTopTarif.label}`
                        : "Tarifs sur demande"}
                    </p>
                    {decisionRapideTarifs && (
                      <p className="mt-1 text-sm text-slate-600">{decisionRapideTarifs}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Réponse rapide des propriétaires
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        Adresse précise communiquée après confirmation de la visite
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-[240px]">
                    {isOwnSalle ? (
                      <Link href="/proprietaire/annonces">
                        <Button className="h-11 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                          Gérer mon annonce
                        </Button>
                      </Link>
                    ) : canContact ? (
                      <>
                        <Link href={`/salles/${salle.slug}/disponibilite`}>
                          <Button className="h-11 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                            Organiser une visite
                          </Button>
                        </Link>
                        {salle.displayContactPhone !== false && salle.contactPhone && canContact && (
                          <a
                            href={`tel:${salle.contactPhone.replace(/\s/g, "")}`}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
                          >
                            <Phone className="h-4 w-4" />
                            Contacter le propriétaire
                          </a>
                        )}
                      </>
                    ) : !isLoggedIn ? (
                      <>
                        <Link href={`/salles/${salle.slug}/disponibilite`}>
                          <Button className="h-11 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                            Voir les disponibilités
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/pricing">
                        <Button className="h-11 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                          Débloquer l&apos;accès
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-black">Tarification</h2>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                  <div className="flex flex-col gap-3">
                    {decisionRapideSortedTarifs.length > 0 ? (
                      decisionRapideSortedTarifs.map((p, index) => (
                        <p
                          key={p.label}
                          className={
                            index === 0
                              ? "text-xl font-bold text-[#213398]"
                              : "text-lg font-medium text-slate-700"
                          }
                        >
                          {p.value} € {p.label}
                        </p>
                      ))
                    ) : (
                      <p className="text-xl font-bold text-[#213398]">Sur demande</p>
                    )}
                  </div>
                  {salle.pricingInclusions.length > 0 && (
                    <>
                      <p className="mt-5 text-sm font-medium text-slate-600">Ce tarif comprend</p>
                      <ul className="mt-2 space-y-2.5">
                        {salle.pricingInclusions.map((inc, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#213398]" />
                            {inc}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-black">Description</h2>
                <p className="text-[15px] leading-[1.6] text-slate-600">{salle.description}</p>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-semibold text-black">Caractéristiques</h2>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  {salle.features.map((f, i) => {
                    const Icon = iconMap[f.icon] ?? CheckCircle2;
                    const hasSublabel = "sublabel" in f && f.sublabel;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <span className="text-sm text-slate-700">{f.label}</span>
                          {hasSublabel && (
                            <span className="block text-xs text-slate-500">{f.sublabel}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-black">Conditions d&apos;accueil</h2>
                <ul className="space-y-2.5">
                  {salle.cautionRequise && (
                    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      Caution demandée
                    </li>
                  )}
                  {salle.conditions.map((c, i) => {
                    const Icon = iconMap[c.icon] ?? Clock;
                    return (
                      <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        {c.label}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-black">Localisation</h2>
                <SalleMap salle={salle} />
                <p className="mt-3 text-xs text-slate-500">
                  Note : L&apos;adresse de l&apos;église reste privée pour des raisons de sécurité jusqu&apos;à l&apos;approche de la date de réservation.
                </p>
              </section>

              {nearbySalles.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-black">Autres salles proches</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {nearbySalles.map((s) => (
                      <Link
                        key={s.id}
                        href={`/salles/${s.slug}`}
                        className="group overflow-hidden rounded-xl border border-slate-200 transition hover:border-slate-300"
                      >
                        <div className="relative aspect-[16/9] bg-slate-100">
                          <Image
                            src={s.images[0] ?? "/img.png"}
                            alt={s.name}
                            fill
                            className="object-cover transition group-hover:scale-[1.02]"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        </div>
                        <div className="p-4">
                          <p className="font-semibold text-black">{s.name}</p>
                          <p className="mt-1 text-[13px] text-slate-500">
                            {s.city} • Jusqu&apos;à {s.capacity} personnes
                          </p>
                          <p className="mt-2 text-sm font-medium text-black">
                            {(() => {
                              const pf = getSallePriceFrom(s);
                              return pf ? `À partir de ${pf.value} € ${pf.label}` : "Tarifs sur demande";
                            })()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {isOwnSalle ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-black">C&apos;est votre annonce</h3>
                <p className="mt-2 text-[14px] text-slate-600">
                  Gérez et modifiez votre annonce depuis votre espace propriétaire.
                </p>
                <Link href="/proprietaire/annonces">
                  <Button className="mt-4 h-12 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                    Gérer mes annonces
                  </Button>
                </Link>
              </div>
            ) : canContact ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-black">Intéressé par cette salle ?</h3>
                <p className="mt-2 text-[14px] text-slate-600">
                  Organisez une visite pour la découvrir sur place.
                </p>
                <Link href={`/salles/${salle.slug}/disponibilite`}>
                  <Button className="mt-4 h-12 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                    Organiser une visite
                  </Button>
                </Link>
                {salle.displayContactPhone !== false && salle.contactPhone && (
                  <div className="mt-4">
                    <a
                      href={`tel:${salle.contactPhone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-black"
                    >
                      <Phone className="h-4 w-4" />
                      Contactez le propriétaire
                    </a>
                  </div>
                )}
                {recentViewerCount > 0 && (
                  <p className="mt-4 flex items-center gap-2 text-[12px] text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {recentViewerCount === 1
                      ? "1 locataire a consulté cette salle récemment."
                      : `${recentViewerCount} locataires ont consulté cette salle récemment.`}
                  </p>
                )}
              </div>
            ) : !isLoggedIn ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#213398]/10">
                    <Lock className="h-6 w-6 text-[#213398]" />
                  </div>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-black">
                  Consultez les disponibilités
                </h3>
                <p className="mt-2 text-center text-[14px] text-slate-600">
                  Choisissez un créneau libre. Connexion demandée uniquement à l&apos;envoi.
                </p>
                <Link href={`/salles/${salle.slug}/disponibilite`}>
                  <Button className="mt-4 h-12 w-full rounded-lg bg-[#213398] font-semibold hover:bg-[#1a2980]">
                    Voir les disponibilités
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#213398]/10">
                    <Lock className="h-6 w-6 text-[#213398]" />
                  </div>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-black">
                  Débloquez le contact propriétaire
                </h3>
                <p className="mt-2 text-center text-[14px] text-slate-600">
                  Activez votre accès pour contacter le propriétaire et envoyer une demande de visite.
                </p>
                <div className="mt-6">
                  <UnlockAccessBloc
                    isLoggedIn={!!user}
                    paiementUrl={`/salles/${slug}`}
                  />
                </div>
              </div>
            )}
            <div className="mt-6">
              <LocationAvailabilityCalendar
                blockedDates={blockedLocationDates}
                joursOuverture={salle.joursOuverture}
              />
            </div>
          </aside>
        </div>
      </main>

      {!isOwnSalle && (canContact || !isLoggedIn) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="container max-w-[1120px] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {priceFrom ? `À partir de ${priceFrom.value} € ${priceFrom.label}` : "Tarifs sur demande"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {canContact
                    ? "Visite sans engagement"
                    : "Choisissez une date, connexion demandée à l&apos;envoi"}
                </p>
              </div>
              <Link href={`/salles/${salle.slug}/disponibilite`} className="shrink-0">
                <Button className="h-10 rounded-lg bg-[#213398] px-4 font-semibold hover:bg-[#1a2980]">
                  {canContact ? "Organiser une visite" : "Voir les disponibilités"}
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {canContact
                ? "Vous confirmez seulement après échange avec le propriétaire."
                : "Vous pourrez explorer les créneaux avant de créer un compte."}
            </p>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
