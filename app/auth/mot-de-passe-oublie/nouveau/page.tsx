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
        <div className="relative flex flex-col justify-center bg-slate-100 p-8 md:p-10">
          <div className="absolute inset-0 overflow-hidden">
            <Image src="/img.png" alt="" fill className="object-cover opacity-20" />
          </div>
          <div className="relative z-10">
            <p className="text-lg font-semibold text-black">{siteConfig.name}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center bg-white p-8">
          <h2 className="text-xl font-bold text-black">Lien expiré ou invalide</h2>
          <p className="mt-3 text-slate-600">
            Ce lien de réinitialisation n&apos;est plus valide. Demandez un nouveau lien pour réinitialiser votre mot de passe.
          </p>
          <Link
            href="/auth/mot-de-passe-oublie"
            className="mt-6 inline-flex w-fit items-center justify-center rounded-md bg-[#213398] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2980]"
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
        <div className="relative flex flex-col justify-center bg-slate-100 p-8 md:p-10">
          <div className="absolute inset-0 overflow-hidden">
            <Image src="/img.png" alt="" fill className="object-cover opacity-20" />
          </div>
          <div className="relative z-10">
            <p className="text-lg font-semibold text-black">{siteConfig.name}</p>
            <p className="mt-4 text-slate-600">Vérification du lien en cours...</p>
          </div>
        </div>
        <div className="flex items-center justify-center bg-white p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#213398] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
      <div className="relative flex flex-col justify-start gap-8 bg-slate-100 p-8 md:p-10">
        <div className="absolute inset-0 overflow-hidden">
          <Image src="/img.png" alt="" fill className="object-cover opacity-20" />
        </div>
        <div className="relative z-10">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
          <p className="mt-6 text-lg font-semibold text-black">{siteConfig.name}</p>
          <div className="mt-1 h-0.5 w-12 bg-[#213398]" />
          <h2 className="mt-6 text-2xl font-bold text-black">Nouveau mot de passe</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères.
          </p>
        </div>
        <ul className="relative z-10 space-y-3">
          <li className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />
            8 caractères minimum
          </li>
        </ul>
      </div>

      <div className="relative flex flex-col bg-white p-6 md:p-10">
        <form
          className="mt-8 flex max-w-md flex-col"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <h3 className="text-xl font-bold text-black">Définir mon mot de passe</h3>
          <div className="mt-5 space-y-2">
            <label className="text-sm font-medium text-slate-700">Nouveau mot de passe</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...form.register("password")}
                className="h-11 border-slate-200 pr-10"
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
            <label className="text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
            <Input
              type="password"
              placeholder="••••••••"
              {...form.register("confirmPassword")}
              className="h-11 border-slate-200"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          <Button
            type="submit"
            className="mt-5 h-11 w-full bg-[#213398] hover:bg-[#1a2980]"
            disabled={isPending}
          >
            {isPending ? "Changement en cours..." : "Changer le mot de passe"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/auth" className="font-semibold text-black hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
