import { AddSalleLink } from "@/components/links/add-salle-link";
import Link from "next/link";

export const metadata = {
  title: "Plan du site | salles-du-culte.com",
  description: "Plan du site de salles-du-culte.com : aperçu de toutes les sections principales du site.",
};

export default function PlanDuSitePage() {
  return (
    <main className="container max-w-[960px] py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Plan du site</h1>
      <p className="mt-2 max-w-[640px] text-sm text-slate-600">
        Retrouvez ici les principales pages publiques, l&apos;espace propriétaire, l&apos;espace organisateur et les sections d&apos;aide.
      </p>

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pages principales</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/" className="text-blue-700 hover:underline">
                Accueil
              </Link>
            </li>
            <li>
              <Link href="/rechercher" className="text-blue-700 hover:underline">
                Rechercher une salle
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="text-blue-700 hover:underline">
                Tarifs
              </Link>
            </li>
            <li>
              <Link href="/avantages" className="text-blue-700 hover:underline">
                Avantages pour les propriétaires
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-blue-700 hover:underline">
                Blog
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Espace organisateur</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/auth?tab=login&userType=organizer" className="text-blue-700 hover:underline">
                Connexion organisateur
              </Link>
            </li>
            <li>
              <Link href="/auth?tab=signup&userType=organizer" className="text-blue-700 hover:underline">
                Inscription organisateur
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-blue-700 hover:underline">
                Tableau de bord organisateur
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Espace propriétaire</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/auth?tab=login&userType=owner" className="text-blue-700 hover:underline">
                Connexion propriétaire
              </Link>
            </li>
            <li>
              <AddSalleLink className="text-blue-700 hover:underline">
                Inscription propriétaire
              </AddSalleLink>
            </li>
            <li>
              <Link href="/proprietaire" className="text-blue-700 hover:underline">
                Espace propriétaire
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Centre d&apos;aide</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/centre-aide" className="text-blue-700 hover:underline">
                Centre d&apos;aide
              </Link>
            </li>
            <li>
              <Link href="/centre-aide/organisateur" className="text-blue-700 hover:underline">
                Aide pour les organisateurs
              </Link>
            </li>
            <li>
              <Link href="/centre-aide/proprietaire" className="text-blue-700 hover:underline">
                Aide pour les propriétaires
              </Link>
            </li>
            <li>
              <Link href="/centre-aide/general" className="text-blue-700 hover:underline">
                Questions générales
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pages légales & cookies</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/mentions-legales" className="text-blue-700 hover:underline">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/cgu" className="text-blue-700 hover:underline">
                Conditions générales d&apos;utilisation (CGU)
              </Link>
            </li>
            <li>
              <Link href="/cgv" className="text-blue-700 hover:underline">
                Conditions générales de vente (CGV)
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="text-blue-700 hover:underline">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-blue-700 hover:underline">
                Politique de cookies
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Accès et authentification</h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/login" className="text-blue-700 hover:underline">
                Connexion
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-blue-700 hover:underline">
                Inscription
              </Link>
            </li>
            <li>
              <Link href="/auth/mot-de-passe-oublie" className="text-blue-700 hover:underline">
                Mot de passe oublié
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Admin (réservé à l&apos;équipe)</h2>
          <p className="mt-2 text-xs text-slate-500">
            Ces pages sont réservées à l&apos;équipe salles-du-culte.com et ne sont pas destinées au grand public.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>
              <Link href="/admin" className="text-blue-700 hover:underline">
                Tableau de bord admin
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

