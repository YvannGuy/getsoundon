"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, ArrowLeft, Shield } from "lucide-react";

import { loginAdminAction, type AuthFormState } from "@/app/actions/auth-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { LANDING_HERO_IMAGE_URL } from "@/lib/landing-assets";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

type LoginSchema = z.infer<typeof loginSchema>;
const initialState: AuthFormState = {};

const features = [
  "Utilisateurs, suspension et rôles",
  "Incidents et annulations sur les réservations matériel",
  "Conciergerie et paramètres plateforme",
];

function AdminAuthPageContent() {
  const [state, formAction] = useActionState(loginAdminAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginSchema) => {
    const fd = new FormData();
    fd.append("email", values.email);
    fd.append("password", values.password);
    fd.append("redirectTo", searchParams.get("redirectedFrom") ?? "/admin");
    startTransition(() => formAction(fd));
  };

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
            href="/"
            className="font-landing-nav inline-flex items-center gap-2 text-sm font-medium text-white/90 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Retour à l&apos;accueil
          </Link>
          <h2 className="font-landing-heading mt-6 flex flex-nowrap items-center gap-2 text-lg font-bold text-white sm:gap-2.5 sm:text-xl md:text-2xl">
            <span className="inline-flex shrink-0 items-center gap-2">
              <Shield className="h-7 w-7 shrink-0 text-white/95" strokeWidth={1.75} aria-hidden />
              <span className="whitespace-nowrap">Administration</span>
            </span>
            <span className="hidden text-white/40 sm:inline">·</span>
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
            Connexion réservée à l’équipe : suivi des comptes, litiges location matériel, demandes
            d’accompagnement et configuration.
          </p>
        </div>
        <ul className="relative z-10 space-y-3">
          {features.map((f) => (
            <li key={f} className="font-landing-body flex items-center gap-2 text-sm text-white/95">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gs-orange" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex min-h-0 flex-col justify-center overflow-y-auto bg-gs-beige p-6 md:p-10">
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto flex w-full max-w-md flex-col">
          <h3 className="font-landing-heading text-xl font-bold text-gs-dark sm:text-2xl">Connexion admin</h3>
          <p className="font-landing-body mt-1 text-sm text-gs-muted">
            Identifiants administrateur uniquement
          </p>
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <label className="font-landing-nav text-sm font-medium text-gs-dark">Email</label>
              <Input
                placeholder="admin@getsoundon.com"
                {...form.register("email")}
                className="h-11 border-gs-line bg-white"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="font-landing-nav text-sm font-medium text-gs-dark">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...form.register("password")}
                  className="h-11 border-gs-line bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>
          </div>
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          <Button
            type="submit"
            className="font-landing-btn mt-5 h-11 w-full bg-gs-orange text-white transition hover:brightness-105"
            disabled={isPending}
          >
            {isPending ? "Connexion..." : "Se connecter"}
          </Button>
          <p className="font-landing-body mt-6 text-center text-sm text-gs-muted">
            Accès utilisateur ?{" "}
            <Link href="/auth" className="font-semibold text-gs-orange hover:underline">
              Connexion classique
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function AdminAuthPage() {
  return (
    <div className="min-h-screen bg-gs-beige">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gs-beige font-landing-body text-gs-muted">
            Chargement...
          </div>
        }
      >
        <AdminAuthPageContent />
      </Suspense>
    </div>
  );
}
