import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion | GetSoundOn",
  description: "Connectez-vous ou creez un compte sur GetSoundOn",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
