import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GitCompare,
  Headphones,
  Lightbulb,
  Mic2,
  Monitor,
  Radio,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { ComingSoonFaq } from "@/components/coming-soon/coming-soon-faq";
import { ComingSoonWaitlistForm } from "@/components/coming-soon/coming-soon-waitlist-form";
import { siteConfig } from "@/config/site";
import { isComingSoonMode } from "@/lib/prelaunch-gate";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const prelaunch = isComingSoonMode();
  return {
    title: "Bientôt disponible | GetSoundOn",
    description:
      "GetSoundOn prépare l’ouverture de sa marketplace événementielle : matériel son, lumière, DJ, vidéo, livraison et techniciens. Inscrivez-vous à la liste d’attente.",
    robots: prelaunch ? { index: false, follow: false } : { index: true, follow: true },
  };
}

const categories = [
  { label: "Sonorisation", icon: Mic2 },
  { label: "Éclairage", icon: Lightbulb },
  { label: "Matériel DJ", icon: Radio },
  { label: "Écrans & vidéo", icon: Monitor },
  { label: "Micros", icon: Headphones },
  { label: "Livraison", icon: Truck },
  { label: "Installation", icon: Wrench },
  { label: "Technicien", icon: Sparkles },
];

function SectionTitle({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gs-orange/90">{kicker}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,111,28,0.22), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(232,111,28,0.08), transparent)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 border-b border-white/[0.06] bg-[#070708]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/coming-soon" className="flex items-center gap-2">
            <Image
              src="/images/logosound.png"
              alt={siteConfig.name}
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="font-landing-logo-mark text-lg font-semibold tracking-tight text-gs-orange">
              {siteConfig.name.toUpperCase()}
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-white/80" aria-label="Liens utiles">
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="transition hover:text-white"
            >
              Contact
            </a>
            <a href="#waitlist" className="text-white/60 transition hover:text-gs-orange">
              Espace pro
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-gs-orange" aria-hidden />
                Accès anticipé réservé à l’équipe et aux bêta testeurs
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
                GetSoundOn arrive très bientôt
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                La marketplace qui connecte clients et pros du spectacle : trouvez du matériel, des
                prestations et des techniciens — ou proposez vos équipements avec des parcours clairs et un cadre
                sérieux.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">
                La plateforme est en préparation finale : nous peaufinons l’expérience, la qualité des fiches et
                les parcours de réservation pour un lancement public à la hauteur de vos événements.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href="#waitlist"
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gs-orange px-6 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:brightness-105",
                  )}
                >
                  Rejoindre la liste d’attente
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/[0.07]"
                >
                  Je suis prestataire
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-transparent px-2 text-sm font-medium text-white/55 underline-offset-4 hover:text-white hover:underline sm:px-4"
                >
                  Je cherche du matériel
                </a>
              </div>
            </div>
            <div className="relative lg:min-h-[420px]">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-gs-orange/25 via-transparent to-white/[0.03] blur-2xl" aria-hidden />
              <div className="relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/40 p-6 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.75)] sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gs-orange">Aperçu</p>
                  <p className="mt-2 text-xl font-semibold text-white">Une vitrine unique pour l’événementiel</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    Annonces structurées, filtres métier et échanges encadrés — pensé pour les équipes terrain
                    comme pour les agences.
                  </p>
                </div>
                <ul className="mt-8 space-y-3 text-sm text-white/70">
                  {["Recherche par univers technique", "Demandes et messages centralisés", "Parcours prestataire & client"].map(
                    (t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gs-orange" aria-hidden />
                        {t}
                      </li>
                    ),
                  )}
                </ul>
                <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-white/45">Lancement progressif</p>
                  <p className="mt-1 text-sm font-medium text-white/85">
                    Première vague sur invitation pour garantir fiabilité et accompagnement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Audience */}
        <section id="audience" className="border-t border-white/[0.06] bg-black/20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              kicker="Pour qui"
              title="Deux publics, une même exigence de qualité"
              subtitle="Que vous montiez un show, une conférence ou une tournée, la promesse est simple : moins de friction, plus de clarté."
            />
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/40 sm:p-8">
                <h3 className="text-lg font-semibold text-white">Pour les clients</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  Comparez son, lumières, DJ, captation et logistique au même endroit. Gagnez du temps sur la
                  prospection, sécurisez vos demandes et avancez avec des interlocuteurs identifiés.
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/40 sm:p-8">
                <h3 className="text-lg font-semibold text-white">Pour les prestataires</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  Mettez en valeur votre matériel et vos services avec une fiche propre, gérez vos échanges et
                  touchez des clients qui cherchent concrètement ce que vous proposez.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              kicker="Univers"
              title="Tout l’événementiel technique, structuré"
              subtitle="Les familles de besoins que vous pourrez parcourir sur GetSoundOn."
            />
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/90 transition hover:border-gs-orange/30 hover:bg-white/[0.04]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gs-orange/15 text-gs-orange">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Waitlist */}
        <section className="border-t border-white/[0.06] bg-black/25 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <ComingSoonWaitlistForm />
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              kicker="Pourquoi GetSoundOn"
              title="Conçu pour des événements réels"
            />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Gagnez du temps",
                  text: "Moins d’allers-retours : des fiches lisibles, des filtres métier et des parcours d’échange cadrés.",
                  icon: Clock,
                },
                {
                  title: "Comparez plus facilement",
                  text: "Rassemblez son, lumière, image et logistique pour arbitrer vite et sereinement.",
                  icon: GitCompare,
                },
                {
                  title: "Organisez plus sereinement",
                  text: "Une vision claire des options et des interlocuteurs pour avancer jusqu’au jour J.",
                  icon: ShieldCheck,
                },
                {
                  title: "Réseau spécialisé",
                  text: "Des profils orientés spectacle, corporate et live — pas une place de marché généraliste.",
                  icon: Users,
                },
              ].map(({ title, text, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-lg shadow-black/30"
                >
                  <Icon className="h-8 w-8 text-gs-orange" aria-hidden />
                  <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Progressive launch */}
        <section className="border-t border-white/[0.06] bg-gradient-to-b from-black/30 to-[#070708] py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Un lancement public progressif
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
              Nous ouvrons d’abord à une sélection de prestataires et de services pour valider les parcours
              bout en bout : qualité des annonces, disponibilités, échanges et satisfaction des clients.
              Cette étape nous permet de monter en charge sans compromettre l’expérience.
            </p>
            <p className="mt-4 text-sm text-white/45">
              Vous souhaitez figurer parmi les premiers profils référencés ? Indiquez-le dans la liste
              d’attente — nous revenons vers vous selon les créneaux d’intégration.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <ComingSoonFaq />
          </div>
        </section>

        <footer className="border-t border-white/[0.06] bg-black/40 py-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Image src="/images/logosound.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
              <span className="font-landing-logo-mark text-base font-semibold text-gs-orange">
                {siteConfig.name.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col gap-2 text-sm text-white/55 sm:flex-row sm:gap-8">
              <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-white">
                {siteConfig.supportEmail}
              </a>
              <Link href="/mentions-legales" className="hover:text-white">
                Mentions légales
              </Link>
              <Link href="/cgv" className="hover:text-white">
                CGV
              </Link>
              <Link href="/confidentialite" className="hover:text-white">
                Politique de confidentialité
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
