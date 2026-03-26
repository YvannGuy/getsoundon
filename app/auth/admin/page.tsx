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
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

type LoginSchema = z.infer<typeof loginSchema>;
const initialState: AuthFormState = {};

const features = [
  "Annonces vérifiées",
  "Informations claires",
  "Demandes rapides",
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
      <div className="relative flex flex-col justify-start gap-8 bg-slate-100 p-8 md:p-10">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/img.png"
            alt=""
            fill
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <p className="mt-6 text-lg font-semibold text-black">{siteConfig.name}</p>
          <div className="mt-1 h-0.5 w-12 bg-[#213398]" />
          <h2 className="mt-6 flex items-center gap-2 text-2xl font-bold text-black">
            <Shield className="h-7 w-7" />
            Espace administrateur
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Connexion réservée aux administrateurs pour gérer et valider les annonces.
          </p>
        </div>
        <ul className="relative z-10 space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-col justify-center bg-white p-6 md:p-10">
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto flex max-w-md flex-col">
          <h3 className="text-xl font-bold text-black">Connexion admin</h3>
          <p className="mt-1 text-sm text-slate-500">
            Utilisez vos identifiants administrateur
          </p>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                placeholder="admin@getsoundon.com"
                {...form.register("email")}
                className="h-11 border-slate-200"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...form.register("password")}
                  className="h-11 pr-10 border-slate-200"
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
          </div>
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          <Button
            type="submit"
            className="mt-5 h-11 w-full bg-[#213398] hover:bg-[#1a2980]"
            disabled={isPending}
          >
            {isPending ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AdminAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-slate-100" />
          <div className="bg-white" />
        </div>
      }
    >
      <AdminAuthPageContent />
    </Suspense>
  );
}
