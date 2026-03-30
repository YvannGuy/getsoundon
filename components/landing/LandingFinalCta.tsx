import Image from "next/image";
import Link from "next/link";

import { LandingReveal } from "@/components/landing/LandingReveal";

const CTA_IMG =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=900&q=85&auto=format&fit=crop";

export function LandingFinalCta() {
  return (
    <LandingReveal>
      <section className="landing-section bg-white">
        <div className="landing-container">
          <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-gs-beige p-6 shadow-md md:grid-cols-2 md:p-10 lg:gap-12">
            <div>
              <h2 className="font-landing-section-title text-gs-dark">
                Ton prochain événement commence sur GetSoundOn
              </h2>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/auth?tab=signup"
                  className="font-landing-btn inline-flex justify-center rounded-md bg-gs-orange px-8 py-3.5 text-white transition hover:brightness-105"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/auth?tab=signup&userType=owner"
                  className="font-landing-btn inline-flex justify-center rounded-md border-2 border-gs-dark/20 bg-white px-8 py-3.5 text-gs-dark transition hover:bg-white/90"
                >
                  Louer mon matériel
                </Link>
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg">
              <Image src={CTA_IMG} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>
    </LandingReveal>
  );
}
