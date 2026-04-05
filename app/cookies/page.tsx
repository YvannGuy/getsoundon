import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { buildCanonical } from "@/lib/seo";
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export const metadata: Metadata = {
  title: "Politique de cookies",
  description: `${siteConfig.name} — cookies, traceurs, consentement (analytics, marketing), Supabase, PostHog, Stripe et Google lorsqu’ils sont activés.`,
  alternates: { canonical: buildCanonical("/cookies") },
};

export default function CookiesPage() {
  const contactEmail = siteConfig.supportEmail;

  return (
    <LegalPageLayout title="Politique de cookies">
      <p className="lead text-[16px] text-slate-600">
        La présente politique décrit l&apos;usage des <strong className="text-black">cookies et autres traceurs</strong>{" "}
        sur le site et les services <strong className="text-black">{siteConfig.name}</strong>. Elle est rédigée pour
        être cohérente avec le fonctionnement technique actuel du site et avec les exigences du{" "}
        <strong className="text-black">RGPD</strong> et des lignes directrices de la{" "}
        <strong className="text-black">CNIL</strong>.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Pour le traitement des données personnelles au sens large, voir également la{" "}
        <Link href="/confidentialite" className="text-gs-orange hover:underline">
          politique de confidentialité
        </Link>
        .
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">1. Qu&apos;est-ce qu&apos;un cookie ou un traceur ?</h2>
        <p className="mt-3 text-slate-600">
          Un <strong className="text-black">cookie</strong> est un fichier texte déposé sur votre terminal lors de la
          visite d&apos;un site. Les <strong className="text-black">traceurs équivalents</strong> (par exemple le{" "}
          <strong className="text-black">stockage local</strong> du navigateur) peuvent jouer un rôle comparable pour
          mémoriser des informations. Ces technologies permettent notamment de maintenir une session, de mémoriser des
          préférences ou, sous réserve de consentement lorsque la loi l&apos;exige, de mesurer l&apos;audience ou
          d&apos;afficher des fonctionnalités tierces.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">2. Quels types de traceurs utilisons-nous ?</h2>
        <p className="mt-3 text-slate-600">
          {siteConfig.name} distingue les traceurs <strong className="text-black">strictement nécessaires</strong> au
          fonctionnement du service ou à des finalités exemptées dans les conditions légales, et les traceurs{" "}
          <strong className="text-black">soumis à votre consentement</strong>, répartis sur le site en deux catégories :
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <strong className="text-black">Statistiques / analytics</strong> : mesure d&apos;usage et outils assimilés
            (dont PostHog et, le cas échéant, Google Analytics), activés uniquement après acceptation de cette
            catégorie.
          </li>
          <li>
            <strong className="text-black">Marketing</strong> : outils publicitaires ou de mesure publicitaire (dont
            Google Ads / gtag lorsqu&apos;il est configuré), chargés uniquement après acceptation de cette catégorie.
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          Certaines fonctionnalités ne sont présentes que si les clés d&apos;environnement correspondantes sont
          renseignées en production ; la liste ci-dessous reflète l&apos;architecture du code, pas l&apos;état d&apos;un
          déploiement particulier.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">3. Traceurs strictement nécessaires (ou fonctionnels)</h2>
        <p className="mt-3 text-slate-600">
          Ces traceurs sont utilisés pour des finalités considérées comme nécessaires au service ou à la sécurité, sans
          lesquelles le site ne fonctionnerait pas normalement ou la preuve de votre choix ne pourrait pas être conservée.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">3.1 Authentification Supabase</h3>
        <p className="mt-2 text-slate-600">
          Le site utilise <strong className="text-black">Supabase</strong> pour l&apos;authentification. Des{" "}
          <strong className="text-black">cookies first-party</strong> sont déposés sur le domaine du site (noms
          typiquement préfixés <code className="rounded bg-slate-100 px-1 text-sm">sb-</code>, par ex. jetons de session
          selon la configuration du projet). <strong className="text-black">Finalité</strong> : maintenir votre session
          de connexion de manière sécurisée. Ces cookies ne sont pas désactivables via le bandeau sans empêcher la
          connexion.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">3.2 Cookie de consentement</h3>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">Nom</strong> : <code className="rounded bg-slate-100 px-1 text-sm">site_consent</code>
          . <strong className="text-black">Finalité</strong> : mémoriser vos choix (nécessaire, statistiques, marketing)
          et la version de la politique appliquée. <strong className="text-black">Durée</strong> :{" "}
          <strong className="text-black">180 jours</strong> (environ six mois), conformément au paramétrage actuel du
          site. <strong className="text-black">Attributs</strong> : <code className="text-sm">Path=/</code>,{" "}
          <code className="text-sm">SameSite=Lax</code>.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">3.3 Cookie de prévisualisation (mode pré-lancement)</h3>
        <p className="mt-2 text-slate-600">
          Lorsque le site est configuré en mode « coming soon », un cookie{" "}
          <code className="rounded bg-slate-100 px-1 text-sm">gso_preview</code> peut être défini par le serveur (dont
          attribut <strong className="text-black">HttpOnly</strong>) pour permettre l&apos;accès au site réel aux
          personnes autorisées. <strong className="text-black">Finalité</strong> : contrôle d&apos;accès technique au
          déploiement ; il n&apos;est pas utilisé pour de la publicité ou de l&apos;analytics.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">3.4 Préférence d&apos;affichage du tableau de bord</h3>
        <p className="mt-2 text-slate-600">
          Un cookie <code className="rounded bg-slate-100 px-1 text-sm">dashboard_view</code> peut être enregistré lorsque
          vous basculez entre vues « client » et « prestataire ». <strong className="text-black">Finalité</strong>{" "}
          : mémoriser votre préférence d&apos;interface. <strong className="text-black">Durée</strong> : jusqu&apos;à{" "}
          <strong className="text-black">un an</strong>. Il s&apos;agit d&apos;un cookie first-party de confort, sans
          finalité publicitaire.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">3.5 Données structurées (JSON-LD)</h3>
        <p className="mt-2 text-slate-600">
          Des métadonnées structurées peuvent être intégrées dans la page (balise{" "}
          <code className="text-sm">application/ld+json</code>) à des fins de référencement : elles ne constituent pas un
          traceur tiers déposé sur votre terminal au sens habituel.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">4. Traceurs soumis au consentement</h2>
        <p className="mt-3 text-slate-600">
          Tant que vous n&apos;avez pas accepté la catégorie correspondante via le bandeau ou la fenêtre « Gérer mes
          cookies », les scripts concernés <strong className="text-black">ne sont pas injectés</strong> dans la page
          (composants conditionnels côté client), ou, pour PostHog, la bibliothèque est initialisée en mode{" "}
          <strong className="text-black">sans capture ni persistance utile</strong> jusqu&apos;à votre opt-in explicite.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">4.1 Catégorie « Statistiques » (analytics)</h3>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">PostHog</strong> (lorsque la clé projet est configurée) : une bibliothèque
          analytics est incluse dans l&apos;application. Les événements sont envoyés vers des URL du type{" "}
          <code className="rounded bg-slate-100 px-1 text-sm">/ingest</code> sur votre domaine, puis routés par le serveur
          vers l&apos;infrastructure PostHog (configuration actuelle : hébergement des requêtes vers les domaines{" "}
          <code className="text-sm">eu.i.posthog.com</code> / <code className="text-sm">eu-assets.i.posthog.com</code>).
          Tant que vous n&apos;acceptez pas les statistiques, la capture et la persistance associées restent{" "}
          <strong className="text-black">désactivées</strong> (paramètres d&apos;opt-out par défaut et synchronisation
          avec votre choix enregistré dans <code className="text-sm">site_consent</code>).
        </p>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">Google Analytics</strong> (lorsque l&apos;identifiant de mesure est configuré
          via la variable d&apos;environnement prévue) : les scripts Google Tag / gtag correspondants ne sont chargés
          qu&apos;<strong className="text-black">après</strong> acceptation de la catégorie statistiques.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Des mesures d&apos;audience ou d&apos;événements peuvent également être réalisées{" "}
          <strong className="text-black">côté serveur</strong> (sans cookie navigateur identique) ; elles relèvent de la{" "}
          <Link href="/confidentialite" className="text-gs-orange hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">4.2 Catégorie « Marketing »</h3>
        <p className="mt-2 text-slate-600">
          <strong className="text-black">Google Ads / gtag</strong> (lorsque l&apos;identifiant publicitaire est
          configuré) : chargement du script Google Tag Manager / gtag et envoi de données à Google{" "}
          <strong className="text-black">uniquement après</strong> acceptation de la catégorie marketing.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">5. Traceurs et services tiers liés au paiement ou au catalogue</h2>

        <h3 className="mt-6 text-lg font-semibold text-black">5.1 Stripe</h3>
        <p className="mt-2 text-slate-600">
          Lorsque vous initiez un paiement, vous pouvez être redirigé vers les pages hébergées par{" "}
          <strong className="text-black">Stripe</strong> (Checkout) ou charger le SDK Stripe depuis les domaines Stripe.
          <strong className="text-black"> {siteConfig.name} ne contrôle pas</strong> les cookies ou traceurs que Stripe
          peut déposer sur <strong className="text-black">les domaines Stripe</strong> à des fins de sécurité, de lutte
          contre la fraude ou d&apos;exécution du paiement. Nous vous invitons à consulter la{" "}
          <a
            href="https://stripe.com/fr/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gs-orange hover:underline"
          >
            politique de confidentialité de Stripe
          </a>
          . Le chargement du SDK sur notre domaine intervient dans le cadre du parcours de paiement.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-black">5.2 Cartes et cartographie (OpenStreetMap, CDN)</h3>
        <p className="mt-2 text-slate-600">
          Certaines pages peuvent afficher une carte : le navigateur envoie des requêtes vers des serveurs de tuiles (par
          ex. <strong className="text-black">OpenStreetMap</strong>) et peut charger des ressources depuis un CDN (par
          ex. icônes de marqueurs). Il ne s&apos;agit pas de cookies déposés par {siteConfig.name} sur votre terminal pour
          ces finalités, mais des <strong className="text-black">communications réseau</strong> pouvant impliquer le
          traitement d&apos;adresses IP par ces prestataires, selon leurs politiques.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">6. Stockage local (hors cookies)</h2>
        <p className="mt-3 text-slate-600">
          En complément des cookies, le site peut utiliser le <strong className="text-black">stockage local du
          navigateur</strong> (localStorage) pour :
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-600">
          <li>
            conserver un <strong className="text-black">panier invité</strong> (clé technique du type{" "}
            <code className="text-sm">gs_guest_cart_v1</code>) ;
          </li>
          <li>
            mémoriser qu&apos;une <strong className="text-black">invite d&apos;installation</strong> (PWA) a été
            fermée (clé du type <code className="text-sm">getsoundon-install-dismissed</code>), le cas échéant après
            enregistrement d&apos;un choix sur les cookies pour l&apos;affichage différé.
          </li>
        </ul>
        <p className="mt-3 text-slate-600">
          Ces mécanismes servent la fourniture du service (panier, ergonomie) et ne remplacent pas le cookie{" "}
          <code className="text-sm">site_consent</code> pour la preuve du consentement aux traceurs optionnels.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">7. Durées de conservation</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
          <li>
            <code className="text-sm">site_consent</code> : <strong className="text-black">180 jours</strong>.
          </li>
          <li>
            <code className="text-sm">dashboard_view</code> : <strong className="text-black">un an</strong>.
          </li>
          <li>
            Cookies Supabase : <strong className="text-black">session ou durée fixée par Supabase</strong> (souvent jusqu&apos;à
            environ un an pour un cookie persistant de session, selon configuration).
          </li>
          <li>
            Cookies ou stockage des <strong className="text-black">tiers</strong> (Google, Stripe sur leurs
            domaines) : selon leurs politiques respectives.
          </li>
          <li>
            <strong className="text-black">PostHog</strong> : en cas d&apos;acceptation des statistiques, la durée de
            conservation côté PostHog dépend de la configuration de votre projet et des paramètres du compte PostHog.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">8. Gestion du consentement</h2>
        <p className="mt-3 text-slate-600">
          Lors de votre première visite, un <strong className="text-black">bandeau</strong> vous permet d&apos;accepter
          tout, de refuser tout (hors traceurs strictement nécessaires), ou d&apos;ouvrir la personnalisation. Vos choix
          sont enregistrés dans le cookie <code className="text-sm">site_consent</code> et un événement interne met à
          jour le chargement des scripts (statistiques, marketing) conformément à ces choix.
        </p>
        <p className="mt-3 text-slate-600">
          Les catégories <strong className="text-black">nécessaires</strong> (dont authentification et mémorisation du
          consentement) restent actives ; les catégories <strong className="text-black">statistiques</strong> et{" "}
          <strong className="text-black">marketing</strong> sont facultatives.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">9. Modifier vos préférences</h2>
        <p className="mt-3 text-slate-600">
          Vous pouvez modifier vos choix à tout moment via le lien{" "}
          <strong className="text-black">« Gérer mes cookies »</strong> en pied de page, qui ouvre la fenêtre de
          paramétrage. Vous pouvez accepter ou refuser séparément les statistiques et le marketing, puis enregistrer.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">10. Paramétrage du navigateur</h2>
        <p className="mt-3 text-slate-600">
          Votre navigateur permet de bloquer ou supprimer les cookies. Le refus des cookies{" "}
          <strong className="text-black">strictement nécessaires</strong> peut empêcher la connexion à votre compte ou le
          fonctionnement normal du site. Pour les traceurs tiers, vous pouvez également consulter les outils proposés par
          certains éditeurs ou la plateforme{" "}
          <a
            href="https://www.youronlinechoices.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gs-orange hover:underline"
          >
            YourOnlineChoices
          </a>{" "}
          lorsque applicable.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">11. Vos droits</h2>
        <p className="mt-3 text-slate-600">
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité dans les conditions légales. Pour toute demande relative aux
          données personnelles :{" "}
          <a href={`mailto:${contactEmail}`} className="text-gs-orange hover:underline">
            {contactEmail}
          </a>
          . Vous pouvez introduire une réclamation auprès de la{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-gs-orange hover:underline">
            CNIL
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">12. Contact</h2>
        <p className="mt-3 text-slate-600">
          Pour toute question sur les cookies et traceurs :{" "}
          <a href={`mailto:${contactEmail}`} className="text-gs-orange hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">13. Lien avec la politique de confidentialité</h2>
        <p className="mt-3 text-slate-600">
          La{" "}
          <Link href="/confidentialite" className="text-gs-orange hover:underline">
            politique de confidentialité
          </Link>{" "}
          complète la présente page : elle décrit notamment les finalités et bases légales des traitements de données
          personnelles, les sous-traiteurs, les durées et les transferts hors Union européenne le cas échéant. Les cookies
          et traceurs en sont une facette ; les traitements réalisés entièrement côté serveur peuvent ne pas apparaître
          comme cookies sur votre terminal tout en constituant des données personnelles.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-black">14. Mise à jour</h2>
        <p className="mt-3 text-slate-600">
          La présente politique peut être modifiée pour refléter l&apos;évolution des outils, du site ou des obligations
          légales. La date de dernière mise à jour figure ci-dessous.
        </p>
      </section>

      <p className="mt-12 text-sm text-slate-500">Dernière mise à jour : 5 avril 2026.</p>
    </LegalPageLayout>
  );
}
