"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { createOfferAction } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type CreateOfferModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  demandeId: string;
  salleId: string;
  seekerId: string;
  onSuccess: () => void;
};

const defaultExpiresAt = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);
const CANCELLATION_POLICY_HELP = {
  strict:
    "Stricte : > J-90 = 100%, J-90 à J-30 = 50%, < J-30 = 0% de remboursement (location matériel / pack).",
  moderate:
    "Modérée : > J-30 = 100%, J-30 à J-15 = 50%, < J-15 = 0% de remboursement (location matériel / pack).",
  flexible:
    "Flexible : > J-7 = 100%, J-7 à J-2 = 50%, < J-2 = 0% de remboursement (location matériel / pack).",
} as const;

function PolicyInfo({ text }: { text: string }) {
  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          aria-label="Voir le détail de la politique"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-xs text-slate-600">
        {text}
      </PopoverContent>
    </Popover>
  );
}

export function CreateOfferModal({
  open,
  onOpenChange,
  conversationId,
  demandeId,
  salleId,
  seekerId,
  onSuccess,
}: CreateOfferModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"full" | "split">("full");
  const [upfrontAmount, setUpfrontAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [eventType, setEventType] = useState<"ponctuel" | "mensuel">("ponctuel");
  const [cancellationPolicy, setCancellationPolicy] = useState<"strict" | "moderate" | "flexible">("strict");
  const [dateDebut, setDateDebut] = useState(today());
  const [dateFin, setDateFin] = useState(today());
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt());
  const [message, setMessage] = useState("");
  const [accessoriesNotes, setAccessoriesNotes] = useState("");
  const [fulfillmentMode, setFulfillmentMode] = useState<
    "retrait" | "livraison" | "les_deux" | "a_convenir"
  >("retrait");
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount.replace(",", "."));
    const effectivePaymentMode = eventType === "mensuel" ? "full" : paymentMode;
    const upfront = effectivePaymentMode === "split"
      ? parseFloat(upfrontAmount.replace(",", "."))
      : amt;
    if (!Number.isFinite(upfront) || upfront <= 0) {
      setError("Montant d'acompte invalide.");
      return;
    }
    if (effectivePaymentMode === "split" && upfront >= amt) {
      setError("L'acompte doit être inférieur au montant total.");
      return;
    }
    if (!amt || amt <= 0) {
      setError("Montant invalide.");
      return;
    }
    const deposit = depositAmount.trim() ? parseFloat(depositAmount.replace(",", ".")) : 0;
    if (!Number.isFinite(deposit) || deposit < 0) {
      setError("Montant de caution invalide.");
      return;
    }
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    if (fin < debut) {
      setError("La date de fin doit être après la date de début.");
      return;
    }
    if (new Date(expiresAt) < new Date()) {
      setError("La date d'expiration doit être dans le futur.");
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("demandeId", demandeId);
    formData.set("salleId", salleId);
    formData.set("seekerId", seekerId);
    formData.set("amount", String(amt));
    formData.set("paymentMode", effectivePaymentMode);
    formData.set("upfrontAmount", String(upfront));
    formData.set("depositAmount", String(deposit));
    formData.set("eventType", eventType);
    formData.set("cancellationPolicy", cancellationPolicy);
    formData.set("dateDebut", dateDebut);
    formData.set("dateFin", dateFin);
    formData.set("expiresAt", expiresAt);
    if (message.trim()) formData.set("message", message.trim());
    formData.set("accessoriesNotes", accessoriesNotes.trim());
    formData.set("fulfillmentMode", fulfillmentMode);
    formData.set("fulfillmentNotes", fulfillmentNotes.trim());

    const res = await createOfferAction(formData);
    setSaving(false);

    if (res.success) {
      onSuccess();
      onOpenChange(false);
      setAmount("");
      setPaymentMode("full");
      setUpfrontAmount("");
      setDepositAmount("");
      setEventType("ponctuel");
      setCancellationPolicy("strict");
      setDateDebut(today());
      setDateFin(today());
      setExpiresAt(defaultExpiresAt());
      setMessage("");
      setAccessoriesNotes("");
      setFulfillmentMode("retrait");
      setFulfillmentNotes("");
    } else {
      setError(res.error ?? "Erreur lors de l'envoi.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true} className="max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Créer une offre (matériel / pack)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-black">Type de location</label>
            <div className="mt-1.5 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="eventType"
                  value="ponctuel"
                  checked={eventType === "ponctuel"}
                  onChange={() => setEventType("ponctuel")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Ponctuel</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="eventType"
                  value="mensuel"
                  checked={eventType === "mensuel"}
                  onChange={() => setEventType("mensuel")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Mensuel</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-black">Valable du … au …</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="flex-1 min-w-[140px]"
              />
              <span className="self-center text-slate-500">au</span>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                min={dateDebut}
                className="flex-1 min-w-[140px]"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Période couverte par l&apos;offre (retrait, utilisation, retour)</p>
          </div>
          <div>
            <label htmlFor="offer-accessories" className="text-sm font-medium text-black">
              Accessoires & périmètre inclus (figé dans l&apos;offre)
            </label>
            <textarea
              id="offer-accessories"
              value={accessoriesNotes}
              onChange={(e) => setAccessoriesNotes(e.target.value)}
              placeholder="Ex. : câbles, pieds, housse, micros filaires, notice de réglage…"
              maxLength={1200}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213398]"
            />
            <p className="mt-1 text-xs text-slate-500">
              Ce texte est enregistré tel quel dans le snapshot de l&apos;offre.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-black">Retrait / livraison</label>
            <div className="mt-1.5 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="fulfillmentMode"
                  value="retrait"
                  checked={fulfillmentMode === "retrait"}
                  onChange={() => setFulfillmentMode("retrait")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Retrait sur place</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="fulfillmentMode"
                  value="livraison"
                  checked={fulfillmentMode === "livraison"}
                  onChange={() => setFulfillmentMode("livraison")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Livraison</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="fulfillmentMode"
                  value="les_deux"
                  checked={fulfillmentMode === "les_deux"}
                  onChange={() => setFulfillmentMode("les_deux")}
                  className="h-4 w-4"
                />
                <span className="text-sm">L&apos;un ou l&apos;autre (à préciser)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="fulfillmentMode"
                  value="a_convenir"
                  checked={fulfillmentMode === "a_convenir"}
                  onChange={() => setFulfillmentMode("a_convenir")}
                  className="h-4 w-4"
                />
                <span className="text-sm">À convenir par message</span>
              </label>
            </div>
            <textarea
              value={fulfillmentNotes}
              onChange={(e) => setFulfillmentNotes(e.target.value)}
              placeholder="Adresse de retrait, zone de livraison, créneaux, frais éventuels…"
              maxLength={800}
              rows={2}
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213398]"
            />
          </div>
          <div>
            <label htmlFor="offer-amount" className="text-sm font-medium text-black">Montant (€)</label>
            <Input
              id="offer-amount"
              type="text"
              inputMode="decimal"
              placeholder="150"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-slate-500">Prix total de la location pour la période indiquée</p>
          </div>
          {eventType !== "mensuel" && (
            <div>
              <label className="text-sm font-medium text-black">Mode de paiement</label>
              <div className="mt-1.5 flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="full"
                    checked={paymentMode === "full"}
                    onChange={() => setPaymentMode("full")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Paiement en 1 fois</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="split"
                    checked={paymentMode === "split"}
                    onChange={() => setPaymentMode("split")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Acompte + solde J-7</span>
                </label>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-black">Politique d&apos;annulation</label>
            <div className="mt-1.5 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value="strict"
                    checked={cancellationPolicy === "strict"}
                    onChange={() => setCancellationPolicy("strict")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Stricte</span>
                </label>
                <PolicyInfo text={CANCELLATION_POLICY_HELP.strict} />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value="moderate"
                    checked={cancellationPolicy === "moderate"}
                    onChange={() => setCancellationPolicy("moderate")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Modérée</span>
                </label>
                <PolicyInfo text={CANCELLATION_POLICY_HELP.moderate} />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value="flexible"
                    checked={cancellationPolicy === "flexible"}
                    onChange={() => setCancellationPolicy("flexible")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Flexible</span>
                </label>
                <PolicyInfo text={CANCELLATION_POLICY_HELP.flexible} />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Cette politique servira au calcul automatique de remboursement en cas d&apos;annulation.
            </p>
          </div>
          {eventType !== "mensuel" && paymentMode === "split" && (
            <div>
              <label htmlFor="offer-upfront" className="text-sm font-medium text-black">
                Acompte à payer maintenant (€)
              </label>
              <Input
                id="offer-upfront"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 90"
                value={upfrontAmount}
                onChange={(e) => setUpfrontAmount(e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-slate-500">
                Le solde sera prélevé automatiquement à J-7 de l&apos;événement.
              </p>
            </div>
          )}
          <div>
            <label htmlFor="offer-deposit" className="text-sm font-medium text-black">
              Caution (€) (optionnel)
            </label>
            <Input
              id="offer-deposit"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-slate-500">
              Frais de service fixes pour le locataire : 15 €.
            </p>
          </div>
          <div>
            <label htmlFor="offer-expires" className="text-sm font-medium text-black">Offre valable jusqu&apos;au</label>
            <Input
              id="offer-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-slate-500">Date limite pour accepter l&apos;offre</p>
          </div>
          <div>
            <label htmlFor="offer-message" className="text-sm font-medium text-black">Message (optionnel)</label>
            <textarea
              id="offer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ajoutez un message au locataire"
              maxLength={500}
              className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213398]"
              rows={3}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !amount.trim()}>
              {saving ? "Envoi..." : "Envoyer l'offre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
