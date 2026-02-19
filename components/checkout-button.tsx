"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type CheckoutButtonProps = {
  planId: string;
  children: React.ReactNode;
  className?: string;
};

export function CheckoutButton({ planId, children, className }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error("Impossible de lancer la session de paiement.");
      }

      const data = (await response.json()) as { sessionId?: string; url?: string };
      const stripe = await stripePromise;

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (stripe && data.sessionId) {
        const redirectUrl = `/checkout?session_id=${encodeURIComponent(data.sessionId)}`;
        window.location.href = redirectUrl;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button type="button" className={className} onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? "Redirection..." : children}
    </Button>
  );
}
