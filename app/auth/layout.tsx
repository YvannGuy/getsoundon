import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion | salledeculte.com",
  description: "Connectez-vous ou créez un compte sur salledeculte.com",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
