import type { Metadata } from "next";

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { legalConfig } from "@/config/legal";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Politique de cookies",
  description: `Informations sur les cookies utilisés sur ${siteConfig.name} et comment les gérer.`,
  alternates: { canonical: buildCanonical("/cookies") },
};

export default function CookiesPage() {
  const { editeur } = legalConfig;

  return (
    <LegalPageLayout title="Politique de cookies">
      <p className="lead text-[16px] text-slate-600">
        La présente politique explique ce que sont les cookies, comment nous les utilisons sur {siteConfig.name} et
        comment vous pouvez gérer vos préférences, conformément aux recommandations de la CNIL et au RGPD.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Qu'est-ce qu'un cookie ?</h2>
        <p className="mt-3 text-slate-600">
          Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, tablette, smartphone) lors de
          votre visite sur un site web. Il permet au site de mémoriser des informations sur votre navigation, par
          exemple pour vous identifier lors d&apos;une prochaine visite ou pour améliorer votre expérience.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Types de cookies utilisés</h2>

        <h3 className="mt-6 text-lg font-semibold text-black">Cookies strictement nécessaires</h3>
        <p className="mt-2 text-slate-600">
          Ces cookies sont indispensables au fonctionnement du site. Ils permettent notamment l&apos;authentification,
          la sécurisation des sessions et le bon affichage des pages. Ils ne peuvent pas être désactivés sans
          compromettre l&apos;utilisation du site.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-slate-200 px-4 py-2 text-left font-medium text-black">
                  Cookie
                </th>
                <th className="border-b border-slate-200 px-4 py-2 text-left font-medium text-black">
                  Finalité
                </th>
                <th className="border-b border-slate-200 px-4 py-2 text-left font-medium text-black">
                  Durée
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              <tr>
                <td className="border-b border-slate-100 px-4 py-2 font-mono text-xs">
                  sb-*-auth-token
                </td>
                <td className="border-b border-slate-100 px-4 py-2">
                  Authentification Supabase (connexion sécurisée)
                </td>
                <td className="border-b border-slate-100 px-4 py-2">
                  Session / 1 an
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-4 py-2 font-mono text-xs">
                  __next_preview_data
                </td>
                <td className="border-b border-slate-100 px-4 py-2">
                  Prévisualisation (mode édition)
                </td>
                <td className="border-b border-slate-100 px-4 py-2">
                  Session
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 text-lg font-semibold text-black">Cookies de performance et analytics</h3>
        <p className="mt-2 text-slate-600">
          Ces cookies nous aident à comprendre comment les visiteurs utilisent le site (pages vues, parcours). Les
          données sont agrégées et anonymisées. Ces cookies ne sont déposés que si vous y consentez.
        </p>
        <p className="mt-2 text-slate-600">
          Actuellement, nous n&apos;utilisons pas de services tiers d&apos;analytics (Google Analytics, etc.). Si nous
          en ajoutions, vous seriez informé et pourriez refuser leur dépôt.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-black">Cookies tiers (paiements)</h3>
        <p className="mt-2 text-slate-600">
          Lors du paiement d&apos;une réservation, vous êtes redirigé vers Stripe pour le paiement. Stripe peut déposer des
          cookies sur son propre domaine pour gérer la sécurité et la prévention des fraudes. Ces cookies sont régis
          par la politique de confidentialité de Stripe (
          <a
            href="https://stripe.com/fr/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#213398] hover:underline"
          >
            stripe.com/fr/privacy
          </a>
          ).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Durée de conservation</h2>
        <p className="mt-3 text-slate-600">
          La durée de chaque cookie est indiquée dans le tableau ci-dessus. Les cookies de session sont supprimés à la
          fermeture du navigateur. Les cookies persistants restent jusqu&apos;à leur date d&apos;expiration ou jusqu&apos;à
          ce que vous les supprimiez manuellement.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Cookies essentiels (toujours actifs)</h2>
        <p className="mt-3 text-slate-600">
          Ces cookies sont indispensables et ne peuvent pas être désactivés :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">sb-*-auth-token</strong> : authentification Supabase (connexion)
          </li>
          <li>
            <strong className="text-black">site_consent</strong> : enregistrement de vos choix de cookies (6 mois)
          </li>
          <li>
            <strong className="text-black">Stripe (_stripe_*)</strong> : uniquement sur les pages de paiement (sécurité)
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Modifier votre choix</h2>
        <p className="mt-3 text-slate-600">
          Vous pouvez modifier vos préférences à tout moment en cliquant sur{" "}
          <strong className="text-black">« Gérer mes cookies »</strong> dans le pied de page du site.
          Une bannière s&apos;affiche lors de votre première visite ; vous pouvez accepter tout, refuser tout, ou
          personnaliser par catégorie (statistiques, marketing).
        </p>
        <p className="mt-3 text-slate-600">
          Votre choix est stocké dans le cookie <code className="rounded bg-slate-100 px-1">site_consent</code> pour une
          durée de 6 mois.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Gestion des cookies</h2>
        <p className="mt-3 text-slate-600">
          Vous pouvez gérer vos préférences de cookies de plusieurs façons :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Via votre navigateur</strong> : la plupart des navigateurs permettent de
            refuser ou supprimer les cookies. Consultez l&apos;aide de votre navigateur (Chrome, Firefox, Safari,
            Edge…) pour plus d&apos;informations.
          </li>
          <li>
            <strong className="text-black">Via les paramètres du site</strong> : utilisez « Gérer mes cookies » dans le
            footer pour personnaliser vos préférences.
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          <strong className="text-black">Attention</strong> : le refus des cookies strictement nécessaires peut
          empêcher la connexion à votre compte et l&apos;utilisation normale du site.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7. Vos droits</h2>
        <p className="mt-3 text-slate-600">
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et d&apos;effacement des
          données collectées via les cookies. Pour exercer ces droits ou poser des questions :{" "}
          <a href={`mailto:${editeur.email}`} className="text-[#213398] hover:underline">
            {editeur.email}
          </a>
        </p>
        <p className="mt-3 text-slate-600">
          Vous pouvez également introduire une réclamation auprès de la{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#213398] hover:underline"
          >
            CNIL
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8. Modifications</h2>
        <p className="mt-3 text-slate-600">
          Cette politique peut être mise à jour pour refléter l&apos;ajout de nouveaux cookies ou des changements
          réglementaires. La date de dernière mise à jour figure en bas de page.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9. Contact et politique de confidentialité</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question :{" "}
          <a href={`mailto:${editeur.email}`} className="text-[#213398] hover:underline">
            {editeur.email}
          </a>
          . Consultez notre{" "}
          <Link href="/confidentialite" className="text-[#213398] hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>

      <p className="mt-12 text-sm text-slate-500">
        Dernière mise à jour : février 2026.
      </p>
    </LegalPageLayout>
  );
}
