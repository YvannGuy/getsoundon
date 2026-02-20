import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="bg-[#213398] py-12 text-slate-300">
      <div className="container max-w-[1120px]">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="block text-xl font-semibold leading-none text-white hover:text-white">
              {siteConfig.name}
            </Link>
            <p className="mt-3 max-w-[240px] text-[12px] leading-[1.6] text-slate-300">
              La plateforme de référence pour trouver et proposer des salles dédiées aux événements cultuels.
            </p>
          </div>
          <div>
            <p className="text-[24px] font-semibold text-white [zoom:0.5]">Plateforme</p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
              <li>
                <Link href="/rechercher" className="hover:text-white">
                  Rechercher une salle
                </Link>
              </li>
              <li>
                <Link href="/auth?tab=signup" className="hover:text-white">
                  Ajoutez ma salle
                </Link>
              </li>
              <li>
                <a href="/#comment-ca-marche" className="hover:text-white">
                  Comment ça marche
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white">
                  Tarifs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[24px] font-semibold text-white [zoom:0.5]">Entreprise</p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
              <li>À propos</li>
              <li>
                <a href="mailto:contact@salledeculte.com" className="hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/#categories-evenement" className="hover:text-white">
                  Catégories
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[24px] font-semibold text-white [zoom:0.5]">Légal</p>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-300">
              <li>Mentions légales</li>
              <li>CGU</li>
              <li>Confidentialité</li>
              <li>Cookies</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 h-px w-full bg-white/15" />

        <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-[13px] text-slate-300">© 2025 {siteConfig.name}. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            {[Facebook, Instagram].map((Icon, index) => (
              <a
                key={index}
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
