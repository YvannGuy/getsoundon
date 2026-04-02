"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { requestPasswordResetAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { LANDING_HERO_IMAGE_URL } from "@/lib/landing-assets";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

type Schema = z.infer<typeof schema>;
const initialState: AuthFormState = {};

export default function MotDePasseOubliePage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
      <div className="relative flex min-h-[280px] flex-col justify-start gap-8 overflow-hidden bg-gs-beige p-8 md:min-h-0 md:p-10">
        <div className="absolute inset-0">
          <Image
            src={LANDING_HERO_IMAGE_URL}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        <div className="landing-hero-overlay absolute inset-0" aria-hidden />
        <div className="relative z-10">
          <Link
            href="/auth"
            className="font-landing-nav inline-flex items-center gap-2 text-sm font-medium text-white/90 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
          <h2 className="font-landing-heading mt-6 flex flex-nowrap items-center gap-2 text-lg font-bold text-white sm:gap-2.5 sm:text-xl md:text-2xl">
            <span className="shrink-0 whitespace-nowrap">Bienvenue sur</span>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap leading-none transition hover:opacity-95"
            >
              <Image
                src="/images/logosound.png"
                alt=""
                width={48}
                height={48}
                className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10 md:h-12 md:w-12"
              />
              <span className="font-landing-logo-mark text-gs-orange">{siteConfig.name.toUpperCase()}</span>
            </Link>
          </h2>
          <p className="font-landing-body mt-3 max-w-md text-sm leading-relaxed text-white/90">
            Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>
        <ul className="relative z-10 space-y-3">
          <li className="font-landing-body flex items-center gap-2 text-sm text-white/95">
            <CheckCircle2 className="h-4 w-4 text-gs-orange" />
            Lien sécurisé par email
          </li>
          <li className="font-landing-body flex items-center gap-2 text-sm text-white/95">
            <CheckCircle2 className="h-4 w-4 text-gs-orange" />
            Valide 1 heure
          </li>
        </ul>
      </div>

      <div className="relative flex min-h-0 flex-col overflow-y-auto bg-gs-beige p-6 md:p-10">
        <form action={formAction} className="mt-8 flex max-w-md flex-col">
          <h3 className="font-landing-heading text-xl font-bold text-gs-dark sm:text-2xl">
            Réinitialiser mon mot de passe
          </h3>
          <div className="mt-5 space-y-2">
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Email</label>
            <Input
              type="email"
              placeholder="votre@email.com"
              {...form.register("email")}
              className="h-11 border-gs-line bg-white"
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          {state.success && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {state.success}
            </div>
          )}
          <Button
            type="submit"
            className="font-landing-btn mt-5 h-11 w-full bg-gs-orange text-white transition hover:brightness-105"
          >
            Envoyer le lien
          </Button>
        </form>
        <p className="font-landing-body mt-6 text-center text-sm text-gs-muted">
          <Link href="/auth" className="font-semibold text-gs-orange hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
