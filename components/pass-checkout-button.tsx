"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type PassType = "pass_24h" | "pass_48h" | "abonnement";

type PassCheckoutButtonProps = {
  passType: PassType;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  returnBase?: string;
};

export function PassCheckoutButton({ passType, children, className, size, variant, returnBase }: PassCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stripe/checkout-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passType, ...(returnBase && { returnBase }) }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = `/auth?redirectedFrom=${encodeURIComponent("/pricing")}`;
          return;
        }
        throw new Error(data.error ?? "Impossible de lancer la session de paiement.");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      const stripe = await stripePromise;
      if (stripe && data.sessionId) {
        window.location.href = `/checkout?session_id=${encodeURIComponent(data.sessionId)}`;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button type="button" className={className} size={size} variant={variant} onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? "Redirection..." : children}
    </Button>
  );
}
