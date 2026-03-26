"use client";

import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const centerNavItems = [
  { href: "/items", label: "Location" },
  { href: "/#faq", label: "FAQ" },
  { href: "/auth?tab=signup&userType=owner", label: "Louer mon matériel" },
] as const;

const navLinkClass =
  "font-landing-nav text-gs-dark underline-offset-4 hover:underline";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gs-line bg-gs-beige/95 backdrop-blur-sm supports-[backdrop-filter]:bg-gs-beige/80">
      <div className="landing-container relative flex h-[72px] items-center justify-between gap-3">
        <Link
          href="/"
          className="font-landing-logo-mark relative z-10 flex min-w-0 max-w-[40%] shrink-0 items-center bg-transparent pr-2 text-lg sm:max-w-none sm:pr-4 md:text-xl"
        >
          <Image
            src="/images/logosound.png"
            alt=""
            width={44}
            height={44}
            className="mr-1 h-10 w-10 shrink-0 rounded-full object-cover md:h-11 md:w-11"
          />
          <span className="truncate text-gs-orange">{siteConfig.name.toUpperCase()}</span>
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 sm:gap-6 md:gap-8"
          aria-label="Navigation principale"
        >
          {centerNavItems.map((item) => (
            <Link key={item.href} href={item.href} className={`${navLinkClass} whitespace-nowrap`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 flex max-w-[42%] shrink-0 items-center gap-2 bg-transparent sm:max-w-none sm:gap-4">
          <Link href="/signup" className={`${navLinkClass} shrink-0`}>
            Inscription
          </Link>
          <Link
            href="/login"
            className="font-landing-btn inline-flex max-w-[100%] shrink-0 rounded-md bg-gs-orange px-3 py-2 text-white transition hover:brightness-105 sm:px-7 sm:py-3"
          >
            Connexion
          </Link>
        </div>
      </div>
    </header>
  );
}
