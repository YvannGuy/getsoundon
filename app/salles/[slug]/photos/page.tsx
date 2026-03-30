import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { SallePhotosGallery } from "@/components/salles/salle-photos-gallery";
import { getSalleBySlug } from "@/lib/salles";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) return { title: "Salle introuvable" };
  return {
    title: `Toutes les photos - ${salle.name} | ${siteConfig.name}`,
  };
}

export default async function SallePhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) notFound();

  const imgs = salle.images?.length ? salle.images : ["/img.png"];

  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[1120px] py-8">
        <Link
          href={`/salles/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-black"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à {salle.name}
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-black">
          Toutes les photos – {salle.name}
        </h1>

        <div className="mt-6">
          <SallePhotosGallery images={imgs} name={salle.name} />
        </div>
      </main>
    </PublicSiteShell>
  );
}
