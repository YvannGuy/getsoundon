"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const AUTH_HREF = "/auth?tab=signup&userType=owner";
const ONBOARDING_HREF = "/onboarding/salle";

type AddSalleLinkProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Lien "Ajouter ma salle" / "Ajoutez ma salle" : vers onboarding si connecté, sinon vers auth signup owner.
 */
export function AddSalleLink({ className, children }: AddSalleLinkProps) {
  const [href, setHref] = useState(AUTH_HREF);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHref(session?.user ? ONBOARDING_HREF : AUTH_HREF);
    });
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
