import Image from "next/image";
import Link from "next/link";

import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";
import { siteConfig } from "@/config/site";

type LandingFooterProps = {
  /** Résolu côté serveur si possible ; sinon défaut inscription prestataire. */
  publishListingHref?: string;
};

export function LandingFooter({
  publishListingHref = "/auth?tab=signup&userType=owner",
}: LandingFooterProps) {
  const publishHref = publishListingHref;

  return (
    <footer className="bg-gs-dark py-14 text-gs-muted">
      <div className="landing-container">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-10 xl:gap-12">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/images/logosound.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <span className="font-landing-logo-mark text-xl text-white">
                {siteConfig.name.toUpperCase()}
              </span>
            </Link>
            <p className="font-landing-body mt-4 max-w-[280px] text-sm leading-relaxed">
              Location de matériel événementiel entre particuliers et pros.
            </p>
          </div>

          <div>
            <p className="font-landing-overline text-white">Plateforme</p>
            <ul className="font-landing-body mt-4 space-y-2.5 text-base">
              <li>
                <Link href="/catalogue" className="hover:text-white hover:underline">
                  Catalogue matériel
                </Link>
              </li>
              <li>
                <Link href={publishHref} className="hover:text-white hover:underline">
                  Publier une annonce
                </Link>
              </li>
              <li>
                <Link href="/centre-aide" className="hover:text-white hover:underline">
                  Centre d&apos;aide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-landing-overline text-white">Légal</p>
            <ul className="font-landing-body mt-4 space-y-2.5 text-base">
              <li>
                <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-white hover:underline">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-white hover:underline">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/cgu" className="hover:text-white hover:underline">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="hover:text-white hover:underline">
                  CGV
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-white hover:underline">
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-landing-overline text-white">Cookies</p>
            <ul className="font-landing-body mt-4 space-y-2.5 text-base">
              <li>
                <Link href="/cookies" className="hover:text-white hover:underline">
                  Politique cookies
                </Link>
              </li>
              <li>
                <CookiePreferencesLink className="hover:text-white hover:underline">
                  Gérer mes cookies
                </CookiePreferencesLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 h-px w-full bg-white/10" />

        <div className="font-landing-body mt-8 flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
            <Link href="/mentions-legales" className="hover:text-white hover:underline">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-white hover:underline">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-white hover:underline">
              CGV
            </Link>
            <Link href="/confidentialite" className="hover:text-white hover:underline">
              Confidentialité
            </Link>
            <Link href="/cookies" className="hover:text-white hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
