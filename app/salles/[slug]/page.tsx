import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Heart,
  ListChecks,
  MapPin,
  Share2,
  Phone,
  MessageCircle,
  Car,
  CookingPot,
  HelpCircle,
  Piano,
  Tv,
  Volume2,
  Users,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSalleBySlug, getSallesByCity } from "@/lib/salles";

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

export default async function SalleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) notFound();

  const nearbySalles = await getSallesByCity(salle.city, slug);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main className="container max-w-[1120px] py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-8 grid gap-3 md:grid-cols-[1fr_120px]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={salle.images[0] ?? "/img.png"}
                  alt={salle.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 65vw"
                />
              </div>
              <div className="hidden flex-col gap-3 md:flex">
                {salle.images.slice(1, 4).map((img, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                    <Image src={img} alt="" fill className="object-cover" sizes="120px" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6 flex gap-4">
              <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <Share2 className="h-4 w-4" />
                Partager
              </button>
              <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <Heart className="h-4 w-4" />
                Sauvegarder
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <h1 className="text-[28px] font-bold text-[#304256]">{salle.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {salle.address}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[13px] font-medium text-sky-800">
                    <Users className="h-4 w-4" />
                    Jusqu&apos;à {salle.capacity} personnes
                  </span>
                </div>
              </div>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[#304256]">Description</h2>
                <p className="text-[15px] leading-[1.6] text-slate-600">{salle.description}</p>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[#304256]">Caractéristiques</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {salle.features.map((f, i) => {
                    const Icon = iconMap[f.icon] ?? CheckCircle2;
                    const hasSublabel = "sublabel" in f && f.sublabel;
                    return (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <div>
                          {hasSublabel ? (
                            <>
                              <p className="font-medium text-slate-800">{f.label}</p>
                              <p className="mt-0.5 text-[13px] text-slate-600">{f.sublabel}</p>
                            </>
                          ) : (
                            <p className="text-[14px] text-slate-700">{f.label}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[#304256]">Conditions d&apos;accueil</h2>
                <ul className="space-y-3">
                  {salle.conditions.map((c, i) => {
                    const Icon = iconMap[c.icon] ?? Clock;
                    return (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        {c.label}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[#304256]">Tarification</h2>
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5">
                  <p className="text-xl font-bold text-[#304256]">{salle.pricePerDay} € / jour</p>
                  {salle.pricingInclusions.length > 0 && (
                    <>
                      <p className="mt-4 text-[13px] font-medium text-slate-700">Ce tarif comprend :</p>
                      <ul className="mt-2 space-y-2">
                        {salle.pricingInclusions.map((inc, i) => (
                          <li key={i} className="flex items-center gap-2 text-[13px] text-slate-600">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {inc}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[#304256]">Localisation</h2>
                <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                  <div className="text-center text-slate-500">
                    <MapPin className="mx-auto h-12 w-12" />
                    <p className="mt-2 text-sm">Carte à venir</p>
                    <p className="mt-1 text-xs">
                      Adresse exacte sera communiquée après validation de votre réservation
                    </p>
                  </div>
                </div>
              </section>

              {nearbySalles.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-[#304256]">Autres salles proches</h2>
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
                          <p className="font-semibold text-[#304256]">{s.name}</p>
                          <p className="mt-1 text-[13px] text-slate-500">
                            {s.address} • Jusqu&apos;à {s.capacity} personnes
                          </p>
                          <p className="mt-2 text-sm font-medium text-[#2d435a]">
                            À partir de {s.pricePerDay} € / jour
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
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#304256]">Intéressé par cette salle ?</h3>
              <p className="mt-2 text-[14px] text-slate-600">
                Envoyez une demande au propriétaire pour vérifier la disponibilité.
              </p>
              <Link href={`/rechercher?demande=${salle.slug}`}>
                <Button className="mt-4 h-12 w-full rounded-lg bg-violet-600 font-semibold hover:bg-violet-700">
                  Vérifier les disponibilités
                </Button>
              </Link>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
                <a
                  href="#"
                  className="flex items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-slate-900"
                >
                  <MessageCircle className="h-4 w-4" />
                  Envoyer un message
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-slate-900"
                >
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
              </div>
              <p className="mt-4 flex items-center gap-2 text-[12px] text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                12 organisateurs ont consulté cette salle récemment.
              </p>
            </div>
            <div className="mt-6 flex gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#304256]">Besoin d&apos;aide ?</h3>
                <p className="mt-2 text-[14px] text-slate-600">
                  Notre équipe est disponible pour vous accompagner dans votre recherche.
                </p>
                <a href="#" className="mt-3 inline-block text-[14px] font-medium text-[#2d435a] hover:underline">
                  Contacter le support
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
