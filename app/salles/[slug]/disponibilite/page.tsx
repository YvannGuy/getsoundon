import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users, Euro } from "lucide-react";

import { PublicSiteShell } from "@/components/landing/public-site-shell";
import { buildCanonical } from "@/lib/seo";
import { getSalleBySlug } from "@/lib/salles";
import { formatSalleTarifs } from "@/lib/types/salle";
import { siteConfig } from "@/config/site";
import { FormulaireVisite } from "./formulaire-visite";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) return { title: "Salle introuvable" };
  return {
    title: `Organiser une visite - ${salle.name}`,
    description: `Choisissez un créneau pour visiter ${salle.name} à ${salle.city}.`,
    alternates: { canonical: buildCanonical(`/salles/${slug}/disponibilite`) },
  };
}

export default async function DisponibilitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) notFound();

  return (
    <PublicSiteShell>
      <main className="landing-container max-w-[1120px] py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* Colonne gauche : infos salle */}
          <div className="space-y-4">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={salle.images[0] ?? "/img.png"}
                alt={salle.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <h1 className="text-2xl font-bold text-black">{salle.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {salle.address}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                {salle.capacity} personnes
              </span>
              <span className="flex items-center gap-1.5">
                <Euro className="h-4 w-4 text-slate-400" />
                {formatSalleTarifs(salle)}
              </span>
            </div>
          </div>

          {/* Colonne droite : formulaire visite */}
          <div>
            <FormulaireVisite slug={slug} />
          </div>
        </div>
      </main>
    </PublicSiteShell>
  );
}
