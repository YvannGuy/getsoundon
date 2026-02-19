import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion | salledeculte.com",
};

export default function LoginPage() {
  return (
    <main className="container py-16">
      <LoginForm />
    </main>
  );
}
