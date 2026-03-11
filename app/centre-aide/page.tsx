import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Centre d'aide",
  description:
    "Comment pouvons-nous vous aider ? Trouvez des réponses sur la recherche de salles, la mise en ligne de votre lieu et les questions générales.",
  alternates: { canonical: buildCanonical("/centre-aide") },
};
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, Building2, Search, Info } from "lucide-react";

const CATEGORIES = [
  {
    href: "/centre-aide/organisateur",
    title: "Chercher une salle",
    desc: "Tout savoir sur la recherche et la réservation d'une salle sur la plateforme.",
    icon: Search,
  },
  {
    href: "/centre-aide/proprietaire",
    title: "Propriétaire",
    desc: "Découvrez comment proposer votre salle et recevoir des demandes ciblées.",
    icon: Building2,
  },
  {
    href: "/centre-aide/general",
    title: "Général",
    desc: "Questions fréquentes et informations générales sur {site}.",
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
    <div className="min-h-screen bg-[#f3f6fa]">
      <SiteHeader />
      <main className="container max-w-[900px] py-16 px-4">
        <h1 className="text-[32px] font-bold tracking-tight text-black sm:text-[38px]">
          Comment pouvons-nous vous aider ?
        </h1>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-slate-600">
          Chez {siteConfig.name}, nous sommes là pour rendre votre expérience la plus fluide possible. Que vous ayez
          des questions, besoin d&apos;assistance ou simplement envie de découvrir notre plateforme, nous sommes
          prêts à vous accompagner.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.href} href={cat.href}>
                <Card className="h-full rounded-xl border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md">
                  <CardContent className="flex flex-col p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#213398]/10">
                      <Icon className="h-5 w-5 text-[#213398]" />
                    </div>
                    <h2 className="mt-4 font-semibold text-black">{cat.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{cat.desc.replace("{site}", siteConfig.name)}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 rounded-xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#213398]/10">
              <HelpCircle className="h-6 w-6 text-[#213398]" />
            </div>
            <h2 className="text-xl font-semibold text-black">Nous contacter</h2>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
            Sélectionnez le type de demande et envoyez votre message. Notre équipe support vous répond à
            <span className="font-medium text-[#213398]"> contact@salledeculte.com</span>.
          </p>

          {sent && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Votre demande a bien été envoyée. Nous revenons vers vous rapidement.
            </p>
          )}
          {error === "rate_limit" && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
                <span className="text-sm font-medium text-slate-700">Nom</span>
                <input
                  name="name"
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#213398]"
                  placeholder="Votre nom"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#213398]"
                  placeholder="vous@email.com"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Type de demande</span>
              <select
                name="helpType"
                required
                defaultValue=""
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#213398]"
              >
                <option value="" disabled>
                  Sélectionnez votre demande
                </option>
                <option>Recherche de salle</option>
                <option>Publier ma salle</option>
                <option>Réservation et paiement</option>
                <option>Compte et connexion</option>
                <option>Autre demande</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Message</span>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#213398]"
                placeholder="Décrivez votre besoin pour que nous puissions vous aider rapidement."
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#213398] px-5 text-sm font-semibold text-white transition hover:bg-[#1a2980]"
            >
              Envoyer ma demande
            </button>
          </form>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-black"
        >
          ← Retour à l&apos;accueil
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
