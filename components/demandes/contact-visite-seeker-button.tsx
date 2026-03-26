"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { contactProprietaireVisiteAction } from "@/app/actions/contact-proprietaire-visite";
import { Button } from "@/components/ui/button";

/** Bouton pour le locataire : contacter le propriétaire (visite) */
export function ContactVisiteSeekerButton({
  demandeVisiteId,
  className,
  label,
  status,
}: {
  demandeVisiteId: string;
  className?: string;
  label?: string;
  status?: string;
}) {
  const [loading, setLoading] = useState(false);
  const computedLabel =
    label ??
    (["accepted", "refused", "replied"].includes(status ?? "")
      ? "Voir la conversation"
      : "Contacter le propriétaire");
  return (
    <form
      action={async () => {
        setLoading(true);
        const res = await contactProprietaireVisiteAction(demandeVisiteId);
        setLoading(false);
        if (!res?.success && res?.error) {
          alert(res.error);
        }
      }}
    >
      <Button
        type="submit"
        disabled={loading}
        size="sm"
        className={`bg-gs-orange hover:brightness-95 ${className ?? ""}`.trim()}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        {loading ? "Ouverture…" : computedLabel}
      </Button>
    </form>
  );
}
