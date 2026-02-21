import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BLOG_POSTS } from "@/lib/blog-posts";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent } from "@/components/ui/card";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <SiteHeader />
      <main className="container max-w-[1120px] py-12">
        <h1 className="text-[36px] font-bold text-black">Blog</h1>
        <p className="mt-2 text-[16px] text-slate-600">
          Conseils et guides pour organiser vos événements cultuels
        </p>
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
                  <span className="mt-auto flex items-center gap-1 text-[13px] font-medium text-[#213398]">
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
      <SiteFooter />
    </div>
  );
}
