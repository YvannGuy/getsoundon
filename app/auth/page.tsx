"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { useTransition, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Search, Building2, ArrowLeft } from "lucide-react";

import { loginAction, signupAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

const signupSchema = z.object({
  firstName: z.string().min(2, "Prénom trop court"),
  lastName: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type LoginSchema = z.infer<typeof loginSchema>;
type SignupSchema = z.infer<typeof signupSchema>;
const initialState: AuthFormState = {};

const features = [
  "Annonces vérifiées",
  "Informations claires",
  "Demandes rapides",
];

function AuthPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"login" | "signup">(
    tabParam === "signup" ? "signup" : "login"
  );

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
      <div className="relative flex flex-col justify-between bg-slate-100 p-8 md:p-10">
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
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <p className="mt-6 text-lg font-semibold text-[#2d435a]">{siteConfig.name}</p>
          <div className="mt-1 h-0.5 w-12 bg-[#2d435a]" />
          <h2 className="mt-6 text-2xl font-bold text-[#2d435a]">
            Bienvenue sur {siteConfig.name}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Trouvez et réservez des salles adaptées à vos événements cultuels.
          </p>
        </div>
        <ul className="relative z-10 mt-8 space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-col bg-white p-6 md:p-10">
        <div className="flex gap-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={cn(
              "pb-3 text-sm font-semibold",
              activeTab === "login"
                ? "border-b-2 border-[#2d435a] text-[#2d435a]"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("signup")}
            className={cn(
              "pb-3 text-sm font-semibold",
              activeTab === "signup"
                ? "border-b-2 border-[#2d435a] text-[#2d435a]"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Créer un compte
          </button>
        </div>

        {activeTab === "login" ? (
          <LoginFormContent onSwitchToSignup={() => setActiveTab("signup")} />
        ) : (
          <SignupFormContent onSwitchToLogin={() => setActiveTab("login")} />
        )}
      </div>
    </div>
  );
}

function LoginFormContent({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const [state, formAction] = useFormState(loginAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginSchema) => {
    const fd = new FormData();
    fd.append("email", values.email);
    fd.append("password", values.password);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex max-w-md flex-col">
      <h3 className="text-xl font-bold text-slate-900">Connexion</h3>
      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input
            placeholder="votre@email.com"
            {...form.register("email")}
            className="h-11 border-slate-200"
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Mot de passe</label>
            <a href="#" className="text-xs font-medium text-[#2d435a] hover:underline">
              Mot de passe oublié ?
            </a>
          </div>
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
        className="mt-5 h-11 w-full bg-[#2d435a] hover:bg-[#243a4d]"
        disabled={isPending}
      >
        {isPending ? "Connexion..." : "Se connecter"}
      </Button>
      <p className="mt-6 text-center text-sm text-slate-500">
        Vous n&apos;avez pas de compte ?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-[#2d435a] hover:underline"
        >
          Créer un compte
        </button>
      </p>
    </form>
  );
}

function SignupFormContent({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [state, formAction] = useFormState(signupAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState<"seeker" | "owner">("seeker");

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: SignupSchema) => {
    const fd = new FormData();
    fd.append("fullName", `${values.firstName} ${values.lastName}`);
    fd.append("email", values.email);
    fd.append("password", values.password);
    fd.append("userType", userType);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex max-w-md flex-col">
      <h3 className="text-xl font-bold text-slate-900">Créer un compte</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Prénom</label>
          <Input placeholder="Votre prénom" {...form.register("firstName")} className="h-11 border-slate-200" />
          {form.formState.errors.firstName && (
            <p className="text-xs text-red-600">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Nom</label>
          <Input placeholder="Votre nom" {...form.register("lastName")} className="h-11 border-slate-200" />
          {form.formState.errors.lastName && (
            <p className="text-xs text-red-600">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700">Email</label>
        <Input placeholder="votre@email.com" {...form.register("email")} className="h-11 border-slate-200" />
        {form.formState.errors.email && (
          <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="mt-4 space-y-2">
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
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            {...form.register("confirmPassword")}
            className="h-11 pr-10 border-slate-200"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <label className="text-sm font-medium text-slate-700">Vous êtes :</label>
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="userType"
              checked={userType === "seeker"}
              onChange={() => setUserType("seeker")}
              className="h-4 w-4 border-slate-300 text-[#2d435a] focus:ring-[#2d435a]"
            />
            <Search className="h-4 w-4 text-slate-500" />
            <span className="text-sm">Je cherche une salle</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="userType"
              checked={userType === "owner"}
              onChange={() => setUserType("owner")}
              className="h-4 w-4 border-slate-300 text-[#2d435a] focus:ring-[#2d435a]"
            />
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-sm">Je possède une salle</span>
          </label>
        </div>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" className="mt-5 h-11 w-full bg-[#2d435a] hover:bg-[#243a4d]" disabled={isPending}>
        {isPending ? "Création..." : "Créer mon compte"}
      </Button>
      <p className="mt-4 text-center text-xs text-slate-500">Création de compte gratuite</p>
      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà inscrit ?{" "}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-[#2d435a] hover:underline">
          Se connecter
        </button>
      </p>
    </form>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-y border-slate-300 bg-[#f1f3f5]">
        <div className="container flex h-14 max-w-[1120px] items-center justify-between">
          <Link href="/" className="text-[34px] leading-none font-semibold text-slate-700 [zoom:0.37]">
            {siteConfig.name}
          </Link>
        </div>
      </header>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center">Chargement...</div>}>
        <AuthPageContent />
      </Suspense>
    </div>
  );
}
