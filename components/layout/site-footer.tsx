import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";

import { AddSalleLink } from "@/components/links/add-salle-link";
import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="bg-gs-orange py-12 text-slate-300">
      <div className="container max-w-[1120px]">
        <div className="grid gap-8 md:grid-cols-4 md:items-start">
          <div>
            <Link href="/" className="flex items-center text-xl font-semibold leading-none text-white hover:text-white">
              <Image src="/images/logosound.png" alt="" width={60} height={60} className="h-[60px] w-[60px] shrink-0 rounded-full object-cover -mr-3" />
              {siteConfig.name}
            </Link>
            <p className="mt-3 max-w-[240px] text-[12px] leading-[1.6] text-slate-300">
              Plateforme de mise en relation pour louer du matériel son, DJ et lumière.
            </p>
          </div>
          <div>
            <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Plateforme</p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
              <li>
                <Link href="/#recherche" className="hover:text-white">
                  Rechercher du materiel
                </Link>
              </li>
              <li>
                <AddSalleLink className="hover:text-white">
                  Publier mon materiel
                </AddSalleLink>
              </li>
              <li>
                <Link href="/centre-aide" className="hover:text-white">
                  Centre d&apos;aide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Entreprise</p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
              <li>À propos</li>
              <li>
                <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/#categories-evenement" className="hover:text-white">
                  Catégories
                </Link>
              </li>
              <li>
                <Link href="/plan-du-site" className="hover:text-white">
                  Plan du site
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[24px] font-semibold leading-none text-white [zoom:0.5]">Légal</p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
              <li>
                <Link href="/mentions-legales" className="hover:text-white">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/cgu" className="hover:text-white">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="hover:text-white">
                  CGV
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-white">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white">
                  Cookies
                </Link>
              </li>
              <li>
                <CookiePreferencesLink className="hover:text-white">
                  Gérer mes cookies
                </CookiePreferencesLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 h-px w-full bg-white/15" />

        <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-[13px] text-slate-300">
            © {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={siteConfig.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
