"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EquipmentIdentityFields } from "@/components/onboarding/EquipmentIdentityFields";
import { CompanyAutocompleteField } from "@/components/onboarding/CompanyAutocompleteField";
import { getEquipmentCategory } from "@/lib/equipment/equipment-catalog";
import {
  buildEquipmentTaxonomyLine,
  buildSearchKeywords,
  buildSuggestedEquipmentDescription,
  buildSuggestedEquipmentTitle,
  findMatchingBrand,
  findMatchingModel,
  gearFieldToCategoryId,
  resolveBrandDisplay,
  resolveModelDisplay,
  subcategoryLabel,
} from "@/lib/equipment/equipment.helpers";
import { equipmentIdentityZod, formatEquipmentZodError } from "@/lib/equipment/equipment.zod";
import type { EquipmentCategoryId } from "@/lib/equipment/equipment.types";
import { OTHER_KEY } from "@/lib/equipment/equipment.types";
import { Camera, CheckCircle, ChevronLeft, Clock, Info } from "lucide-react";

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
import {
  GsListingRulesRecap,
  ListingRulesCancellationBlock,
  ListingRulesDepositBlock,
  ListingRulesPaymentBlock,
  ListingRulesReservationBlock,
} from "@/components/materiel/listing-rules-blocks";
import type { GsListingCancellationPolicy } from "@/lib/gs-booking-cancellation";

const TOTAL_STEPS = 6;
const ONBOARDING_DRAFT_KEY = "gs_provider_onboarding_v2";
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 10;

/** Icône (i) : infobulle au survol / focus ; `title` en secours (ex. mobile). */
function HintIcon({ hint, topic }: { hint: string; topic: string }) {
  return (
    <span className="group relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-gs-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-gs-orange/35"
        aria-label={`Aide : ${topic}`}
        title={hint}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-[60] mt-1.5 w-max max-w-[min(280px,calc(100vw-2.5rem))] -translate-x-1/2 whitespace-normal rounded-md border border-gs-line bg-white px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-slate-600 opacity-0 shadow-md ring-1 ring-black/5 transition-opacity duration-100 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {hint}
      </span>
    </span>
  );
}

/** Titre de bloc + aide au survol sur l’icône. */
function SectionTitleWithHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mb-0">
      <span className="text-sm font-semibold text-gs-dark">{title}</span>
      <HintIcon hint={hint} topic={title} />
    </div>
  );
}

/** Libellé de champ + aide au survol sur l’icône. */
function LabelWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
      <span className="text-sm font-medium text-gs-dark">{label}</span>
      <HintIcon hint={hint} topic={label} />
    </div>
  );
}

const ACCOUNT_CARDS: { id: AccountTypeGs; label: string; hint: string }[] = [
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
  companyMode: "search" | "manual";
  companySearch: string;
  companyName: string;
  companySiren: string;
  companySiret: string;
  companyCity: string;
  companyPostalCode: string;
  companyLegalForm: string;
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
  /** Montant caution (€), « 0 » ou vide = pas de caution */
  depositAmountEur: string;
  leadTime: string;
  leadTimeOther: string;
  cancellationPolicy: "flexible" | "moderate" | "strict";
  storefrontName: string;
  storefrontDescription: string;
  storefrontLocationDisplay: string;
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
  /** Taxonomie matériel — étape 6 */
  eqCategoryId: EquipmentCategoryId | "";
  eqSubcategoryId: string;
  eqBrandKey: string;
  eqModelKey: string;
  eqCustomBrand: string;
  eqCustomModel: string;
  nomTouched: boolean;
  descriptionTouched: boolean;
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
  depositAmountEur: "0",
  leadTime: "24h",
  leadTimeOther: "",
  cancellationPolicy: "moderate",
  storefrontName: "",
  storefrontDescription: "",
  storefrontLocationDisplay: "",
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
  eqCategoryId: "sono",
  eqSubcategoryId: "",
  eqBrandKey: "",
  eqModelKey: "",
  eqCustomBrand: "",
  eqCustomModel: "",
  nomTouched: false,
  descriptionTouched: false,
  companyMode: "search",
  companySearch: "",
  companyName: "",
  companySiren: "",
  companySiret: "",
  companyCity: "",
  companyPostalCode: "",
  companyLegalForm: "",
};

/** Brouillons sans champs taxonomie : dériver depuis gear* / texte libre. */
function applyEquipmentLegacyMigration(d: GsWizardData): GsWizardData {
  if (d.listingKind !== "equipment") return d;
  let next = { ...d };
  if (!next.eqCategoryId && next.gearCategoryField) {
    next = { ...next, eqCategoryId: gearFieldToCategoryId(next.gearCategoryField) };
  }
  if (next.eqCategoryId && next.eqSubcategoryId && next.gearBrand.trim() && !next.eqBrandKey) {
    const cid = next.eqCategoryId as EquipmentCategoryId;
    const mb = findMatchingBrand(cid, next.eqSubcategoryId, next.gearBrand);
    if (mb) {
      next = { ...next, eqBrandKey: mb, eqCustomBrand: "" };
      if (next.gearModel.trim()) {
        const mm = findMatchingModel(cid, next.eqSubcategoryId, mb, next.gearModel);
        if (mm) next = { ...next, eqModelKey: mm, eqCustomModel: "" };
        else next = { ...next, eqModelKey: OTHER_KEY, eqCustomModel: next.gearModel };
      }
    } else {
      next = {
        ...next,
        eqBrandKey: OTHER_KEY,
        eqCustomBrand: next.gearBrand.trim(),
        ...(next.gearModel.trim()
          ? { eqModelKey: OTHER_KEY as string, eqCustomModel: next.gearModel.trim() }
          : {}),
      };
    }
  }
  if (next.nom.trim()) next = { ...next, nomTouched: true };
  if (next.description.trim()) next = { ...next, descriptionTouched: true };
  const legacy = next as GsWizardData & { cautionEnabled?: boolean; cautionAmountDefault?: string };
  if (legacy.cautionEnabled && legacy.cautionAmountDefault?.trim()) {
    next = {
      ...next,
      depositAmountEur: legacy.cautionAmountDefault.replace(/[^\d.,]/g, "").replace(",", "."),
    };
  } else if ("cautionEnabled" in legacy && legacy.cautionEnabled === false) {
    next = { ...next, depositAmountEur: "0" };
  }
  if (!next.depositAmountEur || next.depositAmountEur.trim() === "") {
    next = { ...next, depositAmountEur: "0" };
  }
  return next;
}

function toggleIn<T extends string>(arr: T[], id: T): T[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function validationLeavingStep(fromStep: number, d: GsWizardData): { step: number; message: string } | null {
  if (fromStep === 1) {
    if (!d.accountType) return { step: 1, message: "Choisissez un type de compte." };
    if (!d.raisonSociale.trim()) return { step: 1, message: "Indiquez votre raison sociale ou SIRET." };
    if (!d.contactEmail.trim() || !emailOk(d.contactEmail)) return { step: 1, message: "Email invalide." };
    const digits = d.contactPhone.replace(/\D/g, "");
    if (!d.contactPhone.trim() || digits.length < 8) return { step: 1, message: "Téléphone requis (8 chiffres minimum)." };
    if (!d.ville.trim()) return { step: 1, message: "Indiquez votre ville." };
  }
  if (fromStep === 2) {
    if (!d.offeredCategories.length) return { step: 2, message: "Sélectionnez au moins une catégorie." };
  }
  if (fromStep === 3) {
    if (!d.handoffModes.length) return { step: 3, message: "Indiquez au moins un mode de remise." };
    if (!d.adresse.trim()) return { step: 3, message: "Renseignez l’adresse principale." };
    if (!d.rayonKm) return { step: 3, message: "Choisissez un rayon d’intervention." };
  }
  if (fromStep === 4) {
    const depRaw = String(d.depositAmountEur ?? "").replace(",", ".").trim();
    const dep = depRaw === "" ? 0 : Number.parseFloat(depRaw);
    if (!Number.isFinite(dep) || dep < 0) {
      return { step: 4, message: "Indiquez un montant de caution valide (0 € si aucune caution)." };
    }
    if (d.leadTime === "other" && !d.leadTimeOther.trim()) {
      return { step: 4, message: "Précisez le délai minimum." };
    }
  }
  if (fromStep === 5) {
    if (!d.storefrontName.trim()) return { step: 5, message: "Donnez un nom à votre boutique." };
    if (!d.storefrontDescription.trim()) return { step: 5, message: "Ajoutez une courte description." };
    if (!d.storefrontLocationDisplay.trim()) return { step: 5, message: "Indiquez la localisation affichée." };
  }
  return null;
}

function validationListingForPublish(d: GsWizardData): { step: number; message: string } | null {
  if (!d.nom.trim()) return { step: 6, message: "Donnez un titre à votre annonce." };
  if (!d.tarifParJour.trim() || parseInt(d.tarifParJour, 10) <= 0) {
    return { step: 6, message: "Indiquez un prix valide." };
  }
  if (d.listingKind === "equipment") {
    if (!d.eqCategoryId) return { step: 6, message: "Choisissez une catégorie métier." };
    const zr = equipmentIdentityZod.safeParse({
      eqCategoryId: d.eqCategoryId,
      eqSubcategoryId: d.eqSubcategoryId,
      eqBrandKey: d.eqBrandKey,
      eqModelKey: d.eqModelKey,
      eqCustomBrand: d.eqCustomBrand,
      eqCustomModel: d.eqCustomModel,
    });
    if (!zr.success) return { step: 6, message: formatEquipmentZodError(zr.error) };
    if (!d.description.trim()) return { step: 6, message: "Ajoutez une description courte." };
  } else if (!d.packContents.trim()) {
    return { step: 6, message: "Décrivez ce que contient le pack." };
  }
  if (d.photos.length < MIN_PHOTOS) {
    return { step: 6, message: `Ajoutez au moins ${MIN_PHOTOS} photo.` };
  }
  return null;
}

function validateAllBeforePublish(d: GsWizardData): { step: number; message: string } | null {
  for (const s of [1, 2, 3, 4, 5] as const) {
    const e = validationLeavingStep(s, d);
    if (e) return e;
  }
  return validationListingForPublish(d);
}

export type GetSoundOnOnboardingWizardProps = {
  embedded?: boolean;
  /** Préremplissage après inscription sur /auth */
  initialEmail?: string;
  initialDisplayName?: string;
  onSuccess?: (slug: string | null, status: "approved" | "pending") => void;
  onClose?: () => void;
};

export function GetSoundOnOnboardingWizard({
  embedded,
  initialEmail,
  initialDisplayName,
  onSuccess,
  onClose,
}: GetSoundOnOnboardingWizardProps = {}) {
  const router = useRouter();
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [stripeConnectReady, setStripeConnectReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedDraftRef = useRef(false);

  const progress = (step / TOTAL_STEPS) * 100;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user || cancelled) return;
      const { data: row } = await sb.from("profiles").select("stripe_account_id").eq("id", user.id).maybeSingle();
      if (!cancelled) {
        setStripeConnectReady(!!(row as { stripe_account_id?: string | null } | null)?.stripe_account_id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialEmail && !initialDisplayName) return;
    setData((prev) => ({
      ...prev,
      contactEmail: prev.contactEmail.trim() ? prev.contactEmail : (initialEmail ?? prev.contactEmail),
      raisonSociale: prev.raisonSociale.trim() ? prev.raisonSociale : (initialDisplayName ?? prev.raisonSociale),
    }));
  }, [initialEmail, initialDisplayName]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { step?: number; data?: Partial<GsWizardData> };
        if (parsed.data) {
          setData(
            applyEquipmentLegacyMigration({
              ...initialData,
              ...parsed.data,
              photos: [],
            } as GsWizardData)
          );
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

  const updateData = useCallback((u: Partial<GsWizardData>) => {
    setSubmitError(null);
    setData((prev) => ({ ...prev, ...u }));
  }, []);

  useEffect(() => {
    setData((prev) => {
      if (prev.listingKind !== "equipment" || !prev.eqCategoryId || !prev.eqSubcategoryId || prev.nomTouched) return prev;
      const cid = prev.eqCategoryId as EquipmentCategoryId;
      const brand = resolveBrandDisplay(cid, prev.eqSubcategoryId, prev.eqBrandKey, prev.eqCustomBrand);
      const model = resolveModelDisplay(
        cid,
        prev.eqSubcategoryId,
        prev.eqBrandKey,
        prev.eqModelKey,
        prev.eqCustomModel
      );
      const t = buildSuggestedEquipmentTitle({
        categoryId: cid,
        subcategoryId: prev.eqSubcategoryId,
        brandDisplay: brand,
        modelDisplay: model,
      });
      if (!t || t === prev.nom) return prev;
      return { ...prev, nom: t };
    });
  }, [
    data.listingKind,
    data.eqCategoryId,
    data.eqSubcategoryId,
    data.eqBrandKey,
    data.eqModelKey,
    data.eqCustomBrand,
    data.eqCustomModel,
    data.nomTouched,
  ]);

  useEffect(() => {
    setData((prev) => {
      if (prev.listingKind !== "equipment" || !prev.eqCategoryId || !prev.eqSubcategoryId || prev.descriptionTouched)
        return prev;
      const cid = prev.eqCategoryId as EquipmentCategoryId;
      const brand = resolveBrandDisplay(cid, prev.eqSubcategoryId, prev.eqBrandKey, prev.eqCustomBrand);
      const model = resolveModelDisplay(
        cid,
        prev.eqSubcategoryId,
        prev.eqBrandKey,
        prev.eqModelKey,
        prev.eqCustomModel
      );
      const title = buildSuggestedEquipmentTitle({
        categoryId: cid,
        subcategoryId: prev.eqSubcategoryId,
        brandDisplay: brand,
        modelDisplay: model,
      });
      if (!title) return prev;
      const desc = buildSuggestedEquipmentDescription(title, cid);
      if (!desc || desc === prev.description) return prev;
      return { ...prev, description: desc };
    });
  }, [
    data.listingKind,
    data.eqCategoryId,
    data.eqSubcategoryId,
    data.eqBrandKey,
    data.eqModelKey,
    data.eqCustomBrand,
    data.eqCustomModel,
    data.descriptionTouched,
    data.nom,
  ]);

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
      setSubmitError(null);
      setData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...files].slice(0, MAX_PHOTOS),
      }));
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const err = validateAllBeforePublish(data);
    if (err) {
      setStep(err.step);
      setSubmitError(err.message);
      return;
    }
    if (!acceptedTerms) {
      setSubmitError("Vous devez accepter les CGU et les CGV pour publier.");
      return;
    }

    setIsSubmitting(true);

    let equipmentTaxonomyLine: string | undefined;
    if (data.listingKind === "equipment" && data.eqCategoryId && data.eqSubcategoryId) {
      const cid = data.eqCategoryId as EquipmentCategoryId;
      const bd = resolveBrandDisplay(cid, data.eqSubcategoryId, data.eqBrandKey, data.eqCustomBrand);
      const md = resolveModelDisplay(
        cid,
        data.eqSubcategoryId,
        data.eqBrandKey,
        data.eqModelKey,
        data.eqCustomModel
      );
      const cat = getEquipmentCategory(cid);
      const kw = buildSearchKeywords(
        [cat?.label, subcategoryLabel(cid, data.eqSubcategoryId), bd, md, data.nom].filter(
          Boolean
        ) as string[]
      );
      equipmentTaxonomyLine = buildEquipmentTaxonomyLine(cid, data.eqSubcategoryId, bd, md, kw);
    }

    const { onboardingData, cautionRequise } = syncGsWizardToOnboardingPayload({
      accountType: data.accountType,
      raisonSociale: data.raisonSociale,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      ville: data.ville,
      storefrontName: data.storefrontName,
      storefrontDescription: data.storefrontDescription,
      storefrontLocationDisplay: data.storefrontLocationDisplay,
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
      depositAmountEur: data.depositAmountEur,
      leadTime: data.leadTime,
      leadTimeOther: data.leadTimeOther,
      cancellationPolicy: data.cancellationPolicy,
      listingKind: data.listingKind,
      nom: data.nom,
      gearCategoryField:
        data.listingKind === "pack" ? "pack_premium" : data.gearCategoryField,
      gearBrand: data.gearBrand,
      gearModel: data.gearModel,
      description: data.listingKind === "pack" ? data.packContents : data.description,
      tarifParJour: data.tarifParJour,
      capacite: data.capacite || "0",
      quantite: data.quantite,
      etatMateriel: data.etatMateriel,
      packUsage: data.packUsage,
      packContents: data.packContents,
      packLivraison: data.packLivraison,
      packInstallation: data.packInstallation,
      equipmentTaxonomyLine,
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
    const depEur = Math.max(
      0,
      Number.parseFloat(String(data.depositAmountEur).replace(",", ".").trim()) || 0
    );
    formData.set("gsListingDepositEur", String(depEur));
    formData.set("gsListingImmediateConfirmation", data.bookingMode === "instant" ? "1" : "0");
    formData.set("gsListingCancellationPolicy", data.cancellationPolicy);
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
      setSubmitError("Session expirée. Reconnectez-vous.");
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
      <div className="flex flex-col items-center py-6 text-center [font-family:var(--font-landing-inter),ui-sans-serif,sans-serif]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gs-dark">Votre espace est prêt</h2>
        <p className="mt-2 text-sm text-slate-600">
          Vous pouvez maintenant gérer votre boutique, vos annonces et vos réservations.
        </p>
        <ul className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-gs-line bg-white p-4 text-left text-sm text-slate-700">
          {[
            "Profil complété",
            "Services configurés",
            "Logistique définie",
            "Boutique créée",
            "Première annonce ajoutée",
          ].map((label) => (
            <li key={label} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
          <Link
            href="/proprietaire"
            className="flex h-11 w-full items-center justify-center rounded-md bg-gs-orange text-sm font-medium text-white transition hover:brightness-105"
          >
            Voir mon tableau de bord
          </Link>
          {createdSlug ? (
            <Link
              href={`/salles/${createdSlug}`}
              className="flex h-11 w-full items-center justify-center rounded-md border border-gs-line bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Voir ma boutique
            </Link>
          ) : null}
          <Link
            href="/proprietaire/ajouter-annonce"
            className="flex h-11 w-full items-center justify-center text-sm font-medium text-slate-600 hover:text-gs-dark"
          >
            Ajouter une autre annonce
          </Link>
          <Button type="button" variant="outline" onClick={onClose} className="w-full border-gs-line">
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  if (submitted && !embedded) {
    return (
      <div className="min-h-screen bg-gs-beige [font-family:var(--font-landing-inter),ui-sans-serif,sans-serif]">
        <header className="border-b border-gs-line bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gs-orange">
              <Image src="/images/logosound.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
              {siteConfig.name.toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-gs-orange" />
          <h1 className="mt-6 text-2xl font-bold text-gs-dark">Votre espace est prêt</h1>
          <p className="mt-3 text-slate-600">
            Vous pouvez maintenant gérer votre boutique, vos annonces et vos réservations.
          </p>
          <ul className="mx-auto mt-8 max-w-sm space-y-2 rounded-xl border border-gs-line bg-white p-4 text-left text-sm text-slate-700">
            {[
              "Profil complété",
              "Services configurés",
              "Logistique définie",
              "Boutique créée",
              "Première annonce ajoutée",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/proprietaire"
              className="flex h-12 items-center justify-center rounded-md bg-gs-orange text-sm font-medium text-white transition hover:brightness-105"
            >
              Voir mon tableau de bord
            </Link>
            {createdSlug ? (
              <Link
                href={`/salles/${createdSlug}`}
                className="flex h-12 items-center justify-center rounded-md border border-gs-line bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Voir ma boutique
              </Link>
            ) : null}
            <Link
              href="/proprietaire/ajouter-annonce"
              className="flex h-12 items-center justify-center text-sm font-medium text-slate-600 hover:text-gs-dark"
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

      {submitError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm"
        >
          <p className="font-semibold text-red-950">Complétez les champs requis</p>
          <p className="mt-1 leading-relaxed">{submitError}</p>
        </div>
      ) : null}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <p className="mt-2 text-xs text-slate-500">Vous pourrez modifier ces informations plus tard.</p>
          </div>
          <SectionTitleWithHint
            title="Vous proposez du matériel en tant que :"
            hint="Choix utilisé pour personnaliser votre profil et vos documents."
          />
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="space-y-4">
            <div className="space-y-1.5">
              <LabelWithHint
                label="Raison sociale ou SIRET"
                hint="Cherchez votre entreprise ou passez en saisie manuelle."
              />
              <CompanyAutocompleteField
                value={data.companySearch}
                placeholder="Ex. Soundrush Paris, Guy Location Events, ou un SIRET"
                onChange={(v) =>
                  updateData({
                    companyMode: "search",
                    companySearch: v,
                  })
                }
                onSelect={(c) =>
                  updateData({
                    companyMode: "search",
                    companySearch: c.name,
                    raisonSociale: c.name,
                    companyName: c.name,
                    companySiren: c.siren ?? "",
                    companySiret: c.siret ?? "",
                    companyCity: c.city ?? "",
                    companyPostalCode: c.postalCode ?? "",
                    companyLegalForm: c.legalForm ?? "",
                  })
                }
                onManual={() =>
                  updateData({
                    companyMode: "manual",
                    raisonSociale: "",
                    companySearch: "",
                    companyName: "",
                    companySiren: "",
                    companySiret: "",
                    companyCity: "",
                    companyPostalCode: "",
                    companyLegalForm: "",
                  })
                }
              />
              {data.companyMode === "manual" ? (
                <Input
                  value={data.raisonSociale}
                  onChange={(e) => updateData({ raisonSociale: e.target.value })}
                  className="mt-1 border-gs-line"
                  placeholder="Nom ou raison sociale (saisie manuelle)"
                />
              ) : null}
            </div>
            <div>
              <LabelWithHint label="Email" hint="Pour les notifications de réservation et la connexion." />
              <Input
                type="email"
                value={data.contactEmail}
                onChange={(e) => updateData({ contactEmail: e.target.value })}
                className="mt-1.5 border-gs-line"
              />
            </div>
            <div>
              <LabelWithHint label="Téléphone" hint="Numéro joignable pour les questions avant location." />
              <Input
                value={data.contactPhone}
                onChange={(e) => updateData({ contactPhone: e.target.value })}
                className="mt-1.5 border-gs-line"
              />
            </div>
            <div>
              <LabelWithHint label="Ville" hint="Votre ville principale d’activité ou de dépôt du matériel." />
              <div className="mt-1.5">
                <VilleAutocomplete
                  value={data.ville}
                  onChange={(ville) => updateData({ ville, villeCode: null })}
                  onCitySelect={(ville, citycode) => updateData({ ville, villeCode: citycode })}
                  inputClassName="border-gs-line"
                />
              </div>
            </div>
          </div>
          <Button
            className="w-full bg-gs-orange font-landing-btn text-white hover:brightness-105"
            onClick={() => {
              const e = validationLeavingStep(1, data);
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
            <h2 className="text-2xl font-bold text-gs-dark">Que proposez-vous à la location ?</h2>
            <p className="mt-1 text-slate-600">
              Sélectionnez les catégories et services que vous souhaitez proposer sur GetSoundOn.
            </p>
          </div>
          <div>
            <SectionTitleWithHint
              title="Catégories"
              hint="Types de matériel que vous louez (sono, lumière, etc.). Au moins une."
            />
            <div className="mt-2 flex flex-wrap gap-2">
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
          </div>
          <div>
            <SectionTitleWithHint
              title="Services proposés"
              hint="Livraison, installation… Aident les clients à comprendre ce que vous faites."
            />
            <div className="mt-2 flex flex-wrap gap-2">
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
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gs-line"
              onClick={() => {
                setSubmitError(null);
                setStep(1);
              }}
            >
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = validationLeavingStep(2, data);
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
            <h2 className="text-2xl font-bold text-gs-dark">Comment vos clients récupèrent le matériel ?</h2>
            <p className="mt-1 text-slate-600">Définissez votre zone d’activité et vos modes de remise.</p>
          </div>
          <div>
            <SectionTitleWithHint
              title="Modes de remise"
              hint="Comment le client récupère le matériel (retrait, livraison…). Au moins un mode."
            />
            <div className="mt-2 flex flex-wrap gap-2">
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
            <SectionTitleWithHint
              title="Zone desservie"
              hint="Point de départ pour la livraison ou le retrait, et zone couverte."
            />
            <div className="mt-2">
              <LabelWithHint
                label="Adresse principale"
                hint="Adresse de dépôt ou d’expédition ; aide à calculer distances et trajets."
              />
              <div className="mt-1.5">
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
              </div>
            </div>
            <div className="mt-4">
              <SectionTitleWithHint
                title="Rayon d’intervention"
                hint="Distance max ou « sur devis » si vous préférez étudier chaque demande."
              />
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
            </div>
            <div className="mt-4">
              <LabelWithHint
                label="Villes desservies (optionnel)"
                hint="Précisez d’autres villes si votre rayon ne suffit pas à décrire votre zone."
              />
              <Input
                value={data.villesDesservies}
                onChange={(e) => updateData({ villesDesservies: e.target.value })}
                placeholder="Ex. : Paris, Boulogne…"
                className="mt-1.5 border-gs-line"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Ces informations seront utilisées pour la page produit, la boutique et la réservation.
          </p>
          <div>
            <SectionTitleWithHint
              title="Disponibilités générales"
              hint="Quand vous pouvez en général préparer ou remettre le matériel."
            />
            <div className="mt-2 flex flex-wrap gap-2">
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
            <div className="mt-4">
              <LabelWithHint
                label="Horaires de retrait (optionnel)"
                hint="Créneaux habituels pour le retrait sur place, si applicable."
              />
              <Input
                value={data.horairesRetrait}
                onChange={(e) => updateData({ horairesRetrait: e.target.value })}
                placeholder="Ex. : 10h–19h en semaine"
                className="mt-1.5 border-gs-line"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gs-line"
              onClick={() => {
                setSubmitError(null);
                setStep(2);
              }}
            >
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = validationLeavingStep(3, data);
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
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Configurez vos conditions de location</h2>
            <p className="font-landing-body mt-1 text-slate-600">
              Caution, paiements Stripe, mode de réservation et politique d’annulation pour cette annonce.
            </p>
          </div>
          <div className="space-y-4">
            <ListingRulesDepositBlock
              depositAmountEur={data.depositAmountEur}
              onDepositChange={(v) => updateData({ depositAmountEur: v })}
            />
            <ListingRulesPaymentBlock stripeConnectReady={stripeConnectReady} />
            <ListingRulesReservationBlock
              bookingMode={data.bookingMode}
              onBookingMode={(m) => updateData({ bookingMode: m })}
              stripeConnectReady={stripeConnectReady}
            />
            <ListingRulesCancellationBlock
              cancellationPolicy={data.cancellationPolicy as GsListingCancellationPolicy}
              onPolicy={(p) => updateData({ cancellationPolicy: p })}
            />
          </div>
          <div>
            <SectionTitleWithHint
              title="Délai minimum"
              hint="À partir de quand un client peut réserver (anticipation minimale avant le jour J)."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ["same_day", "Même jour"],
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
              <div className="mt-3">
                <LabelWithHint label="Précisez le délai" hint="Ex. : 7 jours, 2 semaines…" />
                <Input
                  className="mt-1.5 border-gs-line"
                  placeholder="Précise…"
                  value={data.leadTimeOther}
                  onChange={(e) => updateData({ leadTimeOther: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gs-line"
              onClick={() => {
                setSubmitError(null);
                setStep(3);
              }}
            >
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = validationLeavingStep(4, data);
                if (e) {
                  setSubmitError(e.message);
                  setStep(e.step);
                  return;
                }
                setSubmitError(null);
                setData((prev) => ({
                  ...prev,
                  storefrontName: prev.storefrontName.trim() || prev.raisonSociale,
                  storefrontLocationDisplay:
                    prev.storefrontLocationDisplay.trim() ||
                    [prev.ville, prev.adresse.trim()].filter(Boolean).join(" · ") ||
                    prev.ville,
                }));
                setStep(5);
              }}
            >
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Personnalisez votre boutique</h2>
            <p className="font-landing-body mt-1 text-slate-600">
              Créez l’espace public qui présentera votre activité et votre matériel.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <LabelWithHint
                label="Nom de la boutique"
                hint="Nom public sur votre page boutique. Photo, logo et bannière : ajoutables après publication."
              />
              <Input
                value={data.storefrontName}
                onChange={(e) => updateData({ storefrontName: e.target.value })}
                className="mt-1.5 border-gs-line bg-white"
                placeholder="Ex. : Sonorisation Pro 75"
              />
            </div>
            <div>
              <LabelWithHint
                label="Description courte"
                hint="Une ou deux phrases : types d’événements, style, ce qui vous distingue."
              />
              <textarea
                className="mt-1.5 min-h-[88px] w-full rounded-md border border-gs-line bg-white p-3 text-sm"
                value={data.storefrontDescription}
                onChange={(e) => updateData({ storefrontDescription: e.target.value })}
                placeholder="Une phrase qui résume votre offre."
              />
            </div>
            <div>
              <LabelWithHint
                label="Localisation affichée"
                hint="Texte libre visible par les clients (ville, région, zone sans adresse précise)."
              />
              <Input
                value={data.storefrontLocationDisplay}
                onChange={(e) => updateData({ storefrontLocationDisplay: e.target.value })}
                className="mt-1.5 border-gs-line bg-white"
                placeholder="Ex. : Paris · Île-de-France"
              />
            </div>
          </div>
          <div>
            <SectionTitleWithHint
              title="Aperçu de votre boutique"
              hint="Rendu simplifié : les visuels et le détail s’enrichiront dans votre espace pro."
            />
            <div className="mt-2 overflow-hidden rounded-xl border border-gs-line bg-white shadow-sm">
              <div className="h-24 bg-gradient-to-br from-gs-orange/25 to-slate-200" />
              <div className="space-y-2 p-4">
                <p className="text-lg font-semibold text-gs-dark">{data.storefrontName.trim() || "Nom de la boutique"}</p>
                <p className="text-sm text-slate-600">{data.storefrontLocationDisplay.trim() || "Ville · zone"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.offeredCategories.slice(0, 4).map((id) => {
                    const lab = OFFER_CATEGORIES.find((c) => c.id === id)?.label ?? id;
                    return (
                      <span key={id} className="rounded-full bg-gs-orange/10 px-2.5 py-0.5 text-xs font-medium text-gs-dark">
                        {lab}
                      </span>
                    );
                  })}
                  {data.additionalServices.slice(0, 3).map((id) => {
                    const lab = ADDITIONAL_SVC.find((c) => c.id === id)?.label ?? id;
                    return (
                      <span key={id} className="rounded-full border border-gs-line bg-gs-beige px-2.5 py-0.5 text-xs text-slate-700">
                        {lab}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">Votre boutique sera visible publiquement sur GetSoundOn.</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gs-line"
              onClick={() => {
                setSubmitError(null);
                setStep(4);
              }}
            >
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              onClick={() => {
                const e = validationLeavingStep(5, data);
                if (e) {
                  setSubmitError(e.message);
                  setStep(e.step);
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
            <h2 className="font-landing-heading text-2xl font-bold text-gs-dark">Ajoutez votre première annonce</h2>
            <p className="font-landing-body mt-1 text-slate-600">
              Commencez par un matériel ou un pack. Vous pourrez en ajouter d’autres ensuite.
            </p>
          </div>
          <div>
            <SectionTitleWithHint
              title="Que souhaitez-vous publier en premier ?"
              hint="Un matériel précis ou un pack clé en main ; d’autres annonces pourront suivre."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={chipClass(data.listingKind === "equipment")}
                onClick={() => updateData({ listingKind: "equipment" })}
              >
                Matériel
              </button>
              <button
                type="button"
                className={chipClass(data.listingKind === "pack")}
                onClick={() => updateData({ listingKind: "pack", gearCategoryField: "pack_premium" })}
              >
                Pack
              </button>
              <button
                type="button"
                disabled
                className={cn(
                  "cursor-not-allowed rounded-full border px-4 py-2 text-sm font-medium opacity-50",
                  "border-gs-line bg-slate-50 text-slate-500"
                )}
                title="Bientôt disponible"
              >
                Prestation (bientôt)
              </button>
            </div>
          </div>

          {data.listingKind === "equipment" ? (
            <div className="space-y-4">
              <EquipmentIdentityFields data={data} updateData={updateData} Label={LabelWithHint} />
              <div>
                <LabelWithHint
                  label="Titre de l’annonce"
                  hint="Proposition automatique selon la fiche matériel ; modifiez librement — nous ne réécraserons plus votre texte."
                />
                <Input
                  value={data.nom}
                  onChange={(e) => updateData({ nom: e.target.value, nomTouched: true })}
                  className="mt-1.5 border-gs-line"
                  placeholder="Ex. : Enceinte active FBT X-Lite 115A"
                />
              </div>
              <div>
                <LabelWithHint
                  label="Description"
                  hint="Texte suggéré tant que vous ne l’avez pas modifié ; complétez avec l’état, les accessoires, etc."
                />
                <textarea
                  className="mt-1.5 min-h-[100px] w-full rounded-md border border-gs-line p-3 text-sm"
                  placeholder="Description courte"
                  value={data.description}
                  onChange={(e) => updateData({ description: e.target.value, descriptionTouched: true })}
                />
              </div>
              <div>
                <LabelWithHint label="Prix par jour" hint="Tarif de location à la journée, en euros." />
                <Input
                  type="number"
                  min={1}
                  value={data.tarifParJour}
                  onChange={(e) => updateData({ tarifParJour: e.target.value })}
                  className="mt-1.5 border-gs-line"
                  placeholder="Ex. : 45"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <LabelWithHint label="Nom du pack" hint="Nom commercial du pack (visible sur la boutique)." />
                <Input
                  value={data.nom}
                  onChange={(e) => updateData({ nom: e.target.value })}
                  className="mt-1.5 border-gs-line"
                  placeholder="Ex. : Pack sono mariage 80 pers."
                />
              </div>
              <div>
                <LabelWithHint label="Usage principal" hint="Type d’événement auquel ce pack est le plus adapté." />
                <select
                  className="mt-1.5 h-11 w-full rounded-md border border-gs-line bg-white px-3 text-sm"
                  value={data.packUsage}
                  onChange={(e) => updateData({ packUsage: e.target.value })}
                >
                  {PACK_USAGE.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <LabelWithHint
                  label="Contenu du pack"
                  hint="Listez les éléments inclus (enceintes, micros, câbles, etc.)."
                />
                <textarea
                  className="mt-1.5 min-h-[100px] w-full rounded-md border border-gs-line p-3 text-sm"
                  placeholder="Ce que le pack contient"
                  value={data.packContents}
                  onChange={(e) => updateData({ packContents: e.target.value })}
                />
              </div>
              <div>
                <LabelWithHint label="Prix par jour" hint="Tarif du pack pour une journée de location." />
                <Input
                  type="number"
                  min={1}
                  value={data.tarifParJour}
                  onChange={(e) => updateData({ tarifParJour: e.target.value })}
                  className="mt-1.5 border-gs-line"
                  placeholder="Ex. : 180"
                />
              </div>
              <div>
                <SectionTitleWithHint
                  title="Options pack"
                  hint="Indiquez si la livraison ou l’installation peuvent être proposées avec ce pack."
                />
                <div className="mt-2 flex flex-wrap gap-2">
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
              <p className="text-xs text-slate-500">
                Les packs sont utiles pour proposer une solution prête à réserver. Vous pourrez enrichir votre boutique plus tard.
              </p>
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
                setSubmitError(null);
                setData((prev) => ({
                  ...prev,
                  photos: [...prev.photos, ...files].slice(0, MAX_PHOTOS),
                }));
              }
            }}
          >
            <Camera className="mx-auto h-10 w-10 text-gs-orange" />
            <div className="mt-2 flex justify-center">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gs-dark">Photos de l’annonce</p>
                <HintIcon
                  hint={`JPG ou PNG — au moins ${MIN_PHOTOS} image, jusqu’à ${MAX_PHOTOS}. Une photo claire suffit pour démarrer.`}
                  topic="Photos de l’annonce"
                />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={handleFileChange} />
            <Button type="button" variant="outline" className="mt-3 border-gs-line" onClick={() => fileInputRef.current?.click()}>
              Choisir des fichiers
            </Button>
            {data.photos.length > 0 && (
              <ul className="mt-4 space-y-1 text-left text-sm text-slate-600">
                {data.photos.map((f, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="text-gs-orange"
                      onClick={() => {
                        setSubmitError(null);
                        setData((p) => ({ ...p, photos: p.photos.filter((_, j) => j !== i) }));
                      }}
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <GsListingRulesRecap
            bookingMode={data.bookingMode}
            depositAmountEur={data.depositAmountEur}
            cancellationPolicy={data.cancellationPolicy as GsListingCancellationPolicy}
            stripeConnectReady={stripeConnectReady}
          />

          <div className="space-y-2">
            <LabelWithHint
              label="CGU et CGV"
              hint="Obligatoire pour publier. Les liens ouvrent le texte officiel dans un nouvel onglet."
            />
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setSubmitError(null);
                  setAcceptedTerms(e.target.checked);
                }}
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
          </div>
          {uploadProgress && (
            <p className="text-sm text-slate-600">
              Envoi photo {uploadProgress.current} / {uploadProgress.total}…
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 border-gs-line"
              disabled={isSubmitting}
              onClick={() => {
                setSubmitError(null);
                setStep(5);
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Retour
            </Button>
            <Button
              className="flex-1 bg-gs-orange font-landing-btn text-white hover:brightness-105"
              disabled={isSubmitting || !acceptedTerms}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Publication…" : "Publier ma boutique"}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm text-slate-600 hover:text-gs-dark"
            disabled={isSubmitting}
            onClick={() => {
              clearDraft();
              onClose?.();
              router.push("/proprietaire");
            }}
          >
            Je terminerai plus tard
          </Button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="text-gs-dark [font-family:var(--font-landing-inter),ui-sans-serif,sans-serif]">
        <div className="rounded-xl border border-gs-line bg-white p-5 shadow-sm sm:p-7">{wizardBody}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gs-beige text-gs-dark [font-family:var(--font-landing-inter),ui-sans-serif,sans-serif]">
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-gs-line bg-white p-6 shadow-sm">{wizardBody}</div>
      </main>
    </div>
  );
}
