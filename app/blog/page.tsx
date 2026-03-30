import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BLOG_POSTS } from "@/lib/blog-posts";
import { buildCanonical } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conseils et guides pour organiser vos événements cultuels. Choisir une salle, normes ERP, réservation et bonnes pratiques.",
  alternates: { canonical: buildCanonical("/blog") },
};

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function BlogPage() {
  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[1120px] py-12 sm:py-14">
        <h1 className="text-[36px] font-bold text-black">Blog</h1>
        <p className="font-landing-body mt-2 text-base text-[#555]">
          Conseils pour vos événements : lieux, matériel et bonnes pratiques
        </p>
        <div className="font-landing-body mt-6 max-w-3xl text-[15px] leading-relaxed text-[#444]">
          <p>
            Articles autour de l&apos;organisation d&apos;événements en Île-de-France : choisir une salle ou un équipement,
            sécurité, assurance, réservation. Pour le matériel sono, DJ et lumière, explorez aussi le{" "}
            <Link href="/catalogue" className="font-semibold text-gs-orange hover:underline">
              catalogue
            </Link>{" "}
            et le{" "}
            <Link href="/centre-aide" className="font-semibold text-gs-orange hover:underline">
              centre d&apos;aide
            </Link>
            .
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block h-full">
              <Card className="flex h-full flex-col overflow-hidden transition hover:border-slate-300 hover:shadow-md">
                <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-200">
                  <Image
                    src={post.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <h2 className="text-[17px] font-semibold leading-snug text-black">
                    {post.title}
                  </h2>
                  <p className="line-clamp-2 flex-1 text-[14px] leading-[1.45] text-slate-600">
                    {post.excerpt}
                  </p>
                  <span className="mt-auto flex items-center gap-1 text-[13px] font-medium text-gs-orange">
                    Lire l&apos;article
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <Link href="/" className="mt-10 inline-block text-[14px] font-medium text-slate-600 hover:text-black hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </main>
    </PublicSiteShell>
  );
}
