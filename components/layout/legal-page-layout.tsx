import Link from "next/link";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { resolvePublishListingHref } from "@/lib/landing-publish-href";
import { getUserOrNull } from "@/lib/supabase/server";

export async function LegalPageLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { user, supabase } = await getUserOrNull();
  const publishListingHref = await resolvePublishListingHref(user, supabase);

  return (
    <div className="font-landing-body min-h-screen bg-gs-beige text-[#222]">
      <LandingHeader />
      <main className="landing-container max-w-[800px] py-14 sm:py-16 md:py-20">
        <Link
          href="/"
          className="font-landing-nav text-sm font-medium text-[#666] hover:text-gs-dark hover:underline"
        >
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="font-landing-section-title mt-6 text-gs-dark">{title}</h1>
        <div className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-headings:text-gs-dark prose-p:text-[#444] prose-li:text-[#444] prose-a:text-gs-orange prose-a:no-underline hover:prose-a:underline">
          {children}
        </div>
        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href="/mentions-legales" className="font-medium text-gs-orange hover:underline">
            Mentions légales
          </Link>
          <span className="text-[#ccc]">|</span>
          <Link href="/cgu" className="font-medium text-gs-orange hover:underline">
            CGU
          </Link>
          <span className="text-[#ccc]">|</span>
          <Link href="/confidentialite" className="font-medium text-gs-orange hover:underline">
            Confidentialité
          </Link>
          <span className="text-[#ccc]">|</span>
          <Link href="/cookies" className="font-medium text-gs-orange hover:underline">
            Cookies
          </Link>
        </div>
      </main>
      <LandingFooter isLoggedIn={!!user} publishListingHref={publishListingHref} />
    </div>
  );
}
