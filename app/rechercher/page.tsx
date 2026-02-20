import { Suspense } from "react";

import { getBulkRatingStats } from "@/app/actions/salle-ratings";
import { RechercherContent } from "@/components/rechercher/rechercher-content";
import { UnlockAccessBloc } from "@/components/salles/unlock-access-bloc";
import { getEffectiveUserType } from "@/lib/auth-utils";
import { hasAccessToBrowseOthers } from "@/lib/pass-utils";
import { searchSalles } from "@/lib/salles";
import { createClient } from "@/lib/supabase/server";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RechercherPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ville = typeof params.ville === "string" ? params.ville : undefined;
  const date = typeof params.date === "string" ? params.date : undefined;
  const personnes = typeof params.personnes === "string" ? params.personnes : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const getProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("user_type").eq("id", userId).maybeSingle();
    return data;
  };
  const userType = user ? await getEffectiveUserType(user, getProfile) : null;
  const canBrowseOthers = user?.id ? await hasAccessToBrowseOthers(user.id) : false;

  let salles = await searchSalles({ ville, date, personnes, type });
  if (userType === "owner" && !canBrowseOthers) {
    salles = salles.filter((s) => s.ownerId === user!.id);
  }

  const ratingStats = salles.length > 0
    ? await getBulkRatingStats(salles.map((s) => s.id))
    : {};

  const ownerRestricted = userType === "owner" && !canBrowseOthers;

  return (
    <Suspense
      fallback={
        <main className="container max-w-[1400px] py-6">
          <p className="text-slate-500">Chargement...</p>
        </main>
      }
    >
      {ownerRestricted && (
        <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-4">
          <div className="container mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-800">
              <strong>En tant que propriétaire</strong>, activez un Pass pour consulter les annonces des autres propriétaires.
            </p>
            <UnlockAccessBloc isLoggedIn={true} paiementUrl="/proprietaire/paiement" />
          </div>
        </div>
      )}
      <RechercherContent salles={salles} ratingStats={ratingStats} />
    </Suspense>
  );
}
