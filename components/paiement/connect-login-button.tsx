"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ConnectLoginButtonProps = {
  hasStripeAccount: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  children?: React.ReactNode;
  className?: string;
};

export function ConnectLoginButton({
  hasStripeAccount,
  variant = "outline",
  size = "sm",
  children = "Ouvrir mon espace Stripe",
  className,
}: ConnectLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!hasStripeAccount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/login-link", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error(data.error ?? "Aucune URL.");
      }
    } catch (e) {
      alert((e as Error).message ?? "Erreur lors de l'accès.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={!hasStripeAccount || loading}
      className={className}
    >
      {loading ? "Ouverture..." : children}
    </Button>
  );
}
