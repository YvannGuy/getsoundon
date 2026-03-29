"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, ChevronLeft, Clock } from "lucide-react";

import { createSalleFromOnboarding } from "@/app/actions/create-salle";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import {
  syncGsWizardToOnboardingPayload,
  type AccountTypeGs,
  type GsAdditionalServiceId,
  type GsHandoffId,
  type GsOfferCategoryId,
} from "@/lib/getsoundon-onboarding-sync";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { AdresseAutocomplete } from "@/components/search/adresse-autocomplete";
import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TOTAL_STEPS = 6;
const ONBOARDING_DRAFT_KEY = "gs_provider_onboarding_v1";
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 10;

const ACCOUNT_CARDS: { id: AccountTypeGs; label: string; hint: string }[] = [
  { id: "particulier", label: "Particulier", hint: "Tu loues ton matériel à titre personnel." },
  { id: "auto_entrepreneur", label: "Auto-entrepreneur", hint: "Activité en micro / AE." },
  { id: "societe", label: "Société / prestataire événementiel", hint: "Structure pro ou équipe." },
];

const OFFER_CATEGORIES: { id: GsOfferCategoryId; label: string }[] = [
  { id: "sono", label: "Sono" },
  { id: "lumiere", label: "Lumière" },
  { id: "dj", label: "DJ" },
  { id: "video", label: "Vidéo" },
  { id: "micros", label: "Microphones" },
  { id: "packs", label: "Packs événementiels" },
];

const ADDITIONAL_SVC: { id: GsAdditionalServiceId; label: string }[] = [
  { id: "livraison", label: "Livraison" },
  { id: "installation", label: "Installation" },
  { id: "technicien", label: "Technicien" },
  { id: "retrait_sur_place", label: "Retrait sur place" },
];

const HANDOFF: { id: GsHandoffId; label: string }[] = [
  { id: "retrait", label: "Retrait sur place" },
  { id: "livraison", label: "Livraison" },
  { id: "livraison_installation", label: "Livraison + installation" },
];

const RAYON_OPTIONS = [
  { id: "5", label: "5 km" },
  { id: "10", label: "10 km" },
  { id: "25", label: "25 km" },
  { id: "50", label: "50 km" },
  { id: "devis", label: "Sur devis" },
];

const GEAR_SELECT: { value: string; label: string }[] = [
  { value: "son", label: "Sono" },
  { value: "lumiere", label: "Lumière" },
  { value: "dj", label: "DJ" },
  { value: "video", label: "Vidéo" },
  { value: "micros", label: "Microphones" },
  { value: "pack_premium", label: "Pack événementiel" },
];

const PACK_USAGE: { id: string; label: string }[] = [
  { id: "anniversaire", label: "Anniversaire" },
  { id: "mariage", label: "Mariage" },
  { id: "conference", label: "Conférence" },
  { id: "dj_set", label: "DJ set" },
  { id: "soiree_privee", label: "Soirée privée" },
];

export type GsWizardData = {
  accountType: AccountTypeGs;
  raisonSociale: string;
  contactEmail: string;
  contactPhone: string;
  ville: string;
  villeCode: string | null;
  postalCode: string;
  lat: number | undefined;
  lng: number | undefined;
  offeredCategories: GsOfferCategoryId[];
  additionalServices: GsAdditionalServiceId[];
  handoffModes: GsHandoffId[];
  adresse: string;
  rayonKm: string;
  villesDesservies: string;
  dispoSemaine: boolean;
  dispoWeekend: boolean;
  dispoSoiree: boolean;
  horairesRetrait: string;
  bookingMode: "manual" | "instant";
  cautionEnabled: boolean;
  cautionAmountDefault: string;
  leadTime: string;
  leadTimeOther: string;
  cancellationPolicy: "flexible" | "moderate" | "strict";
  listingKind: "equipment" | "pack";
  nom: string;
  gearCategoryField: string;
  gearBrand: string;
  gearModel: string;
  description: string;
  tarifParJour: string;
  capacite: string;
  quantite: string;
  etatMateriel: string;
  packUsage: string;
  packContents: string;
  packLivraison: boolean;
  packInstallation: boolean;
  photos: File[];
};

const initialData: GsWizardData = {
  accountType: "",
  raisonSociale: "",
  contactEmail: "",
  contactPhone: "",
  ville: "",
  villeCode: null,
  postalCode: "",
  lat: undefined,
  lng: undefined,
  offeredCategories: [],
  additionalServices: [],
  handoffModes: [],
  adresse: "",
  rayonKm: "25",
  villesDesservies: "",
  dispoSemaine: true,
  dispoWeekend: true,
  dispoSoiree: false,
  horairesRetrait: "",
  bookingMode: "manual",
  cautionEnabled: false,
  cautionAmountDefault: "",
  leadTime: "24h",
  leadTimeOther: "",
  cancellationPolicy: "moderate",
  listingKind: "equipment",
  nom: "",
  gearCategoryField: "son",
  gearBrand: "",
  gearModel: "",
  description: "",
  tarifParJour: "",
  capacite: "",
  quantite: "1",
  etatMateriel: "",
  packUsage: "dj_set",
  packContents: "",
  packLivraison: false,
  packInstallation: false,
  photos: [],
};

function toggleIn<T extends string>(arr: T[], id: T): T[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

function getValidationError(
  step: number,
  d: GsWizardData
): { step: number; message: string } | null {
  if (step >= 2) {
    if (!d.accountType || !d.raisonSociale.trim() || !d.ville.trim()) {
      return { step: 1, message: "Complète le type de compte, le nom et la ville." };
    }
  }
  if (step >= 3) {
    if (!d.offeredCategories.length) {
      return { step: 2, message: "Sélectionne au moins une catégorie d’offre." };
    }
  }
  if (step >= 4) {
    if (!d.handoffModes.length) {
      return { step: 3, message: "Indique au moins un mode de remise du matériel." };
    }
    if (!d.adresse.trim()) {
      return { step: 3, message: "Renseigne l’adresse principale." };
    }
  }
  if (step >= 5) {
    // step 4 conditions — toujours remplis par défaut
  }
  if (step >= 6) {
    if (!d.nom.trim()) {
      return { step: 5, message: "Donne un titre à ton annonce." };
    }
    if (!d.tarifParJour.trim() || parseInt(d.tarifParJour, 10) <= 0) {
      return { step: 5, message: "Indique un prix par jour valide." };
    }
    if (d.listingKind === "equipment") {
      if (!d.gearBrand.trim() && !d.gearModel.trim()) {
        return { step: 5, message: "Renseigne au moins la marque ou le modèle." };
      }
    } else {
      if (!d.packContents.trim()) {
        return { step: 5, message: "Décris ce que contient le pack." };
      }
    }
    if (d.photos.length < MIN_PHOTOS) {
      return { step: 5, message: `Ajoute au moins ${MIN_PHOTOS} photo.` };
    }
  }
  return null;
}

export type GetSoundOnOnboardingWizardProps = {
  embedded?: boolean;
  onSuccess?: (slug: string | null, status: "approved" | "pending") => void;
  onClose?: () => void;
};

export function GetSoundOnOnboardingWizard({
  embedded,
  onSuccess,
  onClose,
}: GetSoundOnOnboardingWizardProps = {}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<GsWizardData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdStatus, setCreatedStatus] = useState<"approved" | "pending">("pending");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeChecked, setStripeChecked] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedDraftRef = useRef(false);

  const progress = (step / TOTAL_STEPS) * 100;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { step?: number; data?: Partial<GsWizardData> };
        if (parsed.data) {
          setData({ ...initialData, ...parsed.data, photos: [] });
        }
        if (parsed.step && parsed.step >= 1 && parsed.step <= TOTAL_STEPS) setStep(parsed.step);
        setDraftRestored(true);
      }
    } catch {
      /* ignore */
    } finally {
      hasLoadedDraftRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraftRef.current) return;
    try {
      const { photos: _p, ...rest } = data;
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ step, data: rest }));
      setLastSavedAt(new Date());
    } catch {
      /* ignore */
    }
  }, [step, data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      const { data: row } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) {
        setStripeReady(!!(row as { stripe_account_id?: string } | null)?.stripe_account_id);
        setStripeChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateData = useCallback((u: Partial<GsWizardData>) => {
    setData((prev) => ({ ...prev, ...u }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    setDraftRestored(false);
    setLastSavedAt(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    if (files.length) {
      setData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...files].slice(0, MAX_PHOTOS),
      }));
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const err = getValidationError(6, data);
    if (err) {
      setStep(err.step);
      setSubmitError(err.message);
      return;
    }
    if (!acceptedTerms) {
      setSubmitError("Tu dois accepter les CGU / CGV pour publier.");
      return;
    }

    setIsSubmitting(true);
    const { onboardingData, cautionRequise } = syncGsWizardToOnboardingPayload({
      accountType: data.accountType,
      raisonSociale: data.raisonSociale,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      ville: data.ville,
      postalCode: data.postalCode,
      offeredCategories: data.offeredCategories,
      additionalServices: data.additionalServices,
      handoffModes: data.handoffModes,
      adresse: data.adresse,
      rayonKm: data.rayonKm,
      villesDesservies: data.villesDesservies,
      dispoSemaine: data.dispoSemaine,
      dispoWeekend: data.dispoWeekend,
      dispoSoiree: data.dispoSoiree,
      horairesRetrait: data.horairesRetrait,
      bookingMode: data.bookingMode,
      cautionEnabled: data.cautionEnabled,
      cautionAmountDefault: data.cautionAmountDefault,
      leadTime: data.leadTime,
      leadTimeOther: data.leadTimeOther,
      cancellationPolicy: data.cancellationPolicy,
      listingKind: data.listingKind,
      nom: data.nom,
      gearCategoryField:
        data.listingKind === "pack" ? "pack_premium" : data.gearCategoryField,
      gearBrand: data.gearBrand,
      gearModel: data.gearModel,
      description: data.description,
      tarifParJour: data.tarifParJour,
      capacite: data.capacite || "0",
      quantite: data.quantite,
      etatMateriel: data.etatMateriel,
      packUsage: data.packUsage,
      packContents: data.packContents,
      packLivraison: data.packLivraison,
      packInstallation: data.packInstallation,
    });

    const formData = new FormData();
    formData.set("nom", onboardingData.nom);
    formData.set("ville", onboardingData.ville);
    formData.set("capacite", onboardingData.capacite);
    formData.set("adresse", onboardingData.adresse);
    if (data.postalCode) formData.set("postalCode", data.postalCode);
    if (data.lat != null) formData.set("lat", String(data.lat));
    if (data.lng != null) formData.set("lng", String(data.lng));
    formData.set("description", onboardingData.description);
    formData.set("tarifParJour", onboardingData.tarifParJour);
    formData.set("tarifMensuel", onboardingData.tarifMensuel ?? "");
    formData.set("tarifHoraire", onboardingData.tarifHoraire ?? "");
    formData.set("cautionRequise", cautionRequise ? "1" : "0");
    formData.set("inclusions", JSON.stringify(onboardingData.inclusions));
    formData.set("placesParking", onboardingData.placesParking ?? "");
    formData.set("features", JSON.stringify(onboardingData.features));
    formData.set("horairesParJour", JSON.stringify(onboardingData.horairesParJour));
    formData.set("joursOuverture", JSON.stringify(onboardingData.joursOuverture));
    formData.set("joursVisite", JSON.stringify([]));
    formData.set("visiteDates", JSON.stringify([]));
    formData.set("visiteHorairesParDate", JSON.stringify({}));
    formData.set("restrictionSonore", onboardingData.restrictionSonore ?? "none");
    formData.set("evenementsAcceptes", JSON.stringify(onboardingData.evenementsAcceptes));
    formData.set("listingKind", data.listingKind);
    formData.set("gearCategory", onboardingData.gearCategory ?? "");
    formData.set("gearBrand", onboardingData.gearBrand ?? "");
    formData.set("gearModel", onboardingData.gearModel ?? "");
    formData.set("proposeVisite", "0");

    const supabaseClient = createClient();
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setSubmitError("Session expirée, reconnecte-toi.");
      setIsSubmitting(false);
      return;
    }

    const imageUrls: string[] = [];
    const totalToUpload = data.photos.length;
    for (let i = 0; i < data.photos.length; i++) {
      setUploadProgress({ current: i + 1, total: totalToUpload });
      const file = data.photos[i];
      let blob: Blob;
      try {
        blob = await compressImage(file, { maxSizePx: 1600, quality: 0.75 });
      } catch (e) {
        setSubmitError(`Photo ${i + 1} : ${e instanceof Error ? e.message : "erreur"}`);
        setUploadProgress(null);
        setIsSubmitting(false);
        return;
      }
      const path = `${user.id}/${Date.now()}-${i}.jpg`;
      const { error } = await supabaseClient.storage.from("salle-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) {
        setSubmitError(`Photo ${i + 1} : ${error.message}`);
        setUploadProgress(null);
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabaseClient.storage.from("salle-photos").getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }
    setUploadProgress(null);
    formData.set("imageUrls", JSON.stringify(imageUrls));

    try {
      const result = await createSalleFromOnboarding(formData);
      if (result.success) {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
        setCreatedSlug(result.slug ?? null);
        setCreatedStatus(result.status ?? "pending");
        setSubmitted(true);
        onSuccess?.(result.slug ?? null, result.status ?? "pending");
      } else {
        setSubmitError((result as { error?: string }).error ?? "Publication impossible.");
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erreur inattendue.");
    }
    setIsSubmitting(false);
  };

  if (submitted && embedded) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="mt-4 font-landing-heading text-lg font-bold text-gs-dark">Bienvenue sur GetSoundOn</p>
        <p className="mt-2 font-landing-body text-sm text-slate-600">
          Ton espace est prêt. Tu peux gérer tes annonces, demandes et réservations.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Link
            href="/proprietaire"
            className="font-landing-btn flex h-11 w-full items-center justify-center rounded-md bg-gs-orange text-sm text-white transition hover:brightness-105"
          >
            Voir mon tableau de bord
          </Link>
          <Button variant="outline" onClick={onClose} className="w-full border-gs-line">
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  if (submitted && !embedded) {
    return (
      <div className="min-h-screen bg-gs-beige">
        <header className="border-b border-gs-line bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
            <Link href="/" className="font-landing-logo-mark flex items-center gap-2 text-lg text-gs-orange">
              <Image src="/images/logosound.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
              {siteConfig.name.toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-gs-orange" />
          <h1 className="font-landing-heading mt-6 text-2xl font-bold text-gs-dark">Bienvenue sur GetSoundOn</h1>
          <p className="font-landing-body mt-3 text-slate-600">
            Ton espace est prêt. Tu peux maintenant gérer tes annonces, tes demandes et tes réservations.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/proprietaire"
              className="font-landing-btn flex h-12 items-center justify-center rounded-md bg-gs-orange text-sm text-white transition hover:brightness-105"
            >
              Voir mon tableau de bord
            </Link>
            <Link
              href="/onboarding/salle"
              className="flex h-12 items-center justify-center rounded-md border border-gs-line bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Ajouter une autre annonce
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const chipClass = (on: boolean) =>
    cn(
      "rounded-full border px-4 py-2 text-sm font-medium transition",
      on ? "border-gs-orange bg-gs-orange/10 text-gs-dark" : "border-gs-line bg-white text-slate-600 hover:border-gs-orange/40"
    );

  const wizardBody = (
    <>
      <div className="mb-8">
        <p className="font-landing-nav text-sm font-medium text-slate-600">
          Étape {step} sur {TOTAL_STEPS}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gs-orange transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-600">{Math.round(progress)}%</span>
        </div>
        {(draftRestored || lastSavedAt) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gs-line bg-white px-3 py-2 text-xs text-slate-600">
            <p>
              {draftRestored
                ? "Brouillon restauré."
                : `Sauvegardé à ${lastSavedAt?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
            <button type="button" onClick={clearDraft} className="text-gs-orange hover:underline">
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Bienvenue sur GetSoundOn</h2>
            <p className="font-landing-body mt-1 text-slate-600">Commençons par configurer ton espace de location.</p>
            <p className="mt-2 text-xs text-slate-500">Tu pourras modifier tout cela plus tard.</p>
          </div>
          <p className="font-landing-nav text-sm font-semibold text-gs-dark">Tu proposes du matériel en tant que :</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {ACCOUNT_CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => updateData({ accountType: c.id })}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  data.accountType === c.id ? "border-gs-orange bg-gs-orange/5 ring-2 ring-gs-orange/30" : "border-gs-line bg-white hover:border-gs-orange/40"
                )}
              >
                <p className="font-landing-heading font-semibold text-gs-dark">{c.label}</p>
                <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Nom ou raison sociale</label>
            <Input value={data.raisonSociale} onChange={(e) => updateData({ raisonSociale: e.target.value })} className="border-gs-line" />
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Email</label>
            <Input
              type="email"
              value={data.contactEmail}
              onChange={(e) => updateData({ contactEmail: e.target.value })}
              className="border-gs-line"
            />
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Téléphone</label>
            <Input value={data.contactPhone} onChange={(e) => updateData({ contactPhone: e.target.value })} className="border-gs-line" />
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Ville</label>
            <VilleAutocomplete
              value={data.ville}
              onChange={(ville) => updateData({ ville, villeCode: null })}
              onCitySelect={(ville, citycode) => updateData({ ville, villeCode: citycode })}
              inputClassName="border-gs-line"
            />
          </div>
          <Button
            className="w-full bg-gs-orange font-landing-btn text-white hover:brightness-105"
            onClick={() => {
              const e = getValidationError(2, data);
              if (e) {
                setSubmitError(e.message);
                return;
              }
              setSubmitError(null);
              setStep(2);
            }}
          >
            Continuer
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Que proposes-tu sur GetSoundOn ?</h2>
            <p className="font-landing-body mt-1 text-slate-600">Sélectionne ce que tu peux louer ou proposer.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {OFFER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chipClass(data.offeredCategories.includes(c.id))}
                onClick={() =>
                  updateData({
                    offeredCategories: toggleIn(data.offeredCategories, c.id),
                  })
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="font-landing-nav text-sm font-semibold text-gs-dark">Tu proposes aussi :</p>
          <div className="flex flex-wrap gap-2">
            {ADDITIONAL_SVC.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chipClass(data.additionalServices.includes(c.id))}
                onClick={() =>
                  updateData({
                    additionalServices: toggleIn(data.additionalServices, c.id),
                  })
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-gs-line" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = getValidationError(3, data);
                if (e) {
                  setSubmitError(e.message);
                  setStep(e.step);
                  return;
                }
                setSubmitError(null);
                setStep(3);
              }}
            >
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Comment le client récupère son matériel ?</h2>
            <p className="font-landing-body mt-1 text-slate-600">Modes et zone d’activité.</p>
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Modes disponibles</p>
            <div className="flex flex-wrap gap-2">
              {HANDOFF.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={chipClass(data.handoffModes.includes(h.id))}
                  onClick={() =>
                    updateData({ handoffModes: toggleIn(data.handoffModes, h.id) })
                  }
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Zone d’activité</p>
            <label className="text-sm text-gs-dark">Adresse principale</label>
            <AdresseAutocomplete
              value={data.adresse}
              onChange={(addr) =>
                updateData({ adresse: addr, lat: undefined, lng: undefined, postalCode: "" })
              }
              citycode={data.villeCode}
              onSelectAddress={(addr, _city, postcode, coords) =>
                updateData({
                  adresse: addr,
                  postalCode: postcode ?? "",
                  lat: coords?.lat,
                  lng: coords?.lng,
                })
              }
              inputClassName="border-gs-line"
            />
            <p className="mt-3 font-landing-nav text-sm font-medium text-gs-dark">Rayon d’intervention</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RAYON_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={chipClass(data.rayonKm === r.id)}
                  onClick={() => updateData({ rayonKm: r.id })}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm text-gs-dark">Villes desservies (optionnel)</label>
            <Input
              value={data.villesDesservies}
              onChange={(e) => updateData({ villesDesservies: e.target.value })}
              placeholder="Ex. : Paris, Boulogne…"
              className="mt-1 border-gs-line"
            />
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Disponibilités générales</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["dispoSemaine", "En semaine"],
                  ["dispoWeekend", "Week-end"],
                  ["dispoSoiree", "Soirée"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={chipClass(!!data[k])}
                  onClick={() => updateData({ [k]: !data[k] } as Partial<GsWizardData>)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm text-gs-dark">Horaires de retrait (optionnel)</label>
            <Input
              value={data.horairesRetrait}
              onChange={(e) => updateData({ horairesRetrait: e.target.value })}
              placeholder="Ex. : 10h–19h en semaine"
              className="mt-1 border-gs-line"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-gs-line" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = getValidationError(4, data);
                if (e) {
                  setSubmitError(e.message);
                  setStep(e.step);
                  return;
                }
                setSubmitError(null);
                setStep(4);
              }}
            >
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Configure tes conditions de location</h2>
            <p className="font-landing-body mt-1 text-slate-600">Règles simples, ajustables plus tard.</p>
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Mode de réservation</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chipClass(data.bookingMode === "manual")}
                onClick={() => updateData({ bookingMode: "manual" })}
              >
                Validation manuelle
              </button>
              <button
                type="button"
                className={chipClass(data.bookingMode === "instant")}
                onClick={() => updateData({ bookingMode: "instant" })}
              >
                Réservation instantanée
              </button>
            </div>
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Caution</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chipClass(data.cautionEnabled)}
                onClick={() => updateData({ cautionEnabled: true })}
              >
                Caution requise
              </button>
              <button
                type="button"
                className={chipClass(!data.cautionEnabled)}
                onClick={() => updateData({ cautionEnabled: false })}
              >
                Pas de caution
              </button>
            </div>
            {data.cautionEnabled && (
              <Input
                className="mt-2 border-gs-line"
                placeholder="Montant indicatif (€)"
                value={data.cautionAmountDefault}
                onChange={(e) => updateData({ cautionAmountDefault: e.target.value })}
              />
            )}
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Délai minimum avant réservation</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["same_day", "Le jour même"],
                ["24h", "24 h"],
                ["48h", "48 h"],
                ["other", "Autre"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={chipClass(data.leadTime === id)}
                  onClick={() => updateData({ leadTime: id })}
                >
                  {label}
                </button>
              ))}
            </div>
            {data.leadTime === "other" && (
              <Input
                className="mt-2 border-gs-line"
                placeholder="Précise…"
                value={data.leadTimeOther}
                onChange={(e) => updateData({ leadTimeOther: e.target.value })}
              />
            )}
          </div>
          <div>
            <p className="font-landing-nav mb-2 text-sm font-semibold text-gs-dark">Politique d’annulation</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["flexible", "Flexible"],
                  ["moderate", "Modérée"],
                  ["strict", "Stricte"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={chipClass(data.cancellationPolicy === id)}
                  onClick={() => updateData({ cancellationPolicy: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="rounded-lg border border-gs-line bg-white p-3 text-xs text-slate-600">
            Les paiements sont gérés de manière sécurisée via Stripe Connect.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-gs-line" onClick={() => setStep(3)}>
              Retour
            </Button>
            <Button className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105" onClick={() => setStep(5)}>
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Ajoute ta première annonce</h2>
            <p className="font-landing-body mt-1 text-slate-600">
              Commence par un matériel ou un pack. Tu pourras en ajouter d’autres ensuite.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={chipClass(data.listingKind === "equipment")}
              onClick={() => updateData({ listingKind: "equipment" })}
            >
              Ajouter un matériel
            </button>
            <button
              type="button"
              className={chipClass(data.listingKind === "pack")}
              onClick={() => updateData({ listingKind: "pack", gearCategoryField: "pack_premium" })}
            >
              Créer un pack
            </button>
          </div>

          {data.listingKind === "equipment" ? (
            <div className="space-y-3">
              <Input
                placeholder="Titre de l’annonce"
                value={data.nom}
                onChange={(e) => updateData({ nom: e.target.value })}
                className="border-gs-line"
              />
              <label className="text-sm font-medium text-gs-dark">Catégorie</label>
              <select
                className="h-11 w-full rounded-md border border-gs-line bg-white px-3 text-sm"
                value={data.gearCategoryField}
                onChange={(e) => updateData({ gearCategoryField: e.target.value })}
              >
                {GEAR_SELECT.filter((g) => g.value !== "pack_premium").map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Marque" value={data.gearBrand} onChange={(e) => updateData({ gearBrand: e.target.value })} className="border-gs-line" />
                <Input placeholder="Modèle" value={data.gearModel} onChange={(e) => updateData({ gearModel: e.target.value })} className="border-gs-line" />
              </div>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-gs-line p-3 text-sm"
                placeholder="Description courte"
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Prix / jour (€)"
                  type="number"
                  min={1}
                  value={data.tarifParJour}
                  onChange={(e) => updateData({ tarifParJour: e.target.value })}
                  className="border-gs-line"
                />
                <Input
                  placeholder="Quantité"
                  value={data.quantite}
                  onChange={(e) => updateData({ quantite: e.target.value })}
                  className="border-gs-line"
                />
              </div>
              <Input
                placeholder="État du matériel"
                value={data.etatMateriel}
                onChange={(e) => updateData({ etatMateriel: e.target.value })}
                className="border-gs-line"
              />
              <p className="text-xs text-slate-500">Capacité / personnes (optionnel)</p>
              <Input
                placeholder="Ex. 80"
                value={data.capacite}
                onChange={(e) => updateData({ capacite: e.target.value })}
                className="border-gs-line"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Nom du pack"
                value={data.nom}
                onChange={(e) => updateData({ nom: e.target.value })}
                className="border-gs-line"
              />
              <label className="text-sm font-medium text-gs-dark">Usage / type d’événement</label>
              <select
                className="h-11 w-full rounded-md border border-gs-line bg-white px-3 text-sm"
                value={data.packUsage}
                onChange={(e) => updateData({ packUsage: e.target.value })}
              >
                {PACK_USAGE.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Capacité / nombre de personnes"
                value={data.capacite}
                onChange={(e) => updateData({ capacite: e.target.value })}
                className="border-gs-line"
              />
              <textarea
                className="min-h-[100px] w-full rounded-md border border-gs-line p-3 text-sm"
                placeholder="Ce que le pack contient"
                value={data.packContents}
                onChange={(e) => updateData({ packContents: e.target.value })}
              />
              <Input
                placeholder="Prix (€ / jour)"
                type="number"
                min={1}
                value={data.tarifParJour}
                onChange={(e) => updateData({ tarifParJour: e.target.value })}
                className="border-gs-line"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={chipClass(data.packLivraison)}
                  onClick={() => updateData({ packLivraison: !data.packLivraison })}
                >
                  Livraison possible
                </button>
                <button
                  type="button"
                  className={chipClass(data.packInstallation)}
                  onClick={() => updateData({ packInstallation: !data.packInstallation })}
                >
                  Installation possible
                </button>
              </div>
            </div>
          )}

          <div
            className="rounded-xl border-2 border-dashed border-gs-line bg-white p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(
                (f) => f.type === "image/jpeg" || f.type === "image/png"
              );
              if (files.length) {
                setData((prev) => ({
                  ...prev,
                  photos: [...prev.photos, ...files].slice(0, MAX_PHOTOS),
                }));
              }
            }}
          >
            <Camera className="mx-auto h-10 w-10 text-gs-orange" />
            <p className="mt-2 text-sm font-medium text-gs-dark">Photos</p>
            <p className="text-xs text-slate-500">JPG / PNG — min. {MIN_PHOTOS}, max {MAX_PHOTOS}</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={handleFileChange} />
            <Button type="button" variant="outline" className="mt-3 border-gs-line" onClick={() => fileInputRef.current?.click()}>
              Choisir des fichiers
            </Button>
            {data.photos.length > 0 && (
              <ul className="mt-4 space-y-1 text-left text-sm text-slate-600">
                {data.photos.map((f, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{f.name}</span>
                    <button type="button" className="text-gs-orange" onClick={() => setData((p) => ({ ...p, photos: p.photos.filter((_, j) => j !== i) }))}>
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-gs-line" onClick={() => setStep(4)}>
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = getValidationError(6, data);
                if (e) {
                  setSubmitError(e.message);
                  return;
                }
                setSubmitError(null);
                setStep(6);
              }}
            >
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Ton espace est presque prêt</h2>
            <p className="font-landing-body mt-1 text-slate-600">Vérifie les points ci-dessous avant publication.</p>
          </div>
          <ul className="space-y-2 rounded-xl border border-gs-line bg-white p-4 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span>Profil complété</span>
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Zone définie</span>
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Services configurés</span>
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Première annonce</span>
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Paiement connecté (Stripe)</span>
              {!stripeChecked ? (
                <span className="text-xs text-slate-400">…</span>
              ) : stripeReady ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">À terminer</span>
              )}
            </li>
          </ul>
          {stripeChecked && !stripeReady && (
            <p className="text-xs text-slate-500">
              Tu pourras finaliser Stripe depuis <strong>Paiements</strong> dans ton tableau de bord. Ce n’est pas bloquant pour publier ton annonce.
            </p>
          )}
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gs-line accent-gs-orange"
            />
            <span>
              J’accepte les{" "}
              <Link href="/cgu" className="font-medium text-gs-orange hover:underline" target="_blank">
                CGU
              </Link>{" "}
              et{" "}
              <Link href="/cgv" className="font-medium text-gs-orange hover:underline" target="_blank">
                CGV
              </Link>
              .
            </span>
          </label>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          {uploadProgress && (
            <p className="text-sm text-slate-600">
              Envoi photo {uploadProgress.current} / {uploadProgress.total}…
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="flex-1 border-gs-line" onClick={() => setStep(5)} disabled={isSubmitting}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              disabled={isSubmitting || !acceptedTerms}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Publication…" : "Publier mon espace"}
            </Button>
          </div>
          <Link href="/proprietaire" className="block w-full py-2 text-center text-sm font-medium text-slate-600 hover:text-gs-dark">
            Accéder à mon tableau de bord
          </Link>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="font-landing-body text-gs-dark">{wizardBody}</div>;
  }

  return (
    <div className="min-h-screen bg-gs-beige font-landing-body text-gs-dark">
      <header className="border-b border-gs-line bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="font-landing-logo-mark flex items-center gap-2 text-lg text-gs-orange">
            {isHydrated && (
              <Image src="/images/logosound.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            )}
            {siteConfig.name.toUpperCase()}
          </Link>
          <div className="flex items-center gap-1 text-xs text-slate-500 sm:text-sm">
            <Clock className="h-4 w-4 text-gs-orange" />
            ~5 min
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{wizardBody}</main>
    </div>
  );
}
