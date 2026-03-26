import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion | GetSoundOn",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="container py-16">
      <LoginForm />
    </main>
  );
}
