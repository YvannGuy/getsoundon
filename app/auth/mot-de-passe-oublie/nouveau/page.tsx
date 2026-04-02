"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useTransition, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { updatePasswordAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { LANDING_HERO_IMAGE_URL } from "@/lib/landing-assets";
import { siteConfig } from "@/config/site";

const schema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type Schema = z.infer<typeof schema>;
const initialState: AuthFormState = {};

function AuthSidePanel({
  subtitle,
}: {
  subtitle: string;
}) {
  return (
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
        <p className="font-landing-body mt-3 max-w-md text-sm leading-relaxed text-white/90">{subtitle}</p>
      </div>
      <ul className="relative z-10 space-y-3">
        <li className="font-landing-body flex items-center gap-2 text-sm text-white/95">
          <CheckCircle2 className="h-4 w-4 text-gs-orange" />
          Mot de passe sécurisé
        </li>
      </ul>
    </div>
  );
}

export default function NouveauMotDePassePage() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [isReady, setIsReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let sub: { unsubscribe: () => void } | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        readyRef.current = true;
        setIsReady(true);
        return;
      }
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || session?.user) {
          readyRef.current = true;
          clearTimeout(timeoutId);
          setIsReady(true);
        }
      });
      sub = data.subscription;
      timeoutId = setTimeout(() => {
        if (!readyRef.current) setLinkExpired(true);
      }, 4000);
    });

    return () => {
      clearTimeout(timeoutId);
      sub?.unsubscribe();
    };
  }, []);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = (values: Schema) => {
    const fd = new FormData();
    fd.append("password", values.password);
    startTransition(() => formAction(fd));
  };

  if (linkExpired) {
    return (
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
        <AuthSidePanel subtitle="Le lien de réinitialisation semble expiré ou invalide." />
        <div className="relative flex min-h-0 flex-col justify-center overflow-y-auto bg-gs-beige p-6 md:p-10">
          <h2 className="font-landing-heading text-xl font-bold text-gs-dark sm:text-2xl">
            Lien expiré ou invalide
          </h2>
          <p className="font-landing-body mt-3 text-gs-muted">
            Ce lien de réinitialisation n&apos;est plus valide. Demandez un nouveau lien pour réinitialiser votre mot de passe.
          </p>
          <Link
            href="/auth/mot-de-passe-oublie"
            className="font-landing-btn mt-6 inline-flex h-11 w-fit items-center justify-center rounded-lg bg-gs-orange px-5 text-sm font-medium text-white transition hover:brightness-105"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
        <AuthSidePanel subtitle="Vérification du lien de récupération en cours..." />
        <div className="relative flex min-h-0 items-center justify-center overflow-y-auto bg-gs-beige p-6 md:p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gs-orange border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
      <AuthSidePanel subtitle="Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères." />

      <div className="relative flex min-h-0 flex-col overflow-y-auto bg-gs-beige p-6 md:p-10">
        <form
          className="mt-8 flex max-w-md flex-col"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <h3 className="font-landing-heading text-xl font-bold text-gs-dark sm:text-2xl">
            Définir mon mot de passe
          </h3>
          <div className="mt-5 space-y-2">
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Nouveau mot de passe</label>
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
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Confirmer le mot de passe</label>
            <Input
              type="password"
              placeholder="••••••••"
              {...form.register("confirmPassword")}
              className="h-11 border-gs-line bg-white"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          <Button
            type="submit"
            className="font-landing-btn mt-5 h-11 w-full bg-gs-orange text-white transition hover:brightness-105"
            disabled={isPending}
          >
            {isPending ? "Changement en cours..." : "Changer le mot de passe"}
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
