import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import type { Metadata } from "next";
import { AddSalleLink } from "@/components/links/add-salle-link";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildCanonical, defaultMetadata } from "@/lib/seo";
import { siteConfig } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Article introuvable" };

  const title = `${post.title} | ${siteConfig.name}`;
  const description = post.excerpt;
  const canonical = buildCanonical(`/blog/${slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...defaultMetadata.openGraph,
      type: "article",
      title,
      description,
      url: canonical,
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      ...defaultMetadata.twitter,
      title,
      description,
      images: [post.image],
    },
  };
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
  const canonical = buildCanonical(`/blog/${slug}`);
  const blogStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${siteConfig.url}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: canonical,
          },
        ],
      },
      {
        "@type": "BlogPosting",
        mainEntityOfPage: canonical,
        headline: post.title,
        description: post.excerpt,
        image: [post.image],
        author: {
          "@type": "Organization",
          name: siteConfig.name,
        },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          logo: {
            "@type": "ImageObject",
            url: `${siteConfig.url}/logosdcbl.png`,
          },
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogStructuredData) }}
      />
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
            <div className="mt-10 flex justify-center border-t border-slate-200 pt-10">
              <AddSalleLink className="inline-flex items-center justify-center rounded-lg bg-[#213398] px-8 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1a2980]">
                Déposer votre salle
              </AddSalleLink>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
