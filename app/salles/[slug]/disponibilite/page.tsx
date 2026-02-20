import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users, Euro } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSalleBySlug } from "@/lib/salles";
import { FormulaireDisponibilite } from "./formulaire-disponibilite";

export const dynamic = "force-dynamic";

export default async function DisponibilitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) notFound();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main className="container max-w-[1120px] py-8">
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
                {salle.pricePerDay} € / jour
              </span>
            </div>
          </div>

          {/* Colonne droite : formulaire */}
          <div>
            <FormulaireDisponibilite salle={salle} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
