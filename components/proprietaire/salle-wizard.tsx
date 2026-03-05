"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo, type RefObject } from "react";
import { addMonths, subMonths, startOfDay, addDays } from "date-fns";
import { createSalleFromOnboarding } from "@/app/actions/create-salle";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import {
  Accessibility,
  Armchair,
  Bell,
  Briefcase,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Eye,
  Flame,
  LayoutGrid,
  Lightbulb,
  Moon,
  Mountain,
  Music,
  ParkingCircle,
  Shield,
  Snowflake,
  Sun,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { AdresseAutocomplete } from "@/components/search/adresse-autocomplete";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 6;
const ONBOARDING_DRAFT_KEY = "owner_salle_onboarding_draft_v1";

const FEATURES = [
  { id: "erp", label: "ERP conforme", icon: Shield },
  { id: "pmr", label: "Accès PMR", icon: Accessibility },
  { id: "scene", label: "Scène / estrade", icon: LayoutGrid },
  { id: "climatisation", label: "Climatisation", icon: Snowflake },
  { id: "chauffage", label: "Chauffage", icon: Flame },
  { id: "parking", label: "Parking disponible", icon: ParkingCircle },
  { id: "mobilier", label: "Chaises / mobilier inclus", icon: Armchair },
  { id: "bureau", label: "Bureau", icon: Briefcase },
  { id: "son", label: "Système son", icon: Volume2 },
  { id: "lumiere", label: "Lumière naturelle", icon: Sun },
] as const;

const SOUND_RESTRICTIONS = [
  { id: "none", label: "Aucune restriction", icon: Volume2 },
  { id: "modere", label: "Volume modéré", icon: Volume2 },
  { id: "no_music", label: "Musique interdite", icon: VolumeX },
  { id: "horaires", label: "Horaires stricts", icon: Clock },
] as const;

const ACCEPTED_EVENTS = [
  { id: "culte", label: "Culte régulier", icon: LayoutGrid },
  { id: "bapteme", label: "Baptême", icon: Droplets },
  { id: "conference", label: "Conférence", icon: Users },
  { id: "concert", label: "Concert", icon: Music },
  { id: "retraite", label: "Retraite", icon: Mountain },
  { id: "veillee_priere", label: "Veillée de prière", icon: Moon },
] as const;

const INCLUSIONS = [
  { id: "location", label: "Location de la salle" },
  { id: "mobilier", label: "Mobilier et équipements" },
  { id: "sono", label: "Système de sonorisation" },
] as const;

type HorairesJour = { debut: string; fin: string };

type WizardData = {
  nom: string;
  ville: string;
  villeCode?: string | null;
  capacite: string;
  adresse: string;
  lat?: number;
  lng?: number;
  postalCode?: string;
  description: string;
  tarifParJour: string;
  tarifMensuel: string;
  tarifHoraire: string;
  cautionRequise: boolean;
  inclusions: string[];
  placesParking: string;
  features: string[];
  horairesParJour: Record<string, HorairesJour>;
  joursOuverture: string[];
  joursVisite: string[];
  visiteDates: string[];
  visiteHorairesParDate: Record<string, HorairesJour>;
  restrictionSonore: string;
  evenementsAcceptes: string[];
  photos: File[];
};

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

const DEFAULT_HORAIRES: HorairesJour = { debut: "08:00", fin: "22:00" };

const initialData: WizardData = {
  nom: "",
  ville: "",
  capacite: "",
  adresse: "",
  description: "",
  tarifParJour: "",
  tarifMensuel: "",
  tarifHoraire: "",
  cautionRequise: false,
  inclusions: ["location"],
  placesParking: "",
  features: [],
  horairesParJour: {},
  joursOuverture: [],
  joursVisite: [],
  visiteDates: [],
  visiteHorairesParDate: {},
  restrictionSonore: "",
  evenementsAcceptes: [],
  photos: [],
};

function parsePositiveNumber(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function formatSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/\s+/g, " ");
  const withCap = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return /[.!?]$/.test(withCap) ? withCap : `${withCap}.`;
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinNatural(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function buildTarifPhrase(data: WizardData): string {
  const tarifs = [
    data.tarifParJour.trim() ? `${data.tarifParJour.trim()} € / jour` : null,
    data.tarifHoraire.trim() ? `${data.tarifHoraire.trim()} € / heure` : null,
    data.tarifMensuel.trim() ? `${data.tarifMensuel.trim()} € / mois` : null,
  ].filter(Boolean) as string[];
  return tarifs.length ? `Tarifs indicatifs : ${tarifs.join(" · ")}.` : "";
}

function buildFeaturePhrase(data: WizardData): string {
  const labels = FEATURES.filter((f) => data.features.includes(f.id))
    .slice(0, 4)
    .map((f) => f.label.toLowerCase());
  if (!labels.length) return "";
  return `Le lieu propose ${joinNatural(labels)}.`;
}

function buildEventPhrase(data: WizardData): string {
  const labels = ACCEPTED_EVENTS.filter((e) => data.evenementsAcceptes.includes(e.id))
    .slice(0, 3)
    .map((e) => e.label.toLowerCase());
  if (!labels.length) return "";
  return `Il convient notamment pour ${joinNatural(labels)}.`;
}

function buildPracticalPhrase(data: WizardData): string {
  const parts: string[] = [];
  if (data.cautionRequise) parts.push("caution demandée");
  const restriction = SOUND_RESTRICTIONS.find((s) => s.id === data.restrictionSonore)?.label;
  if (restriction && restriction !== "Aucune restriction") {
    parts.push(`restriction sonore : ${restriction.toLowerCase()}`);
  }
  if (!parts.length) return "";
  return `Informations pratiques : ${parts.join(" · ")}.`;
}

function buildShortTarifPhrase(data: WizardData): string {
  const tarifs = [
    data.tarifParJour.trim() ? `${data.tarifParJour.trim()} €/jour` : null,
    data.tarifHoraire.trim() ? `${data.tarifHoraire.trim()} €/heure` : null,
    data.tarifMensuel.trim() ? `${data.tarifMensuel.trim()} €/mois` : null,
  ].filter(Boolean) as string[];
  return tarifs.length ? `Tarifs : ${tarifs.join(" · ")}.` : "";
}

function generateDescriptionFromData(data: WizardData): string {
  const nom = data.nom.trim() || "Cette salle";
  const ville = data.ville.trim();
  const capacite = parsePositiveNumber(data.capacite);
  const intro = capacite
    ? `${ville ? `${nom} à ${ville}` : nom} accueille jusqu'à ${capacite} personnes dans un cadre soigné et chaleureux.`
    : `${ville ? `${nom} à ${ville}` : nom} propose un cadre soigné et chaleureux pour vos événements.`;
  const feature = buildFeaturePhrase(data) || "Le lieu offre un espace modulable, adapté aux besoins des organisateurs.";
  const events = buildEventPhrase(data);
  const practical = buildPracticalPhrase(data);
  const tarif = buildTarifPhrase(data);
  return [intro, feature, events, practical, tarif].filter(Boolean).join(" ");
}

function improveDescription(value: string, data: WizardData): string {
  const user = splitSentences(value).map(formatSentence).filter(Boolean);
  const nom = data.nom.trim() || "Ce lieu";
  const ville = data.ville.trim();
  const capacite = parsePositiveNumber(data.capacite);
  const accroche = capacite
    ? `${ville ? `${nom} à ${ville}` : nom} est une salle accueillante pouvant recevoir jusqu'à ${capacite} personnes.`
    : `${ville ? `${nom} à ${ville}` : nom} est une salle accueillante pour vos événements.`;
  const pointsForts = buildFeaturePhrase(data);
  const usages = buildEventPhrase(data);
  const pratique = buildPracticalPhrase(data);
  const tarifs = buildTarifPhrase(data);

  // Garde les meilleures phrases utilisateur puis enrichit avec une structure claire.
  const userCore = user.slice(0, 2);
  const merged = [accroche, ...userCore, pointsForts, usages, pratique, tarifs]
    .map(formatSentence)
    .filter(Boolean)
    .filter((sentence, idx, arr) => arr.findIndex((s) => s.toLowerCase() === sentence.toLowerCase()) === idx);

  return merged.join(" ");
}

function shortenDescription(value: string, data: WizardData): string {
  const nom = data.nom.trim() || "Cette salle";
  const ville = data.ville.trim();
  const capacite = parsePositiveNumber(data.capacite);
  const intro = capacite
    ? `${ville ? `${nom} à ${ville}` : nom}, jusqu'à ${capacite} personnes.`
    : `${ville ? `${nom} à ${ville}` : nom}, salle disponible pour vos événements.`;

  const base = value.trim()
    ? splitSentences(value).map(formatSentence).filter(Boolean)[0] ?? ""
    : "";
  const shortTarifs = buildShortTarifPhrase(data);
  return [base || intro, shortTarifs].filter(Boolean).join(" ");
}

function isValidTimeRange(debut?: string, fin?: string): boolean {
  if (!debut || !fin) return false;
  return debut < fin;
}

function getWizardValidationError(data: WizardData, minPhotos: number): { step: number; message: string } | null {
  if (!data.nom.trim() || !data.ville.trim() || !data.adresse.trim() || !data.description.trim()) {
    return { step: 1, message: "Complétez les informations essentielles (nom, ville, adresse et description)." };
  }
  if (!parsePositiveNumber(data.capacite)) {
    return { step: 1, message: "La capacité d'accueil doit être un nombre supérieur à 0." };
  }
  const hasTarif =
    !!parsePositiveNumber(data.tarifParJour) ||
    !!parsePositiveNumber(data.tarifMensuel) ||
    !!parsePositiveNumber(data.tarifHoraire);
  if (!hasTarif) {
    return { step: 1, message: "Renseignez au moins un tarif valide (jour, heure ou mois)." };
  }

  if (!data.features.length) {
    return { step: 2, message: "Sélectionnez au moins une caractéristique pour votre salle." };
  }
  if (data.features.includes("parking") && !parsePositiveNumber(data.placesParking)) {
    return { step: 2, message: "Indiquez un nombre de places de parking supérieur à 0." };
  }

  if (!data.joursOuverture.length) {
    return { step: 3, message: "Choisissez au moins un jour de location." };
  }
  for (const jour of data.joursOuverture) {
    const h = data.horairesParJour[jour];
    if (!h || !isValidTimeRange(h.debut, h.fin)) {
      return { step: 3, message: `Vérifiez les horaires de location pour ${jour} (heure de début < heure de fin).` };
    }
  }
  if (!data.restrictionSonore) {
    return { step: 3, message: "Sélectionnez une option de restriction sonore." };
  }
  if (!data.evenementsAcceptes.length) {
    return { step: 3, message: "Sélectionnez au moins un type d'événement accepté." };
  }

  if (!data.visiteDates.length) {
    return { step: 4, message: "Ajoutez au moins une date de visite." };
  }
  for (const date of data.visiteDates) {
    const h = data.visiteHorairesParDate[date];
    if (!h || !isValidTimeRange(h.debut, h.fin)) {
      return { step: 4, message: "Vérifiez les créneaux de visite (heure de début < heure de fin)." };
    }
  }

  if (data.photos.length < minPhotos) {
    return { step: 5, message: `Ajoutez au moins ${minPhotos} photos avant de soumettre votre annonce.` };
  }

  return null;
}

export type SalleWizardProps = {
  embedded?: boolean;
  onSuccess?: (slug: string | null, status: "approved" | "pending") => void;
  onClose?: () => void;
};

export function SalleWizard({ embedded, onSuccess, onClose }: SalleWizardProps = {}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdStatus, setCreatedStatus] = useState<"approved" | "pending">("pending");
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Index 1-based de la photo en échec (pour afficher "Réessayer" ciblé). */
  const [lastErrorPhotoIndex, setLastErrorPhotoIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Progression upload photos : { current: 1..total, total } */
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitErrorRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedDraftRef = useRef(false);

  const MIN_PHOTOS = 5;
  const MAX_PHOTOS = 10;
  /** 10 photos max × 50 Mo max par fichier (bucket salle-photos) = 500 Mo total pour ne jamais bloquer en prod */
  const TOTAL_PHOTOS_SIZE_LIMIT_MB = 500;
  const TOTAL_PHOTOS_SIZE_LIMIT = TOTAL_PHOTOS_SIZE_LIMIT_MB * 1024 * 1024;

  const progress = (step / TOTAL_STEPS) * 100;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          step?: number;
          data?: Partial<WizardData>;
        };
        if (parsed.data) {
          setData({
            ...initialData,
            ...parsed.data,
            photos: [],
          });
        }
        if (parsed.step && parsed.step >= 1 && parsed.step <= TOTAL_STEPS) {
          setStep(parsed.step);
        }
        setDraftRestored(true);
      }
    } catch {
      // Ignore invalid draft
    } finally {
      hasLoadedDraftRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraftRef.current) return;
    try {
      const { photos: _photos, ...serializableData } = data;
      localStorage.setItem(
        ONBOARDING_DRAFT_KEY,
        JSON.stringify({
          step,
          data: serializableData,
        })
      );
      setLastSavedAt(new Date());
    } catch {
      // Ignore localStorage write failures
    }
  }, [step, data]);

  useEffect(() => {
    if (!submitError) return;
    submitErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitError]);

  useEffect(() => {
    const hasProgress = JSON.stringify({
      ...data,
      photos: [],
    }) !== JSON.stringify({
      ...initialData,
      photos: [],
    });
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasProgress || submitted) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [data, submitted]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    setDraftRestored(false);
    setLastSavedAt(null);
  }, []);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleFeature = (id: string) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter((f) => f !== id)
        : [...prev.features, id],
    }));
  };

  const toggleInclusion = (id: string) => {
    setData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.includes(id)
        ? prev.inclusions.filter((i) => i !== id)
        : [...prev.inclusions, id],
    }));
  };

  const toggleJour = (jour: string) => {
    setData((prev) => {
      const isSelected = prev.joursOuverture.includes(jour);
      const newJours = isSelected
        ? prev.joursOuverture.filter((j) => j !== jour)
        : [...prev.joursOuverture, jour];
      const newHoraires = { ...prev.horairesParJour };
      if (isSelected) {
        delete newHoraires[jour];
      } else {
        newHoraires[jour] = { ...DEFAULT_HORAIRES };
      }
      const newJoursVisite = isSelected
        ? prev.joursVisite.filter((j) => j !== jour)
        : prev.joursVisite;
      return { ...prev, joursOuverture: newJours, joursVisite: newJoursVisite, horairesParJour: newHoraires };
    });
  };

  const toggleJourVisite = (jour: string) => {
    setData((prev) => {
      const isSelected = prev.joursVisite.includes(jour);
      const newJours = isSelected
        ? prev.joursVisite.filter((j) => j !== jour)
        : [...prev.joursVisite, jour];
      return { ...prev, joursVisite: newJours };
    });
  };

  const toggleEvent = (id: string) => {
    setData((prev) => ({
      ...prev,
      evenementsAcceptes: prev.evenementsAcceptes.includes(id)
        ? prev.evenementsAcceptes.filter((e) => e !== id)
        : [...prev.evenementsAcceptes, id],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    if (files.length) {
      setData((prev) => {
        const combined = [...prev.photos, ...files];
        return { ...prev, photos: combined.slice(0, MAX_PHOTOS) };
      });
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    if (files.length) {
      setData((prev) => {
        const combined = [...prev.photos, ...files];
        return { ...prev, photos: combined.slice(0, MAX_PHOTOS) };
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleSubmit = async () => {
    setSubmitError(null);
    setLastErrorPhotoIndex(null);
    setUploadProgress(null);
    const validationError = getWizardValidationError(data, MIN_PHOTOS);
    if (validationError) {
      setStep(validationError.step);
      setSubmitError(validationError.message);
      return;
    }
    const totalPhotosSize = data.photos.reduce((s, f) => s + f.size, 0);
    if (totalPhotosSize > TOTAL_PHOTOS_SIZE_LIMIT) {
      setSubmitError(`Photos trop lourdes (max ${TOTAL_PHOTOS_SIZE_LIMIT_MB} Mo au total). Réduisez la taille ou le nombre de photos.`);
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("nom", data.nom);
    formData.set("ville", data.ville);
    formData.set("capacite", data.capacite);
    formData.set("adresse", data.adresse);
    if (data.postalCode) formData.set("postalCode", data.postalCode);
    if (data.lat != null) formData.set("lat", String(data.lat));
    if (data.lng != null) formData.set("lng", String(data.lng));
    formData.set("description", data.description);
    formData.set("tarifParJour", data.tarifParJour);
    formData.set("tarifMensuel", data.tarifMensuel);
    formData.set("tarifHoraire", data.tarifHoraire);
    formData.set("cautionRequise", data.cautionRequise ? "1" : "0");
    formData.set("inclusions", JSON.stringify(data.inclusions));
    formData.set("placesParking", data.placesParking);
    formData.set("features", JSON.stringify(data.features));
    formData.set("horairesParJour", JSON.stringify(data.horairesParJour));
    formData.set("joursOuverture", JSON.stringify(data.joursOuverture));
    formData.set("joursVisite", JSON.stringify(data.joursVisite));
    formData.set("visiteDates", JSON.stringify(data.visiteDates));
    formData.set("visiteHorairesParDate", JSON.stringify(data.visiteHorairesParDate));
    formData.set("restrictionSonore", data.restrictionSonore);
    formData.set("evenementsAcceptes", JSON.stringify(data.evenementsAcceptes));

    const supabaseClient = createClient();
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setSubmitError("Session expirée, reconnectez-vous.");
      setIsSubmitting(false);
      return;
    }

    const BUCKET_PHOTOS = "salle-photos";
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo (aligné sur le bucket salle-photos)
    const ALLOWED_TYPES = ["image/jpeg", "image/png"];
    const validPhotos = data.photos.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
    );
    if (validPhotos.length !== data.photos.length) {
      setSubmitError("Certains fichiers sont invalides (JPG/PNG, max 50 Mo par fichier).");
      setIsSubmitting(false);
      return;
    }

    const uploadTimestamp = Date.now();
    const imageUrls: string[] = [];
    const totalToUpload = validPhotos.length;

    for (let i = 0; i < validPhotos.length; i++) {
      setUploadProgress({ current: i + 1, total: totalToUpload });
      const file = validPhotos[i];
      let blob: Blob;
      try {
        blob = await compressImage(file, { maxSizePx: 1600, quality: 0.75 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur de compression.";
        setSubmitError(`Photo ${i + 1} : ${msg}`);
        setLastErrorPhotoIndex(i + 1);
        setUploadProgress(null);
        setIsSubmitting(false);
        return;
      }
      const path = `${user.id}/${uploadTimestamp}-${i}.jpg`;
      const { error } = await supabaseClient.storage.from(BUCKET_PHOTOS).upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) {
        setSubmitError(`Photo ${i + 1} : upload échoué. ${error.message} Réessayez ou changez de fichier.`);
        setLastErrorPhotoIndex(i + 1);
        setUploadProgress(null);
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabaseClient.storage.from(BUCKET_PHOTOS).getPublicUrl(path);
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
        const err = result as { error: string; photoIndex?: number };
        setSubmitError(err.error ?? "Impossible de soumettre votre annonce pour le moment.");
        if (err.photoIndex != null) setLastErrorPhotoIndex(err.photoIndex);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setUploadProgress(null);
      const is413 =
        /413|payload\s*too\s*large|PAYLOAD_TOO_LARGE|function_payload/i.test(err.message) ||
        (err as { status?: number }).status === 413;
      setSubmitError(
        is413
          ? "Photos trop lourdes, compressez ou réessayez."
          : err.message?.includes("fetch") || err.message?.includes("network")
            ? "Une erreur réseau est survenue. Vérifiez votre connexion et réessayez."
            : `Erreur : ${err.message || "Une erreur inattendue s'est produite."}`
      );
    }
    setIsSubmitting(false);
  };

  if (submitted && embedded) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        {createdStatus === "approved" ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="mt-4 text-lg font-semibold text-black">Annonce publiée !</p>
            <p className="mt-2 text-sm text-slate-600">Votre annonce est en ligne et visible par les locataires.</p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="mt-4 text-lg font-semibold text-black">Annonce en cours de validation</p>
            <p className="mt-2 text-sm text-slate-600">Délai moyen : 24 à 48 heures.</p>
          </>
        )}
        <div className="mt-6 flex w-full flex-col gap-2">
          <Button onClick={onClose} className="w-full bg-[#213398] hover:bg-[#1a2980]">
            Fermer
          </Button>
          <Link
            href={createdSlug ? `/salles/${createdSlug}` : "/proprietaire/annonces"}
            className="flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Voir mon annonce
          </Link>
        </div>
      </div>
    );
  }

  if (submitted && !embedded) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-slate-200 bg-white">
          <div className="container flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="text-lg font-semibold text-[#303B4A]">
              {siteConfig.name}
            </Link>
          </div>
        </header>
        <main className="container mx-auto max-w-2xl px-4 py-12">
          <div className="flex flex-col items-center text-center">
            {createdStatus === "approved" ? (
              <>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-12 w-12 text-emerald-600" />
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800">
                  Publiée
                </span>
                <h1 className="mt-6 text-3xl font-bold text-black">
                  Annonce publiée !
                </h1>
                <p className="mt-4 max-w-md text-slate-600">
                  Votre annonce est en ligne et visible par les locataires. Vous pouvez la modifier depuis votre tableau de bord.
                </p>
              </>
            ) : (
              <>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
                  <Clock className="h-12 w-12 text-amber-600" />
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  Validation en cours
                </span>
                <h1 className="mt-6 text-3xl font-bold text-black">
                  Annonce en cours de validation
                </h1>
                <p className="mt-4 max-w-md text-slate-600">
                  Merci pour votre soumission. Notre équipe vérifie actuellement les informations et les photos de votre salle.
                </p>
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Délai moyen de validation : 24 à 48 heures
                </div>
                <div className="mt-6 flex w-full flex-col gap-3 rounded-xl border border-[#213398]/20 bg-[#213398]/5 p-5 text-left">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#213398]/10">
                      <Bell className="h-5 w-5 text-black" />
                    </div>
                    <p className="text-sm leading-relaxed text-black">
                      Vous serez notifié dès que votre annonce sera validée.
                    </p>
                  </div>
                </div>
              </>
            )}
            <div className="mt-8 flex w-full flex-col gap-3">
              <Link
                href="/proprietaire"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white transition-colors hover:bg-[#1a2980]"
              >
                Accéder à mon tableau de bord
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                href={createdSlug ? `/salles/${createdSlug}` : "/proprietaire/annonces"}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye className="h-5 w-5" />
                Voir mon annonce
              </Link>
            </div>
            {createdStatus === "pending" && (
            <h2 className="mt-14 w-full text-left text-lg font-semibold text-black">
              Pendant la validation
            </h2>
            )}
            {createdStatus === "pending" && (
            <div className="mt-6 grid w-full gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Shield className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-black">Vérification</p>
                <p className="mt-1 text-xs text-slate-500">Contrôle des informations</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Camera className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-black">Photos</p>
                <p className="mt-1 text-xs text-slate-500">Validation des visuels</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <CheckCircle className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-black">Conformité</p>
                <p className="mt-1 text-xs text-slate-500">Respect des standards</p>
              </div>
            </div>
            )}
            {createdStatus === "pending" && (
            <div className="mt-10 flex w-full gap-3 rounded-lg bg-slate-50 p-5 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                <span className="text-sm font-semibold text-slate-600">i</span>
              </div>
              <div>
                <p className="text-sm font-medium text-black">Pourquoi cette étape ?</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  La validation manuelle garantit la qualité et la fiabilité des annonces sur notre
                  plateforme. Cette démarche protège à la fois les propriétaires et les
                  locataires d&apos;événements.
                </p>
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const wizardContent = (
    <>
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-600">
            Étape {step} sur {TOTAL_STEPS}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-[#5b4dbf] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-600">{Math.round(progress)}%</span>
          </div>
          {(draftRestored || lastSavedAt) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p aria-live="polite">
                {draftRestored
                  ? "Brouillon restauré automatiquement."
                  : `Brouillon sauvegardé à ${lastSavedAt?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
              <button
                type="button"
                onClick={clearDraft}
                className="text-[#213398] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#213398]/40"
              >
                Réinitialiser le brouillon
              </button>
            </div>
          )}
        </div>

        {step === 1 && (
          <Step1 data={data} updateData={updateData} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2
            data={data}
            updateData={updateData}
            toggleFeature={toggleFeature}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3
            data={data}
            updateData={updateData}
            toggleEvent={toggleEvent}
            toggleInclusion={toggleInclusion}
            toggleJour={toggleJour}
            updateHorairesPourJour={(jour, debut, fin) =>
              setData((prev) => ({
                ...prev,
                horairesParJour: {
                  ...prev.horairesParJour,
                  [jour]: { debut, fin },
                },
              }))
            }
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4JoursVisite
            data={data}
            updateData={updateData}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <Step5
            data={data}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onRemovePhoto={handleRemovePhoto}
            fileInputRef={fileInputRef}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
            minPhotos={MIN_PHOTOS}
            maxPhotos={MAX_PHOTOS}
          />
        )}
        {step === 6 && (
          <Step6
            data={data}
            onSubmit={handleSubmit}
            onBack={() => setStep(5)}
            isSubmitting={isSubmitting}
            uploadProgress={uploadProgress}
            submitError={submitError}
            submitErrorRef={submitErrorRef}
            minPhotos={MIN_PHOTOS}
            lastErrorPhotoIndex={lastErrorPhotoIndex}
          />
        )}
    </>
  );

  if (embedded) {
    return <div className="pb-4">{wizardContent}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold text-black">
            {siteConfig.name}
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Temps estimé : 2 minutes
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {wizardContent}
      </main>
    </div>
  );
}

function Step1({
  data,
  updateData,
  onNext,
}: {
  data: WizardData;
  updateData: (u: Partial<WizardData>) => void;
  onNext: () => void;
}) {
  const [showDescriptionAssist, setShowDescriptionAssist] = useState(false);
  const [descriptionAssistInfo, setDescriptionAssistInfo] = useState<string | null>(null);
  const [assistVariantIndex, setAssistVariantIndex] = useState(0);

  const hasAtLeastOneTarif =
    (data.tarifParJour.trim() !== "" && Number(data.tarifParJour) > 0) ||
    (data.tarifMensuel.trim() !== "" && Number(data.tarifMensuel) > 0) ||
    (data.tarifHoraire.trim() !== "" && Number(data.tarifHoraire) > 0);
  const isComplete =
    data.nom.trim() !== "" &&
    data.ville.trim() !== "" &&
    data.capacite.trim() !== "" &&
    data.adresse.trim() !== "" &&
    data.description.trim() !== "" &&
    hasAtLeastOneTarif;
  const capacityValid = parsePositiveNumber(data.capacite) != null;
  const stepHint = !data.nom.trim() || !data.ville.trim() || !data.adresse.trim()
    ? "Renseignez le nom, la ville et l'adresse."
    : !capacityValid
      ? "La capacité doit être un nombre supérieur à 0."
      : !hasAtLeastOneTarif
        ? "Ajoutez au moins un tarif valide."
        : !data.description.trim()
          ? "Ajoutez une description de la salle."
          : null;

  const handleDescriptionAssist = () => {
    const variants = [
      {
        text: generateDescriptionFromData(data),
        info: "Version générée automatiquement.",
      },
      {
        text: improveDescription(data.description, data),
        info: "Version reformulée en style plus professionnel.",
      },
      {
        text: shortenDescription(data.description, data),
        info: "Version raccourcie pour aller à l'essentiel.",
      },
    ];

    const current = data.description.trim().toLowerCase();
    const ordered = [
      variants[assistVariantIndex % variants.length],
      variants[(assistVariantIndex + 1) % variants.length],
      variants[(assistVariantIndex + 2) % variants.length],
    ];
    const selected = ordered.find((v) => v.text.trim().toLowerCase() !== current) ?? ordered[0];

    if (!selected.text.trim()) {
      setDescriptionAssistInfo("Impossible de générer une proposition pour le moment.");
      return;
    }

    const doneAt = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setDescriptionAssistInfo(`${selected.info} (${doneAt})`);
    updateData({ description: selected.text });
    setAssistVariantIndex((v) => v + 1);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-black">Parlez-nous de votre salle</h2>
      <p className="mt-2 text-slate-600">Commencez par les informations essentielles de votre lieu</p>
      <div className="mt-8 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Nom du lieu</label>
          <Input
            placeholder="Ex: Salle Saint-Paul"
            value={data.nom}
            onChange={(e) => updateData({ nom: e.target.value })}
            className="h-11 border-slate-200"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Ville</label>
            <VilleAutocomplete
              value={data.ville}
              onChange={(v) => updateData({ ville: v, ...(v ? {} : { villeCode: undefined }) })}
              onCitySelect={(_, code) => updateData({ villeCode: code ?? undefined })}
              placeholder="Ex: Paris, Versailles..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Capacité d&apos;accueil</label>
            <Input
              placeholder="Ex: 150"
              value={data.capacite}
              onChange={(e) => updateData({ capacite: e.target.value })}
              className="h-11 border-slate-200"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Adresse</label>
          <AdresseAutocomplete
            value={data.adresse}
            citycode={data.villeCode ?? undefined}
            onChange={(v) => updateData({ adresse: v })}
            onSelectAddress={(addr, city, postcode, coords) => {
              updateData({
                adresse: addr,
                ...(city && { ville: city }),
                ...(postcode && { postalCode: postcode }),
                ...(coords && { lat: coords.lat, lng: coords.lng }),
              });
            }}
            placeholder="Ex: 12 rue de la République, Paris"
          />
          <p className="text-xs text-slate-500">Recherche limitée à l&apos;Île-de-France</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            placeholder="Décrivez votre salle : cadre, atouts, équipements, ambiance..."
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5b4dbf]"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Une description claire améliore vos chances d&apos;être contacté.</p>
            <button
              type="button"
              onClick={() => setShowDescriptionAssist((v) => !v)}
              className="text-xs font-medium text-[#213398] underline-offset-2 hover:underline"
            >
              {showDescriptionAssist ? "Masquer l'aide" : "M'aider à rédiger"}
            </button>
          </div>
          {showDescriptionAssist && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-600">Assistant de rédaction</p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-slate-300 bg-white px-3 text-xs"
                  onClick={handleDescriptionAssist}
                >
                  Améliorer ma description
                </Button>
              </div>
              {descriptionAssistInfo && (
                <p className="mt-2 text-xs text-slate-600">{descriptionAssistInfo}</p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Tarifs indicatifs</label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs text-slate-600">€ / jour</p>
              <Input
                type="number"
                placeholder="Ex: 800"
                value={data.tarifParJour}
                onChange={(e) => updateData({ tarifParJour: e.target.value })}
                min={0}
                className="h-11 border-slate-200"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-slate-600">€ / mois</p>
              <Input
                type="number"
                placeholder="Ex: 1500"
                value={data.tarifMensuel}
                onChange={(e) => updateData({ tarifMensuel: e.target.value })}
                min={0}
                className="h-11 border-slate-200"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-slate-600">€ / heure</p>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={data.tarifHoraire}
                onChange={(e) => updateData({ tarifHoraire: e.target.value })}
                min={0}
                className="h-11 border-slate-200"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">Vous pouvez choisir les 3 ou un des 3</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Une caution est-elle demandée ?</p>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="cautionRequise"
                checked={data.cautionRequise === true}
                onChange={() => updateData({ cautionRequise: true })}
                className="h-4 w-4 border-slate-300 text-[#213398] focus:ring-[#213398]"
              />
              <span className="text-sm text-slate-700">Oui</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="cautionRequise"
                checked={data.cautionRequise === false}
                onChange={() => updateData({ cautionRequise: false })}
                className="h-4 w-4 border-slate-300 text-[#213398] focus:ring-[#213398]"
              />
              <span className="text-sm text-slate-700">Non</span>
            </label>
          </div>
        </div>
      </div>
      <Button
        onClick={onNext}
        disabled={!isComplete}
        className="mt-8 h-11 w-full bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
      >
        Continuer
      </Button>
      {stepHint && <p className="mt-2 text-sm text-amber-700">{stepHint}</p>}
    </>
  );
}

function Step2({
  data,
  updateData,
  toggleFeature,
  onNext,
  onBack,
}: {
  data: WizardData;
  updateData: (u: Partial<WizardData>) => void;
  toggleFeature: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue =
    data.features.length >= 1 &&
    (!data.features.includes("parking") || !!parsePositiveNumber(data.placesParking));
  const stepHint =
    data.features.length < 1
      ? "Sélectionnez au moins une caractéristique."
      : data.features.includes("parking") && !parsePositiveNumber(data.placesParking)
        ? "Indiquez un nombre de places de parking supérieur à 0."
        : null;
  return (
    <>
      <h2 className="text-2xl font-bold text-black">Caractéristiques principales</h2>
      <p className="mt-2 text-slate-600">Sélectionnez les éléments correspondant à votre salle</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => toggleFeature(id)}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40",
              data.features.includes(id)
                ? "border-[#5b4dbf] bg-[#5b4dbf]/5"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <Icon className="h-5 w-5 shrink-0 text-slate-500" />
            <span className="flex-1 text-sm font-medium text-black">{label}</span>
            <input
              type="checkbox"
              checked={data.features.includes(id)}
              onChange={() => {}}
              className="h-4 w-4 rounded border-slate-300 text-[#5b4dbf] focus:ring-[#5b4dbf]"
            />
          </button>
        ))}
      </div>
      {data.features.includes("parking") && (
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-slate-700">Nombre de places de parking</label>
          <Input
            type="number"
            placeholder="Ex: 30"
            value={data.placesParking}
            onChange={(e) => updateData({ placesParking: e.target.value })}
            min={0}
            className="h-11 w-40 border-slate-200"
          />
        </div>
      )}
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#5b4dbf]/10 p-3 text-sm text-[#5b4dbf]">
        <span className="text-base">i</span>
        Ces informations aident les organisateurs à mieux comprendre votre lieu
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="h-11 flex-1 border-slate-300">
          Retour
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          Continuer
        </Button>
      </div>
      {stepHint && <p className="mt-2 text-sm text-amber-700">{stepHint}</p>}
    </>
  );
}

function Step3({
  data,
  updateData,
  toggleEvent,
  toggleInclusion,
  toggleJour,
  updateHorairesPourJour,
  onNext,
  onBack,
}: {
  data: WizardData;
  updateData: (u: Partial<WizardData>) => void;
  toggleEvent: (id: string) => void;
  toggleInclusion: (id: string) => void;
  toggleJour: (jour: string) => void;
  updateHorairesPourJour: (jour: string, debut: string, fin: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue =
    data.joursOuverture.length >= 1 &&
    data.restrictionSonore !== "" &&
    data.evenementsAcceptes.length >= 1;
  const stepHint =
    data.joursOuverture.length < 1
      ? "Sélectionnez au moins un jour de location."
      : data.restrictionSonore === ""
        ? "Choisissez une option de restriction sonore."
        : data.evenementsAcceptes.length < 1
          ? "Sélectionnez au moins un événement accepté."
          : null;
  return (
    <>
      <h2 className="text-2xl font-bold text-black">Conditions d&apos;accueil</h2>
      <p className="mt-2 text-slate-600">Précisez les règles et contraintes de votre salle</p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="text-sm font-medium text-slate-700">Jours de location</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {JOURS.map((jour) => (
              <button
                key={jour}
                type="button"
                onClick={() => toggleJour(jour)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40",
                  data.joursOuverture.includes(jour)
                    ? "border-[#5b4dbf] bg-[#5b4dbf]/10 text-[#5b4dbf]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {jour}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Sélectionnez les jours de location possibles</p>
        </div>

        {data.joursOuverture.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700">Horaires par jour de location</label>
            <p className="mt-1 text-xs text-slate-500">
              Indiquez les plages horaires pour chaque jour de location
            </p>
            <div className="mt-3 space-y-4">
              {data.joursOuverture.map((jour) => {
                const h = data.horairesParJour[jour] ?? DEFAULT_HORAIRES;
                return (
                  <div
                    key={jour}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <span className="w-24 text-sm font-medium capitalize text-slate-700">{jour}</span>
                    <Input
                      type="time"
                      value={h.debut}
                      onChange={(e) => updateHorairesPourJour(jour, e.target.value, h.fin)}
                      className="h-10 w-32 border-slate-200"
                    />
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    <Input
                      type="time"
                      value={h.fin}
                      onChange={(e) => updateHorairesPourJour(jour, h.debut, e.target.value)}
                      className="h-10 w-32 border-slate-200"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700">Restrictions sonores</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SOUND_RESTRICTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => updateData({ restrictionSonore: id })}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40",
                  data.restrictionSonore === id
                    ? "border-[#5b4dbf] bg-[#5b4dbf]/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                <span className="text-sm font-medium text-black">{label}</span>
                {data.restrictionSonore === id && (
                  <span className="ml-auto h-5 w-5 rounded-full bg-[#5b4dbf] text-white">✓</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Ces informations évitent les demandes inadaptées</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Événements acceptés</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ACCEPTED_EVENTS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleEvent(id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40",
                  data.evenementsAcceptes.includes(id)
                    ? "border-[#5b4dbf] bg-[#5b4dbf]/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                <span className="text-sm font-medium text-black">{label}</span>
                {data.evenementsAcceptes.includes(id) && (
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="ml-auto h-4 w-4 rounded border-slate-300 text-[#5b4dbf]"
                  />
                )}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Ces choix permettent de recevoir uniquement des demandes adaptées
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Ce tarif comprend</label>
          <div className="mt-3 space-y-2">
            {INCLUSIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleInclusion(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40",
                  data.inclusions.includes(id)
                    ? "border-[#5b4dbf] bg-[#5b4dbf]/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {data.inclusions.includes(id) && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5b4dbf] text-xs text-white">✓</span>
                )}
                <span className={data.inclusions.includes(id) ? "" : "ml-8"}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="h-11 flex-1 border-slate-300">
          Retour
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          Continuer
        </Button>
      </div>
      {stepHint && <p className="mt-2 text-sm text-amber-700">{stepHint}</p>}
    </>
  );
}

function Step4JoursVisite({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: WizardData;
  updateData: (u: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const now = startOfDay(new Date());
  const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const maxMonth = addMonths(minMonth, 3);
  const [month, setMonth] = useState<Date>(minMonth);

  const selectedDates = useMemo(() => {
    const seen = new Set<string>();
    return data.visiteDates
      .filter((d) => {
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      })
      .map((d) => new Date(d + "T12:00:00"));
  }, [data.visiteDates]);

  const disabledMatcher = useCallback(
    (date: Date) => date < now,
    [now]
  );

  const allFutureDatesInRange = useMemo(() => {
    const toYmd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const out: string[] = [];
    let d = new Date(minMonth);
    const end = new Date(maxMonth);
    end.setMonth(end.getMonth() + 1);
    while (d < end) {
      if (d >= now) out.push(toYmd(d));
      d = addDays(d, 1);
    }
    return [...new Set(out)];
  }, [minMonth, maxMonth, now]);

  const isAllSelected =
    allFutureDatesInRange.length > 0 &&
    allFutureDatesInRange.every((d) => data.visiteDates.includes(d));

  const defaultHoraires: HorairesJour = { debut: "14:00", fin: "18:00" };
  const canContinue = data.visiteDates.length > 0;

  const toggleAll = () => {
    if (isAllSelected) {
      updateData({ visiteDates: [], visiteHorairesParDate: {} });
    } else {
      const dates = [...allFutureDatesInRange].sort();
      const horaires: Record<string, HorairesJour> = {};
      for (const d of dates) {
        horaires[d] = data.visiteHorairesParDate?.[d] ?? defaultHoraires;
      }
      updateData({ visiteDates: dates, visiteHorairesParDate: horaires });
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-black">Jours de visite</h2>
      <p className="mt-2 text-slate-600">
        Sélectionnez les dates où les locataires peuvent organiser une visite, puis indiquez les horaires
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Calendrier des visites</label>
          <p className="mt-1 text-xs text-slate-500">
            Cliquez sur une date pour activer ou désactiver les visites. Seules les dates passées sont grisées.
          </p>
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="flex w-full max-w-[280px] items-center justify-between rounded-t-lg border border-b-0 border-slate-200 bg-slate-50/80 px-3 py-2">
              <button
                type="button"
                onClick={() => setMonth((m) => subMonths(m, 1))}
                disabled={
                  month.getFullYear() <= minMonth.getFullYear() &&
                  month.getMonth() <= minMonth.getMonth()
                }
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-semibold capitalize text-slate-800">
                {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                disabled={
                  month.getFullYear() >= maxMonth.getFullYear() &&
                  month.getMonth() >= maxMonth.getMonth()
                }
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <CalendarUi
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => {
                const toYmd = (d: Date) =>
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const strs = [...new Set((dates ?? []).map(toYmd))].sort();
                const prev = data.visiteHorairesParDate ?? {};
                const nextHoraires: Record<string, HorairesJour> = {};
                for (const s of strs) {
                  nextHoraires[s] = prev[s] ?? { debut: "14:00", fin: "18:00" };
                }
                updateData({ visiteDates: strs, visiteHorairesParDate: nextHoraires });
              }}
              month={month}
              onMonthChange={setMonth}
              disabled={disabledMatcher}
              startMonth={minMonth}
              endMonth={maxMonth}
              hideNavigation
              className="rounded-b-lg border border-slate-200 p-3"
              classNames={{
                month_caption: "hidden",
                day_button: cn(
                  "h-9 w-9 rounded-md text-sm font-normal",
                  "aria-disabled:opacity-40 aria-disabled:cursor-not-allowed",
                  "hover:bg-violet-100 hover:text-violet-900",
                  "aria-selected:bg-violet-600 aria-selected:text-white"
                ),
                disabled: "text-slate-400",
                outside: "text-slate-300",
                today: "bg-slate-100 font-medium",
              }}
            />
            {allFutureDatesInRange.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-[#5b4dbf] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b4dbf]/40"
              >
                {isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            )}
          </div>
        </div>

        {data.visiteDates.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700">Créneaux par date</label>
            <p className="mt-1 text-xs text-slate-500">
              Indiquez les horaires pour chaque date sélectionnée
            </p>
            <div className="mt-3 space-y-4">
              {[...new Set(data.visiteDates)].sort().map((dateStr) => {
                const h = data.visiteHorairesParDate?.[dateStr] ?? defaultHoraires;
                const d = new Date(dateStr + "T12:00:00");
                const label = d.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                });
                return (
                  <div
                    key={dateStr}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <span className="w-40 text-sm font-medium capitalize text-slate-700">
                      {label}
                    </span>
                    <Input
                      type="time"
                      value={h.debut}
                      onChange={(e) =>
                        updateData({
                          visiteHorairesParDate: {
                            ...data.visiteHorairesParDate,
                            [dateStr]: { ...h, debut: e.target.value },
                          },
                        })
                      }
                      className="h-10 w-32 border-slate-200"
                    />
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    <Input
                      type="time"
                      value={h.fin}
                      onChange={(e) =>
                        updateData({
                          visiteHorairesParDate: {
                            ...data.visiteHorairesParDate,
                            [dateStr]: { ...h, fin: e.target.value },
                          },
                        })
                      }
                      className="h-10 w-32 border-slate-200"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="h-11 flex-1 border-slate-300">
          Retour
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          Continuer
        </Button>
      </div>
      {!canContinue && <p className="mt-2 text-sm text-amber-700">Ajoutez au moins une date de visite.</p>}
    </>
  );
}

function Step5({
  data,
  onFileChange,
  onDrop,
  onDragOver,
  onRemovePhoto,
  fileInputRef,
  onNext,
  onBack,
  minPhotos,
  maxPhotos,
}: {
  data: WizardData;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRemovePhoto: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onNext: () => void;
  onBack: () => void;
  minPhotos: number;
  maxPhotos: number;
}) {
  const canAddMore = data.photos.length < maxPhotos;
  const canContinue = data.photos.length >= minPhotos;

  return (
    <>
      <h2 className="text-2xl font-bold text-black">Ajoutez des photos</h2>
      <p className="mt-2 text-slate-600">
        Montrez votre salle sous son meilleur jour (minimum {minPhotos}, maximum {maxPhotos} photos)
      </p>
      {data.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.photos.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-white opacity-100 transition-opacity hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Supprimer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {canAddMore && (
        <div
          className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 transition-colors hover:border-slate-300"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5b4dbf]/10">
            <Camera className="h-7 w-7 text-[#5b4dbf]" />
          </div>
          <p className="mt-3 font-semibold text-black">Glissez vos photos ici</p>
          <p className="mt-1 text-slate-500">ou</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-slate-300 bg-white"
            onClick={() => fileInputRef.current?.click()}
          >
            Télécharger des fichiers
          </Button>
          <input
            ref={fileInputRef as React.Ref<HTMLInputElement>}
            type="file"
            accept=".jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <p className="mt-3 text-xs text-slate-400">Formats acceptés : JPG, PNG</p>
        </div>
      )}
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#5b4dbf]/10 p-3 text-sm text-[#5b4dbf]">
        <Lightbulb className="h-4 w-4 shrink-0" />
        Les annonces avec photos reçoivent beaucoup plus de demandes
      </div>
      <p
        className={cn(
          "mt-2 flex items-center gap-2 text-sm",
          data.photos.length < minPhotos ? "text-amber-600" : "text-slate-500"
        )}
      >
        <Camera className="h-4 w-4" />
        {data.photos.length} / {maxPhotos} photo{maxPhotos > 1 ? "s" : ""}
        {data.photos.length < minPhotos && (
          <span className="ml-1">— ajoutez encore {minPhotos - data.photos.length}</span>
        )}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="h-11 flex-1 border-slate-300">
          Retour
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          Continuer
        </Button>
      </div>
    </>
  );
}

function Step6({
  data,
  onSubmit,
  onBack,
  isSubmitting,
  uploadProgress,
  submitError,
  submitErrorRef,
  minPhotos,
  lastErrorPhotoIndex,
}: {
  data: WizardData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  uploadProgress?: { current: number; total: number } | null;
  submitError?: string | null;
  submitErrorRef?: RefObject<HTMLDivElement | null>;
  minPhotos: number;
  lastErrorPhotoIndex?: number | null;
}) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <>
      <h2 className="text-2xl font-bold text-black">Récapitulatif</h2>
      <p className="mt-2 text-slate-600">Vérifiez les informations avant de soumettre</p>
      {uploadProgress && (
        <div className="mt-4 rounded-lg border border-[#5b4dbf]/30 bg-[#5b4dbf]/5 px-4 py-3 text-sm text-[#5b4dbf]">
          <p className="font-medium">Envoi des photos… {uploadProgress.current}/{uploadProgress.total}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#5b4dbf]/20">
            <div
              className="h-full rounded-full bg-[#5b4dbf] transition-all duration-300"
              style={{ width: `${(100 * uploadProgress.current) / uploadProgress.total}%` }}
            />
          </div>
        </div>
      )}
      {submitError && (
        <div
          ref={submitErrorRef}
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p>{submitError}</p>
          {lastErrorPhotoIndex != null && (
            <p className="mt-2 text-red-700">
              Photo concernée : n°{lastErrorPhotoIndex}. Remplacez-la si besoin puis cliquez sur Réessayer.
            </p>
          )}
          {lastErrorPhotoIndex != null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              Réessayer
            </Button>
          )}
        </div>
      )}
      <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <div>
          <p className="text-xs font-medium text-slate-500">Lieu</p>
          <p className="mt-1 font-medium text-black">{data.nom || "—"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Ville</p>
            <p className="mt-1 font-medium text-black">{data.ville || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Capacité</p>
            <p className="mt-1 font-medium text-black">{data.capacite || "—"}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Description</p>
          <p className="mt-1 text-sm text-black">{data.description || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Tarifs indicatifs</p>
          <p className="mt-1 font-medium text-black">
            {[data.tarifParJour && `${data.tarifParJour} € / jour`, data.tarifHoraire && `${data.tarifHoraire} € / heure`, data.tarifMensuel && `${data.tarifMensuel} € / mois`]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Caution demandée</p>
          <p className="mt-1 font-medium text-black">{data.cautionRequise ? "Oui" : "Non"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Ce tarif comprend</p>
          <p className="mt-1 text-sm text-black">
            {data.inclusions.length ? data.inclusions.map((id) => INCLUSIONS.find((i) => i.id === id)?.label ?? id).join(", ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Caractéristiques</p>
          <p className="mt-1 text-sm text-black">
            {data.features.length ? FEATURES.filter((f) => data.features.includes(f.id)).map((f) => f.label).join(", ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Jours et horaires de location</p>
          <div className="mt-2 space-y-1">
            {data.joursOuverture.length ? (
              data.joursOuverture.map((jour) => {
                const h = data.horairesParJour[jour];
                const label = h ? `${jour} : ${h.debut} - ${h.fin}` : jour;
                return (
                  <p key={jour} className="text-sm capitalize text-black">
                    {label}
                  </p>
                );
              })
            ) : (
              <p className="text-sm text-black">—</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Jours de visite</p>
          <div className="mt-2 space-y-1">
            {data.visiteDates.length ? (
              data.visiteDates.map((dateStr) => {
                const h = data.visiteHorairesParDate?.[dateStr];
                const d = new Date(dateStr + "T12:00:00");
                const label = d.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                });
                return (
                  <p key={dateStr} className="text-sm capitalize text-black">
                    {label} · {h?.debut ?? "14:00"} – {h?.fin ?? "18:00"}
                  </p>
                );
              })
            ) : (
              <p className="text-sm text-black">—</p>
            )}
          </div>
        </div>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#213398] focus:ring-[#213398]"
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgu" target="_blank" rel="noopener noreferrer" className="font-medium text-[#213398] hover:underline">
            conditions générales d&apos;utilisation
          </Link>{" "}
          et{" "}
          <Link href="/cgv" target="_blank" rel="noopener noreferrer" className="font-medium text-[#213398] hover:underline">
            conditions générales de vente
          </Link>
          .
        </span>
      </label>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="h-11 flex-1 border-slate-300"
        >
          Retour
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || data.photos.length < minPhotos || !acceptedTerms}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          {isSubmitting ? "Envoi en cours..." : "Soumettre mon annonce"}
        </Button>
      </div>
    </>
  );
}