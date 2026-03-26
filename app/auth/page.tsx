"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useTransition, useState, Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Package, Warehouse, ArrowLeft } from "lucide-react";

import { loginAction, signupAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { LANDING_HERO_IMAGE_URL } from "@/lib/landing-assets";
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
  "Matériel entre particuliers et pros",
  "Paiements et caution encadrés",
  "Réservation simple, en ligne",
];

function AuthPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const userTypeParam = searchParams.get("userType");
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "";
  const suspended = searchParams.get("suspended") === "1";
  const resetSuccess = searchParams.get("reset") === "success";
  const initialUserType = userTypeParam === "owner" ? "owner" : undefined;
  const [activeTab, setActiveTab] = useState<"login" | "signup">(
    tabParam === "signup" ? "signup" : "login"
  );

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
            {siteConfig.description}
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

      <div className="relative flex flex-col bg-gs-beige p-6 md:p-10">
        {resetSuccess && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.
          </div>
        )}
        {suspended && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Votre compte a été suspendu. Contactez l&apos;administrateur pour plus d&apos;informations.
          </div>
        )}
        <div className="flex gap-6 border-b border-gs-line">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={cn(
              "font-landing-nav pb-3 text-sm font-semibold",
              activeTab === "login"
                ? "border-b-2 border-gs-orange text-gs-dark"
                : "text-gs-muted hover:text-gs-dark"
            )}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("signup")}
            className={cn(
              "font-landing-nav pb-3 text-sm font-semibold",
              activeTab === "signup"
                ? "border-b-2 border-gs-orange text-gs-dark"
                : "text-gs-muted hover:text-gs-dark"
            )}
          >
            Créer un compte
          </button>
        </div>

        {activeTab === "login" ? (
          <LoginFormContent redirectedFrom={redirectedFrom} onSwitchToSignup={() => setActiveTab("signup")} />
        ) : (
          <SignupFormContent redirectedFrom={redirectedFrom} onSwitchToLogin={() => setActiveTab("login")} initialUserType={initialUserType} />
        )}
      </div>
    </div>
  );
}

function LoginFormContent({ redirectedFrom, onSwitchToSignup }: { redirectedFrom: string; onSwitchToSignup: () => void }) {
  const [state, formAction] = useActionState(loginAction, initialState);
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
    if (redirectedFrom) fd.append("redirectedFrom", redirectedFrom);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex max-w-md flex-col">
      <h3 className="font-landing-heading text-xl font-bold text-gs-dark sm:text-2xl">Connexion</h3>
      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <label className="font-landing-nav text-sm font-medium text-gs-dark">Email</label>
          <Input
            placeholder="votre@email.com"
            {...form.register("email")}
            className="h-11 border-gs-line bg-white"
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-landing-nav text-sm font-medium text-gs-dark">Mot de passe</label>
            <Link
              href="/auth/mot-de-passe-oublie"
              className="font-landing-nav text-xs font-medium text-gs-orange hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
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
        Vous n&apos;avez pas de compte ?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-gs-orange hover:underline"
        >
          Créer un compte
        </button>
      </p>
    </form>
  );
}

function SignupFormContent({ redirectedFrom, onSwitchToLogin, initialUserType }: { redirectedFrom: string; onSwitchToLogin: () => void; initialUserType?: "seeker" | "owner" }) {
  const router = useRouter();
  const [state, formAction] = useActionState(signupAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState<"seeker" | "owner">(initialUserType ?? "seeker");

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state.redirectTo, router]);

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
    if (redirectedFrom) fd.append("redirectedFrom", redirectedFrom);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex max-w-md flex-col">
      <h3 className="font-landing-heading text-xl font-bold text-gs-dark sm:text-2xl">Créer un compte</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="font-landing-nav text-sm font-medium text-gs-dark">Prénom</label>
          <Input
            placeholder="Votre prénom"
            {...form.register("firstName")}
            className="h-11 border-gs-line bg-white"
          />
          {form.formState.errors.firstName && (
            <p className="text-xs text-red-600">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="font-landing-nav text-sm font-medium text-gs-dark">Nom</label>
          <Input placeholder="Votre nom" {...form.register("lastName")} className="h-11 border-gs-line bg-white" />
          {form.formState.errors.lastName && (
            <p className="text-xs text-red-600">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <label className="font-landing-nav text-sm font-medium text-gs-dark">Email</label>
        <Input placeholder="votre@email.com" {...form.register("email")} className="h-11 border-gs-line bg-white" />
        {form.formState.errors.email && (
          <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="mt-4 space-y-2">
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
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            {...form.register("confirmPassword")}
            className="h-11 border-gs-line bg-white pr-10"
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
        <label className="font-landing-nav text-sm font-medium text-gs-dark">Vous êtes :</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="userType"
              checked={userType === "seeker"}
              onChange={() => setUserType("seeker")}
              className="h-4 w-4 border-gs-line accent-gs-orange focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
            />
            <Package className="h-4 w-4 shrink-0 text-gs-muted" aria-hidden />
            <span className="font-landing-body text-sm text-gs-dark">Je loue du matériel</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="userType"
              checked={userType === "owner"}
              onChange={() => setUserType("owner")}
              className="h-4 w-4 border-gs-line accent-gs-orange focus:outline-none focus:ring-2 focus:ring-gs-orange/40"
            />
            <Warehouse className="h-4 w-4 shrink-0 text-gs-muted" aria-hidden />
            <span className="font-landing-body text-sm text-gs-dark">Je possède du matériel</span>
          </label>
        </div>
      </div>
      <p className="font-landing-body mt-5 text-xs leading-relaxed text-gs-dark/80 sm:text-sm">
        En créant mon compte, j&apos;accepte les{" "}
        <Link href="/cgv" className="font-medium text-gs-orange underline-offset-2 hover:underline">
          conditions générales
        </Link>
        , la{" "}
        <Link href="/confidentialite" className="font-medium text-gs-orange underline-offset-2 hover:underline">
          politique de confidentialité
        </Link>{" "}
        et les{" "}
        <Link href="/cgu" className="font-medium text-gs-orange underline-offset-2 hover:underline">
          CGU
        </Link>
        .
      </p>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-emerald-600">{state.success}</p>}
      <Button
        type="submit"
        className="font-landing-btn mt-5 h-11 w-full bg-gs-orange text-white transition hover:brightness-105"
        disabled={isPending}
      >
        {isPending ? "Création..." : "Créer mon compte"}
      </Button>
      <p className="font-landing-body mt-4 text-center text-xs text-gs-muted">Création de compte gratuite</p>
      <p className="font-landing-body mt-6 text-center text-sm text-gs-muted">
        Déjà inscrit ?{" "}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-gs-orange hover:underline">
          Se connecter
        </button>
      </p>
    </form>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gs-beige">
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center">Chargement...</div>}>
        <AuthPageContent />
      </Suspense>
    </div>
  );
}
