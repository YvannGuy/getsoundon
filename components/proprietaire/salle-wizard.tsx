"use client";

import Link from "next/link";
import { useState, useCallback, useRef } from "react";
import { createSalleFromOnboarding } from "@/app/actions/create-salle";
import {
  Accessibility,
  Armchair,
  Bell,
  Camera,
  CheckCircle,
  ChevronRight,
  Clock,
  Droplets,
  Eye,
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
import { VilleAutocomplete } from "@/components/search/ville-autocomplete";
import { AdresseAutocomplete } from "@/components/search/adresse-autocomplete";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

const FEATURES = [
  { id: "erp", label: "ERP conforme", icon: Shield },
  { id: "pmr", label: "Accès PMR", icon: Accessibility },
  { id: "scene", label: "Scène / estrade", icon: LayoutGrid },
  { id: "climatisation", label: "Climatisation", icon: Snowflake },
  { id: "parking", label: "Parking disponible", icon: ParkingCircle },
  { id: "mobilier", label: "Chaises / mobilier inclus", icon: Armchair },
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
  { id: "location", label: "Location de la salle pour la journée" },
  { id: "mobilier", label: "Mobilier et équipements" },
  { id: "sono", label: "Système de sonorisation" },
] as const;

type HorairesJour = { debut: string; fin: string };

type WizardData = {
  nom: string;
  ville: string;
  capacite: string;
  adresse: string;
  telephone: string;
  lat?: number;
  lng?: number;
  postalCode?: string;
  description: string;
  tarifParJour: string;
  inclusions: string[];
  placesParking: string;
  features: string[];
  horairesParJour: Record<string, HorairesJour>;
  joursOuverture: string[];
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
  telephone: "",
  description: "",
  tarifParJour: "",
  inclusions: ["location"],
  placesParking: "",
  features: [],
  horairesParJour: {},
  joursOuverture: [],
  restrictionSonore: "",
  evenementsAcceptes: [],
  photos: [],
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MIN_PHOTOS = 3;
  const MAX_PHOTOS = 5;

  const progress = (step / TOTAL_STEPS) * 100;

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
      return { ...prev, joursOuverture: newJours, horairesParJour: newHoraires };
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
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("nom", data.nom);
    formData.set("ville", data.ville);
    formData.set("capacite", data.capacite);
    formData.set("adresse", data.adresse);
    formData.set("telephone", data.telephone);
    if (data.postalCode) formData.set("postalCode", data.postalCode);
    if (data.lat != null) formData.set("lat", String(data.lat));
    if (data.lng != null) formData.set("lng", String(data.lng));
    formData.set("description", data.description);
    formData.set("tarifParJour", data.tarifParJour);
    formData.set("inclusions", JSON.stringify(data.inclusions));
    formData.set("placesParking", data.placesParking);
    formData.set("features", JSON.stringify(data.features));
    formData.set("horairesParJour", JSON.stringify(data.horairesParJour));
    formData.set("joursOuverture", JSON.stringify(data.joursOuverture));
    formData.set("restrictionSonore", data.restrictionSonore);
    formData.set("evenementsAcceptes", JSON.stringify(data.evenementsAcceptes));
    data.photos.forEach((file) => formData.append("photos", file));

    const result = await createSalleFromOnboarding(formData);

    if (result.success) {
      setCreatedSlug(result.slug ?? null);
      setCreatedStatus(result.status ?? "pending");
      setSubmitted(true);
      onSuccess?.(result.slug ?? null, result.status ?? "pending");
    } else {
      setSubmitError(result.error);
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
            <p className="mt-2 text-sm text-slate-600">Votre annonce est en ligne et visible par les organisateurs.</p>
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
                  Votre annonce est en ligne et visible par les organisateurs. Vous pouvez la modifier depuis votre tableau de bord.
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
                  organisateurs d&apos;événements.
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
          <Step4
            data={data}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onRemovePhoto={handleRemovePhoto}
            fileInputRef={fileInputRef}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
            minPhotos={MIN_PHOTOS}
            maxPhotos={MAX_PHOTOS}
          />
        )}
        {step === 5 && (
          <Step5
            data={data}
            onSubmit={handleSubmit}
            onBack={() => setStep(4)}
            isSubmitting={isSubmitting}
            submitError={submitError}
            minPhotos={MIN_PHOTOS}
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
  const isComplete =
    data.nom.trim() !== "" &&
    data.ville.trim() !== "" &&
    data.capacite.trim() !== "" &&
    data.adresse.trim() !== "" &&
    data.telephone.trim() !== "" &&
    data.description.trim() !== "" &&
    data.tarifParJour.trim() !== "" &&
    Number(data.tarifParJour) > 0;

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
              onChange={(v) => updateData({ ville: v })}
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
          <label className="text-sm font-medium text-slate-700">Téléphone *</label>
          <Input
            type="tel"
            placeholder="Ex: 06 12 34 56 78"
            value={data.telephone}
            onChange={(e) => updateData({ telephone: e.target.value })}
            className="h-11 border-slate-200"
          />
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
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Tarif indicatif (€ / jour)</label>
          <Input
            type="number"
            placeholder="Ex: 800"
            value={data.tarifParJour}
            onChange={(e) => updateData({ tarifParJour: e.target.value })}
            min={0}
            className="h-11 border-slate-200"
          />
        </div>
      </div>
      <Button
        onClick={onNext}
        disabled={!isComplete}
        className="mt-8 h-11 w-full bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
      >
        Continuer
      </Button>
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
              "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors",
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
          disabled={!(
            data.features.length >= 1 &&
            (!data.features.includes("parking") || data.placesParking.trim() !== "")
          )}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          Continuer
        </Button>
      </div>
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
  return (
    <>
      <h2 className="text-2xl font-bold text-black">Conditions d&apos;accueil</h2>
      <p className="mt-2 text-slate-600">Précisez les règles et contraintes de votre salle</p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="text-sm font-medium text-slate-700">Jours d&apos;ouverture</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {JOURS.map((jour) => (
              <button
                key={jour}
                type="button"
                onClick={() => toggleJour(jour)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                  data.joursOuverture.includes(jour)
                    ? "border-[#5b4dbf] bg-[#5b4dbf]/10 text-[#5b4dbf]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {jour}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Sélectionnez les jours où la salle est disponible</p>
        </div>

        {data.joursOuverture.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700">Horaires par jour</label>
            <p className="mt-1 text-xs text-slate-500">
              Indiquez les plages horaires pour chaque jour sélectionné
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
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
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
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
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
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
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
          disabled={!(
            data.joursOuverture.length >= 1 &&
            data.restrictionSonore !== "" &&
            data.evenementsAcceptes.length >= 1
          )}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          Continuer
        </Button>
      </div>
    </>
  );
}

function Step4({
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
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
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

function Step5({
  data,
  onSubmit,
  onBack,
  isSubmitting,
  submitError,
  minPhotos,
}: {
  data: WizardData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  minPhotos: number;
}) {
  return (
    <>
      <h2 className="text-2xl font-bold text-black">Récapitulatif</h2>
      <p className="mt-2 text-slate-600">Vérifiez les informations avant de soumettre</p>
      {submitError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
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
          <p className="text-xs font-medium text-slate-500">Téléphone</p>
          <p className="mt-1 font-medium text-black">{data.telephone || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Description</p>
          <p className="mt-1 text-sm text-black">{data.description || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Tarif indicatif</p>
          <p className="mt-1 font-medium text-black">{data.tarifParJour ? `${data.tarifParJour} € / jour` : "—"}</p>
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
          <p className="text-xs font-medium text-slate-500">Jours et horaires d&apos;ouverture</p>
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
      </div>
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
          disabled={isSubmitting || data.photos.length < minPhotos}
          className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad] disabled:opacity-50"
        >
          {isSubmitting ? "Envoi en cours..." : "Soumettre mon annonce"}
        </Button>
      </div>
    </>
  );
}