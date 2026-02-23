import type { Metadata } from "next";
import Image from "next/image";

import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { ComingSoonCountdown } from "@/components/home/coming-soon-countdown";
import { ComingSoonSignup } from "@/components/home/coming-soon-signup";

export const metadata: Metadata = {
  title: `Bientôt en ligne | ${siteConfig.name}`,
  description: "salledeculte.com sera prochainement en ligne. Soyez informé de l'ouverture.",
  alternates: { canonical: buildCanonical("/") },
};

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#213398]">
      <div className="absolute inset-0">
        <Image
          src="/images/fondde.png"
          alt=""
          fill
          className="object-cover blur-[4px] scale-105"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#213398]/75" aria-hidden />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-12">
        <div className="mb-14 flex items-center gap-0 sm:mb-16">
          <Image
            src="/logosdcbl.png"
            alt=""
            width={200}
            height={200}
            className="h-24 w-24 object-contain sm:h-36 sm:w-36 md:h-44 md:w-44 lg:h-52 lg:w-52"
          />
          <span className="-ml-4 text-4xl font-semibold text-white sm:-ml-6 sm:text-6xl md:text-7xl lg:text-8xl">{siteConfig.name}</span>
        </div>

        <ComingSoonCountdown targetDate={siteConfig.launchDate} />

        <p className="mt-20 text-center text-[15px] leading-relaxed text-white sm:text-[16px]">
          Soyez informé de l&apos;ouverture de notre site très bientôt
        </p>
        <ComingSoonSignup />
      </div>
    </main>
  );
}
