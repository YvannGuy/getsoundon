import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration | GetSoundOn",
  description: "Connexion réservée aux administrateurs GetSoundOn",
  robots: { index: false, follow: false },
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
