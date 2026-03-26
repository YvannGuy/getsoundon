import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function LegalPageLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <SiteHeader />
      <main className="container max-w-[800px] py-16 px-4">
        <Link
          href="/"
          className="text-[14px] font-medium text-slate-600 hover:text-black"
        >
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="mt-6 text-[32px] font-bold tracking-tight text-black">
          {title}
        </h1>
        <div className="mt-8 prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-black prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-gs-orange prose-a:no-underline hover:prose-a:underline">
          {children}
        </div>
        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href="/mentions-legales" className="font-medium text-gs-orange hover:underline">
            Mentions légales
          </Link>
          <span className="text-slate-400">|</span>
          <Link href="/cgu" className="font-medium text-gs-orange hover:underline">
            CGU
          </Link>
          <span className="text-slate-400">|</span>
          <Link href="/confidentialite" className="font-medium text-gs-orange hover:underline">
            Confidentialité
          </Link>
          <span className="text-slate-400">|</span>
          <Link href="/cookies" className="font-medium text-gs-orange hover:underline">
            Cookies
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
