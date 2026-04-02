import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSalleBySlug } from "@/lib/salles";
import { getSallePriceFrom, getSalleTarifParts } from "@/lib/types/salle";
import { InstantBookingForm } from "@/components/salles/instant-booking-form";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) return { title: "Annonce introuvable" };
  return { title: `Réserver — ${salle.name} | ${siteConfig.name}` };
}

export default async function ReserverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salle = await getSalleBySlug(slug);
  if (!salle) notFound();

  if (!salle.instantBookingEnabled) {
    redirect(`/salles/${slug}/disponibilite`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/salles/${slug}/reserver`);
  }

  if (salle.ownerId === user.id) {
    redirect(`/salles/${slug}`);
  }

  const priceFrom = getSallePriceFrom(salle);
  const tarifParts = getSalleTarifParts(salle);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <LandingHeader isLoggedIn />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="mb-6">
          <h1 className="font-landing-heading text-2xl font-bold text-black">
            Réserver — {salle.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {salle.city}
            {priceFrom ? ` · À partir de ${priceFrom.value} € ${priceFrom.label}` : ""}
          </p>
        </div>

        {salle.images[0] && (
          <div className="mb-6 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={salle.images[0]}
              alt={salle.name}
              className="h-52 w-full object-cover"
            />
          </div>
        )}

        <InstantBookingForm
          salleId={salle.id}
          salleName={salle.name}
          salleSlug={slug}
          tarifParts={tarifParts}
          cautionRequise={salle.cautionRequise ?? false}
        />
      </main>

      <LandingFooter isLoggedIn />
    </div>
  );
}
