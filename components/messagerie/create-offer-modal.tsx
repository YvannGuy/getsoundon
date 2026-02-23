"use client";

import { useState } from "react";

import { createOfferAction } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const [eventType, setEventType] = useState<"ponctuel" | "mensuel">("ponctuel");
  const [dateDebut, setDateDebut] = useState(today());
  const [dateFin, setDateFin] = useState(today());
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt());
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || amt <= 0) {
      setError("Montant invalide.");
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
    formData.set("eventType", eventType);
    formData.set("dateDebut", dateDebut);
    formData.set("dateFin", dateFin);
    formData.set("expiresAt", expiresAt);
    if (message.trim()) formData.set("message", message.trim());

    const res = await createOfferAction(formData);
    setSaving(false);

    if (res.success) {
      onSuccess();
      onOpenChange(false);
      setAmount("");
      setEventType("ponctuel");
      setDateDebut(today());
      setDateFin(today());
      setExpiresAt(defaultExpiresAt());
      setMessage("");
    } else {
      setError(res.error ?? "Erreur lors de l'envoi.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>Créer une offre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-black">Type d&apos;évènement</label>
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
            <p className="mt-1 text-xs text-slate-500">Période de réservation</p>
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
            <p className="mt-1 text-xs text-slate-500">Prix proposé pour cette réservation</p>
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
              placeholder="Ajoutez un message à l'organisateur"
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
