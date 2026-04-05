import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { getUserOrNull } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Onboarding prestataire | ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUserOrNull();
  if (!user) {
    redirect("/auth?tab=signup&userType=owner");
  }

  return <>{children}</>;
}
