"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const AUTH_HREF = "/auth?tab=signup&userType=owner";
const OWNER_DASHBOARD_ADD_HREF = "/proprietaire/ajouter-annonce";

type AddSalleLinkProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Lien "Ajouter mon annonce" :
 * - si connecté -> dashboard propriétaire avec ouverture automatique du wizard intégré
 * - sinon -> auth signup owner
 */
export function AddSalleLink({ className, children }: AddSalleLinkProps) {
  const [href, setHref] = useState(AUTH_HREF);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHref(session?.user ? OWNER_DASHBOARD_ADD_HREF : AUTH_HREF);
    });
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
