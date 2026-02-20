import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="container max-w-[1120px] py-16">
        <h1 className="text-[36px] font-bold text-black">Blog</h1>
        <p className="mt-4 text-slate-600">À venir prochainement.</p>
        <Link href="/" className="mt-6 inline-block text-[14px] font-medium text-black hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
