"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { siteConfig } from "@/config/site";

const centerNavItems = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/#faq", label: "FAQ" },
  { href: "/auth?tab=signup&userType=owner", label: "Louer mon matériel" },
] as const;

const navLinkClass =
  "font-landing-nav text-gs-dark underline-offset-4 hover:underline";

const mobileMenuIconBtnClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-transparent text-gs-dark transition hover:bg-white/60";

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-gs-line bg-gs-beige/95 backdrop-blur-sm supports-[backdrop-filter]:bg-gs-beige/80">
      <div className="landing-container relative flex h-[72px] items-center justify-between gap-3">
        <Link
          href="/"
          className="font-landing-logo-mark flex shrink-0 items-center gap-1.5 overflow-visible bg-transparent pr-1 text-sm sm:pr-2 sm:text-base md:gap-0 md:text-lg lg:text-xl"
          onClick={closeMobile}
        >
          <Image
            src="/images/logosound.png"
            alt=""
            width={44}
            height={44}
            className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10 md:h-11 md:w-11"
          />
          <span className="whitespace-nowrap text-gs-orange md:-ml-1.5">
            {siteConfig.name.toUpperCase()}
          </span>
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 md:flex lg:gap-8"
          aria-label="Navigation principale"
        >
          {centerNavItems.map((item) => (
            <Link key={item.href} href={item.href} className={`${navLinkClass} whitespace-nowrap`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 flex shrink-0 items-center gap-2 md:gap-4">
          <Link href="/auth?tab=signup" className={`${navLinkClass} hidden md:inline`}>
            Inscription
          </Link>

          <button
            type="button"
            className={`${mobileMenuIconBtnClass} md:hidden`}
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />
          </button>

          <Link
            href="/auth"
            className="font-landing-btn hidden rounded-md bg-gs-orange px-3 py-2 text-white transition hover:brightness-105 md:inline-flex sm:px-7 sm:py-3"
          >
            Connexion
          </Link>
        </div>
      </div>

      {typeof document !== "undefined" && mobileOpen
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[199] bg-black/45 md:hidden"
                aria-hidden
                onClick={closeMobile}
              />
              <div
                id="landing-mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Menu de navigation"
                className="fixed left-0 right-0 top-0 z-[200] flex max-h-[min(92vh,calc(100dvh-0.5rem))] flex-col overflow-y-auto bg-gs-beige shadow-[0_12px_32px_rgba(0,0,0,0.14)] md:hidden"
              >
                <div className="landing-container flex h-[72px] shrink-0 items-center justify-between border-b border-gs-line">
                  <Link
                    href="/"
                    className="font-landing-logo-mark flex shrink-0 items-center gap-1.5 overflow-visible text-lg md:gap-0"
                    onClick={closeMobile}
                  >
                    <Image
                      src="/images/logosound.png"
                      alt=""
                      width={44}
                      height={44}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                    <span className="whitespace-nowrap text-gs-orange md:-ml-1.5">
                      {siteConfig.name.toUpperCase()}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className={mobileMenuIconBtnClass}
                    aria-label="Fermer le menu"
                    onClick={closeMobile}
                  >
                    <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>

                <nav className="flex flex-col" aria-label="Navigation mobile">
                  {centerNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="font-landing-nav border-b border-gs-line px-4 py-5 text-base text-gs-dark"
                      onClick={closeMobile}
                    >
                      {item.label}
                    </Link>
                  ))}

                  <div className="border-t border-gs-line px-4 pb-7 pt-5">
                    <Link
                      href="/auth?tab=signup"
                      className="font-landing-btn flex w-full items-center justify-center rounded-lg bg-gs-orange py-4 text-white transition hover:brightness-105"
                      onClick={closeMobile}
                    >
                      Inscription
                    </Link>
                    <Link
                      href="/auth"
                      className="font-landing-nav mt-4 block pb-1 text-center text-base text-gs-dark underline-offset-4 hover:underline"
                      onClick={closeMobile}
                    >
                      Connexion
                    </Link>
                  </div>
                </nav>
              </div>
            </>,
            document.body
          )
        : null}
    </header>
  );
}
