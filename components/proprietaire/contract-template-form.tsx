"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { saveContractTemplateAction } from "@/app/actions/contract-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  salleId: string;
  initialData: {
    raisonSociale: string;
    adresse: string;
    codePostal: string;
    ville: string;
    siret: string;
    conditionsParticulieres: string;
  };
};

export function ContractTemplateForm({ salleId, initialData }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [raisonSociale, setRaisonSociale] = useState(initialData.raisonSociale);
  const [adresse, setAdresse] = useState(initialData.adresse);
  const [codePostal, setCodePostal] = useState(initialData.codePostal);
  const [ville, setVille] = useState(initialData.ville);
  const [siret, setSiret] = useState(initialData.siret);
  const [conditionsParticulieres, setConditionsParticulieres] = useState(
    initialData.conditionsParticulieres
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.set("salleId", salleId);
    formData.set("raisonSociale", raisonSociale);
    formData.set("adresse", adresse);
    formData.set("codePostal", codePostal);
    formData.set("ville", ville);
    formData.set("siret", siret);
    formData.set("conditionsParticulieres", conditionsParticulieres);

    const res = await saveContractTemplateAction(formData);
    setSaving(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error ?? "Erreur");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="raisonSociale" className="mb-1 block text-sm font-medium text-slate-700">
            Raison sociale / Nom du loueur
          </label>
          <Input
            id="raisonSociale"
            value={raisonSociale}
            onChange={(e) => setRaisonSociale(e.target.value)}
            placeholder="Association, église, structure..."
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="siret" className="mb-1 block text-sm font-medium text-slate-700">
            SIRET (optionnel)
          </label>
          <Input
            id="siret"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="123 456 789 00012"
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <label htmlFor="adresse" className="mb-1 block text-sm font-medium text-slate-700">
          Adresse
        </label>
        <Input
          id="adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="123 rue de l'Église"
          className="mt-1"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="codePostal" className="mb-1 block text-sm font-medium text-slate-700">
            Code postal
          </label>
          <Input
            id="codePostal"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            placeholder="75001"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="ville" className="mb-1 block text-sm font-medium text-slate-700">
            Ville
          </label>
          <Input
            id="ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Paris"
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <label htmlFor="conditions" className="mb-1 block text-sm font-medium text-slate-700">
          Conditions particulières (optionnel)
        </label>
        <textarea
          id="conditions"
          value={conditionsParticulieres}
          onChange={(e) => setConditionsParticulieres(e.target.value)}
          placeholder="Règles spécifiques à votre salle : horaires, accès, consignes..."
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-gs-orange focus:outline-none focus:ring-1 focus:ring-gs-orange"
        />
      </div>
      <Button type="submit" disabled={saving} className="bg-gs-orange hover:brightness-95">
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
