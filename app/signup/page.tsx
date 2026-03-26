import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Inscription | GetSoundOn",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <main className="container py-16">
      <SignupForm />
    </main>
  );
}
