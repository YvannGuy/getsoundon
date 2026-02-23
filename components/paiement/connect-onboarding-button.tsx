"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ConnectOnboardingButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function ConnectOnboardingButton({
  className,
  children = "Activer les paiements",
}: ConnectOnboardingButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/onboarding", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Aucune URL de redirection.");
      }
    } catch (e) {
      alert((e as Error).message ?? "Erreur lors de l'activation.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Redirection..." : children}
    </Button>
  );
}
