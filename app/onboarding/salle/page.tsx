"use client";

import Link from "next/link";
import { useState, useCallback, useRef } from "react";
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
  Mountain,
  Music,
  ParkingCircle,
  Shield,
  Snowflake,
  Sun,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
] as const;

const INCLUSIONS = [
  { id: "location", label: "Location de la salle pour la journée" },
  { id: "mobilier", label: "Mobilier et équipements" },
  { id: "sono", label: "Système de sonorisation" },
] as const;

type WizardData = {
  nom: string;
  ville: string;
  capacite: string;
  adresse: string;
  description: string;
  tarifParJour: string;
  inclusions: string[];
  placesParking: string;
  features: string[];
  heureDebut: string;
  heureFin: string;
  joursOuverture: string[];
  restrictionSonore: string;
  evenementsAcceptes: string[];
  photos: File[];
};

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

const initialData: WizardData = {
  nom: "",
  ville: "",
  capacite: "",
  adresse: "",
  description: "",
  tarifParJour: "",
  inclusions: ["location"],
  placesParking: "",
  features: [],
  heureDebut: "08:00",
  heureFin: "22:00",
  joursOuverture: [],
  restrictionSonore: "",
  evenementsAcceptes: [],
  photos: [],
};

export default function OnboardingSallePage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setData((prev) => ({
      ...prev,
      joursOuverture: prev.joursOuverture.includes(jour)
        ? prev.joursOuverture.filter((j) => j !== jour)
        : [...prev.joursOuverture, jour],
    }));
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
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      setData((prev) => ({ ...prev, photos: [...prev.photos, ...files] }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    if (files.length) {
      setData((prev) => ({ ...prev, photos: [...prev.photos, ...files] }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
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
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-12 w-12 text-amber-600" />
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Validation en cours
            </span>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Annonce en cours de validation
            </h1>
            <p className="mt-4 max-w-md text-slate-600">
              Merci pour votre soumission. Notre équipe vérifie actuellement les informations et les
              photos de votre salle.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              Délai moyen de validation : 24 à 48 heures
            </div>
            <div className="mt-6 flex w-full flex-col gap-3 rounded-xl border border-sky-100 bg-sky-50 p-5 text-left">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                  <Bell className="h-5 w-5 text-sky-600" />
                </div>
                <p className="text-sm leading-relaxed text-sky-900">
                  Vous serez notifié dès que votre annonce sera validée. Un email de confirmation
                  vous sera envoyé avec toutes les informations nécessaires.
                </p>
              </div>
            </div>
            <div className="mt-8 flex w-full flex-col gap-3">
              <Link
                href="/proprietaire"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                Accéder à mon tableau de bord
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye className="h-5 w-5" />
                Voir mon annonce (aperçu)
              </Link>
            </div>
            <h2 className="mt-14 w-full text-left text-lg font-semibold text-slate-900">
              Pendant la validation
            </h2>
            <div className="mt-6 grid w-full gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Shield className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">Vérification</p>
                <p className="mt-1 text-xs text-slate-500">Contrôle des informations</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Camera className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">Photos</p>
                <p className="mt-1 text-xs text-slate-500">Validation des visuels</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <CheckCircle className="h-7 w-7 text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">Conformité</p>
                <p className="mt-1 text-xs text-slate-500">Respect des standards</p>
              </div>
            </div>
            <div className="mt-10 flex w-full gap-3 rounded-lg bg-slate-50 p-5 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                <span className="text-sm font-semibold text-slate-600">i</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Pourquoi cette étape ?</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  La validation manuelle garantit la qualité et la fiabilité des annonces sur notre
                  plateforme. Cette démarche protège à la fois les propriétaires et les
                  organisateurs d&apos;événements.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold text-slate-800">
            {siteConfig.name}
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Temps estimé : 2 minutes
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
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
            fileInputRef={fileInputRef}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <Step5 data={data} onSubmit={handleSubmit} onBack={() => setStep(4)} />
        )}
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
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Parlez-nous de votre salle</h2>
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
            <Input
              placeholder="Ex: Paris"
              value={data.ville}
              onChange={(e) => updateData({ ville: e.target.value })}
              className="h-11 border-slate-200"
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
          <Input
            placeholder="Ex: 12 rue de la République"
            value={data.adresse}
            onChange={(e) => updateData({ adresse: e.target.value })}
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
        className="mt-8 h-11 w-full bg-[#5b4dbf] hover:bg-[#4a3dad]"
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
      <h2 className="text-2xl font-bold text-slate-900">Caractéristiques principales</h2>
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
            <span className="flex-1 text-sm font-medium text-slate-900">{label}</span>
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
        <Button onClick={onNext} className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad]">
          Continuer
        </Button>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <button type="button" className="hover:underline">
          Passer cette étape
        </button>
      </p>
    </>
  );
}

function Step3({
  data,
  updateData,
  toggleEvent,
  toggleInclusion,
  toggleJour,
  onNext,
  onBack,
}: {
  data: WizardData;
  updateData: (u: Partial<WizardData>) => void;
  toggleEvent: (id: string) => void;
  toggleInclusion: (id: string) => void;
  toggleJour: (jour: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Conditions d&apos;accueil</h2>
      <p className="mt-2 text-slate-600">Précisez les règles et contraintes de votre salle</p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="text-sm font-medium text-slate-700">Horaires autorisés</label>
          <div className="mt-2 flex items-center gap-3">
            <Input
              type="time"
              value={data.heureDebut}
              onChange={(e) => updateData({ heureDebut: e.target.value })}
              className="h-11 w-32 border-slate-200"
            />
            <ChevronRight className="h-5 w-5 text-slate-400" />
            <Input
              type="time"
              value={data.heureFin}
              onChange={(e) => updateData({ heureFin: e.target.value })}
              className="h-11 w-32 border-slate-200"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Indiquez les plages horaires d&apos;ouverture</p>
        </div>

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
                <span className="text-sm font-medium text-slate-900">{label}</span>
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
                <span className="text-sm font-medium text-slate-900">{label}</span>
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
        <Button onClick={onNext} className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad]">
          Continuer
        </Button>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <button type="button" className="hover:underline">
          Passer cette étape
        </button>
      </p>
    </>
  );
}

function Step4({
  data,
  onFileChange,
  onDrop,
  onDragOver,
  fileInputRef,
  onNext,
  onBack,
}: {
  data: WizardData;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Ajoutez des photos</h2>
      <p className="mt-2 text-slate-600">Montrez votre salle sous son meilleur jour</p>
      <div
        className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 transition-colors hover:border-slate-300"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5b4dbf]/10">
          <Camera className="h-8 w-8 text-[#5b4dbf]" />
        </div>
        <p className="mt-4 font-semibold text-slate-900">Glissez vos photos ici</p>
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
        <p className="mt-4 text-xs text-slate-400">Formats acceptés : JPG, PNG</p>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#5b4dbf]/10 p-3 text-sm text-[#5b4dbf]">
        <Lightbulb className="h-4 w-4 shrink-0" />
        Les annonces avec photos reçoivent beaucoup plus de demandes
      </div>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
        <Camera className="h-4 w-4" />
        {data.photos.length} photo{data.photos.length !== 1 ? "s" : ""} ajoutée
        {data.photos.length !== 1 ? "s" : ""}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="h-11 flex-1 border-slate-300">
          Retour
        </Button>
        <Button onClick={onNext} className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad]">
          Continuer
        </Button>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <button type="button" className="hover:underline">
          Passer cette étape
        </button>
      </p>
    </>
  );
}

function Step5({
  data,
  onSubmit,
  onBack,
}: {
  data: WizardData;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Récapitulatif</h2>
      <p className="mt-2 text-slate-600">Vérifiez les informations avant de soumettre</p>
      <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <div>
          <p className="text-xs font-medium text-slate-500">Lieu</p>
          <p className="mt-1 font-medium text-slate-900">{data.nom || "—"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Ville</p>
            <p className="mt-1 font-medium text-slate-900">{data.ville || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Capacité</p>
            <p className="mt-1 font-medium text-slate-900">{data.capacite || "—"}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Description</p>
          <p className="mt-1 text-sm text-slate-900">{data.description || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Tarif indicatif</p>
          <p className="mt-1 font-medium text-slate-900">{data.tarifParJour ? `${data.tarifParJour} € / jour` : "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Ce tarif comprend</p>
          <p className="mt-1 text-sm text-slate-900">
            {data.inclusions.length ? data.inclusions.map((id) => INCLUSIONS.find((i) => i.id === id)?.label ?? id).join(", ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Caractéristiques</p>
          <p className="mt-1 text-sm text-slate-900">
            {data.features.length ? FEATURES.filter((f) => data.features.includes(f.id)).map((f) => f.label).join(", ") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Jours d&apos;ouverture</p>
          <p className="mt-1 text-sm text-slate-900 capitalize">
            {data.joursOuverture.length ? data.joursOuverture.join(", ") : "—"}
          </p>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="h-11 flex-1 border-slate-300">
          Retour
        </Button>
        <Button onClick={onSubmit} className="h-11 flex-1 bg-[#5b4dbf] hover:bg-[#4a3dad]">
          Soumettre mon annonce
        </Button>
      </div>
    </>
  );
}