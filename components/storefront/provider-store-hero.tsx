import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";

import { siteConfig } from "@/config/site";

import { ProviderStoreHeroActions } from "./provider-store-hero-actions";

type ProviderStoreHeroProps = {
  name: string;
  rating: number;
  reviewCount: number;
  location: string;
  heroImageSrc: string;
};

export function ProviderStoreHero({
  name,
  rating,
  reviewCount,
  location,
  heroImageSrc,
}: ProviderStoreHeroProps) {
  return (
    <section className="landing-container pt-6 sm:pt-8">
      <div className="relative overflow-hidden rounded-2xl border border-gs-line shadow-ds-ambient">
        <div className="relative aspect-[21/9] min-h-[200px] w-full sm:min-h-[240px] md:min-h-[280px] lg:aspect-[2.4/1]">
          <Image
            src={heroImageSrc}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1200px"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25"
            aria-hidden
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white shadow-md sm:h-24 sm:w-24 md:h-28 md:w-28">
                <Link href="/" className="relative h-14 w-14 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]">
                  <Image
                    src="/images/logosound.png"
                    alt={siteConfig.name}
                    fill
                    className="rounded-lg object-cover"
                  />
                </Link>
              </div>

              <div className="min-w-0 space-y-2 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-landing-heading text-2xl font-bold tracking-tight sm:text-3xl md:text-[1.75rem] lg:text-4xl">
                    {name}
                  </h1>
                  <BadgeCheck
                    className="h-6 w-6 shrink-0 text-gs-orange sm:h-7 sm:w-7"
                    strokeWidth={2}
                    aria-label="Profil vérifié"
                  />
                </div>
                <div className="font-landing-body flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90 sm:text-base">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-gs-orange text-gs-orange" aria-hidden />
                    <span className="font-semibold text-white">{rating}</span>
                    <span className="text-white/80">({reviewCount} reviews)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-white/90">
                    <MapPin className="h-4 w-4 shrink-0 text-white/80" aria-hidden />
                    {location}
                  </span>
                </div>
              </div>
            </div>

            <ProviderStoreHeroActions providerName={name} />
          </div>
        </div>
      </div>
    </section>
  );
}
