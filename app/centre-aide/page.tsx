import type { Metadata } from "next";
import Link from "next/link";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { HelpCircle, Package, Search, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Centre d'aide",
  description:
    "Questions sur la location de matériel événementiel (sono, DJ, lumière) sur GetSoundOn : louer, proposer une annonce, réservations et compte.",
  alternates: { canonical: buildCanonical("/centre-aide") },
};

const CATEGORIES = [
  {
    href: "/centre-aide/organisateur",
    title: "Louer du matériel",
    desc: "Catalogue, recherche, demandes, options (livraison, installation) et paiement sécurisé.",
    icon: Search,
  },
  {
    href: "/centre-aide/proprietaire",
    title: "Prestataire",
    desc: "Publier vos annonces matériel, recevoir des demandes, réservations et Stripe Connect.",
    icon: Package,
  },
  {
    href: "/centre-aide/general",
    title: "Général",
    desc: `Questions fréquentes et informations sur ${siteConfig.name}.`,
    icon: Info,
  },
];

export default async function CentreAidePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[900px] py-12 sm:py-16 md:py-20">
        <h1 className="font-landing-section-title text-gs-dark">Comment pouvons-nous vous aider ?</h1>
        <p className="font-landing-body mt-4 max-w-[640px] text-base leading-relaxed text-[#555] sm:text-lg">
          {siteConfig.name} facilite la location de matériel événementiel entre particuliers et prestataires. Retrouvez
          ci-dessous les réponses par thème ou écrivez-nous via le formulaire.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.href} href={cat.href}>
                <Card className="h-full rounded-xl border-gs-line bg-white shadow-sm transition hover:border-gs-orange/30 hover:shadow-md">
                  <CardContent className="flex flex-col p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gs-orange/10">
                      <Icon className="h-5 w-5 text-gs-orange" strokeWidth={2} />
                    </div>
                    <h2 className="font-landing-heading mt-4 text-lg font-bold text-gs-dark">{cat.title}</h2>
                    <p className="font-landing-body mt-2 text-sm leading-relaxed text-[#555]">{cat.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-gs-line bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-landing-heading text-lg font-bold text-gs-dark">Documents légaux</h2>
          <p className="font-landing-body mt-2 text-sm leading-relaxed text-[#555]">
            Les mêmes liens figurent en pied de page sur tout le site.
          </p>
          <ul className="font-landing-body mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#555]">
            <li>
              <Link href="/mentions-legales" className="font-semibold text-gs-orange hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/cgu" className="font-semibold text-gs-orange hover:underline">
                CGU
              </Link>
            </li>
            <li>
              <Link href="/cgv" className="font-semibold text-gs-orange hover:underline">
                CGV
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="font-semibold text-gs-orange hover:underline">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="font-semibold text-gs-orange hover:underline">
                Cookies
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-14 rounded-2xl border border-gs-line bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gs-orange/10">
              <HelpCircle className="h-6 w-6 text-gs-orange" strokeWidth={2} />
            </div>
            <h2 className="font-landing-heading text-xl font-bold text-gs-dark">Nous contacter</h2>
          </div>
          <p className="font-landing-body mt-4 text-[15px] leading-relaxed text-[#555]">
            Choisissez le type de demande et décrivez votre besoin. Notre équipe répond sur{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="font-semibold text-gs-orange hover:underline">
              {siteConfig.supportEmail}
            </a>
            .
          </p>

          {sent && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Votre demande a bien été envoyée. Nous revenons vers vous rapidement.
            </p>
          )}
          {error === "rate_limit" && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Trop de requêtes. Veuillez patienter avant de réessayer.
            </p>
          )}
          {error && error !== "rate_limit" && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Impossible d&apos;envoyer votre demande pour le moment. Vérifiez les champs puis réessayez.
            </p>
          )}

          <form action="/api/contact/support" method="POST" className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-[#888]">Nom</span>
                <input
                  name="name"
                  required
                  className="h-11 w-full rounded-lg border border-gs-line bg-white px-3 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
                  placeholder="Votre nom"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-[#888]">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="h-11 w-full rounded-lg border border-gs-line bg-white px-3 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
                  placeholder="vous@email.com"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-[#888]">Type de demande</span>
              <select
                name="helpType"
                required
                defaultValue=""
                className="h-11 w-full rounded-lg border border-gs-line bg-white px-3 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
              >
                <option value="" disabled>
                  Sélectionnez votre demande
                </option>
                <option>Louer du matériel</option>
                <option>Proposer mon matériel</option>
                <option>Réservation et paiement</option>
                <option>Compte et connexion</option>
                <option>Autre demande</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-[#888]">Message</span>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full rounded-lg border border-gs-line bg-white px-3 py-2 text-sm text-gs-dark outline-none transition focus:border-gs-orange focus:ring-2 focus:ring-gs-orange/20"
                placeholder="Décrivez votre besoin (matériel, dates, zone…)."
              />
            </label>

            <button
              type="submit"
              className="font-landing-btn inline-flex h-11 w-full items-center justify-center rounded-lg bg-gs-orange px-5 text-white transition hover:brightness-105 sm:w-auto"
            >
              Envoyer ma demande
            </button>
          </form>
        </div>

        <Link
          href="/"
          className="font-landing-nav mt-10 inline-flex items-center gap-2 text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour à l&apos;accueil
        </Link>
      </main>
    </PublicSiteShell>
  );
}
