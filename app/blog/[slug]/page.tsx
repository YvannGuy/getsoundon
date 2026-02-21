import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

const markdownComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-10 mb-3 text-[19px] font-semibold leading-snug text-black first:mt-6 first:pt-6 first:border-t first:border-slate-200">
      {children}
    </h2>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-5 text-[16px] leading-[1.7] text-slate-600 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-5 ml-5 list-disc space-y-2 text-[16px] leading-[1.6] text-slate-600">
      {children}
    </ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="pl-1">{children}</li>
  ),
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="container max-w-[720px] py-8 sm:py-12">
        <Link href="/blog" className="mb-8 inline-flex items-center gap-1 text-[14px] font-medium text-slate-500 hover:text-black hover:underline">
          ← Retour au blog
        </Link>
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-t-2xl bg-slate-100">
            <Image
              src={post.image}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <h1 className="text-[26px] font-bold leading-tight text-black sm:text-[30px]">
              {post.title}
            </h1>
            <div className="mt-6">
              <ReactMarkdown components={markdownComponents}>{post.content.trim()}</ReactMarkdown>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
