"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

import { contactLocataireDemandeAction } from "@/app/actions/contact-locataire-demande";
import { Button } from "@/components/ui/button";

export function ContactLocataireDemandeButton({ demandeId }: { demandeId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <form
      action={async () => {
        setLoading(true);
        const res = await contactLocataireDemandeAction(demandeId);
        setLoading(false);
        if (!res?.success && res?.error) {
          alert(res.error);
        }
      }}
    >
      <Button type="submit" disabled={loading} size="sm" className="bg-gs-orange hover:brightness-95">
        <MessageCircle className="mr-2 h-4 w-4" />
        {loading ? "Ouverture…" : "Contacter le locataire"}
      </Button>
    </form>
  );
}
