import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";
import { siteConfig } from "@/config/site";

type LandingFooterProps = {
  isLoggedIn: boolean;
};

export function LandingFooter({ isLoggedIn }: LandingFooterProps) {
  const publishHref = isLoggedIn ? "/onboarding/salle" : "/auth?tab=signup&userType=owner";

  return (
    <footer className="bg-gs-dark py-14 text-gs-muted">
      <div className="landing-container">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <p className="font-landing-overline text-white">Plateforme</p>
            <ul className="font-landing-body mt-4 space-y-2.5 text-base">
              <li>
                <Link href="/rechercher" className="hover:text-white hover:underline">
                  Rechercher
                </Link>
              </li>
              <li>
                <Link href="/catalogue" className="hover:text-white hover:underline">
                  Catalogue
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
            <p className="font-landing-overline text-white">Support</p>
            <ul className="font-landing-body mt-4 space-y-2.5 text-base">
              <li>
                <a href="mailto:contact@getsoundon.com" className="hover:text-white hover:underline">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/cgu" className="hover:text-white hover:underline">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-white hover:underline">
                  Mentions légales
                </Link>
              </li>
              <li>
                <CookiePreferencesLink className="hover:text-white hover:underline">Cookies</CookiePreferencesLink>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-landing-overline text-white">Newsletter</p>
            <p className="font-landing-body mt-3 text-sm leading-relaxed">
              Recevez les actus matériel et événements.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                name="email"
                placeholder="Votre e-mail"
                autoComplete="email"
                className="font-landing-body min-h-[48px] flex-1 rounded-lg border border-gs-line bg-white px-4 text-sm text-gs-dark outline-none placeholder:text-[#888]"
              />
              <button
                type="button"
                className="font-landing-btn inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gs-orange px-5 text-white"
                aria-label="S'inscrire à la newsletter"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="lg:text-right">
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
            <p className="font-landing-body mt-4 text-sm leading-relaxed lg:ml-auto lg:max-w-[220px]">
              Location de matériel événementiel entre particuliers et pros.
            </p>
          </div>
        </div>

        <div className="mt-12 h-px w-full bg-white/10" />

        <div className="font-landing-body mt-8 flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/mentions-legales" className="hover:text-white hover:underline">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-white hover:underline">
              CGU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
