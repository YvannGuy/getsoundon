"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type PortalButtonProps = {
  hasStripeCustomer: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  children: React.ReactNode;
  className?: string;
};

export function PortalButton({
  hasStripeCustomer,
  variant = "outline",
  size = "default",
  children,
  className,
}: PortalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!hasStripeCustomer) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.url) window.location.href = data.url;
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
      disabled={!hasStripeCustomer || loading}
      className={className}
    >
      {loading ? "Redirection..." : children}
    </Button>
  );
}
