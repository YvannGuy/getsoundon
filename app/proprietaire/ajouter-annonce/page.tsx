import { GetSoundOnOnboardingWizard } from "@/components/proprietaire/getsoundon-onboarding-wizard";

export default function ProprietaireAjouterAnnoncePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-landing-heading text-2xl font-bold text-gs-dark">Ajouter une annonce</h1>
        <p className="font-landing-body mt-1 text-slate-600">
          Complétez l&apos;onboarding ci-dessous pour publier une nouvelle annonce.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <GetSoundOnOnboardingWizard embedded />
      </section>
    </div>
  );
}

