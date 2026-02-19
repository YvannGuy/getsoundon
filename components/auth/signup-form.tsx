"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { signupAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const signupSchema = z.object({
  fullName: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe: 8 caractères minimum"),
});

type SignupSchema = z.infer<typeof signupSchema>;

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction] = useFormState(signupAction, initialState);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: SignupSchema) => {
    const formData = new FormData();
    formData.append("fullName", values.fullName);
    formData.append("email", values.email);
    formData.append("password", values.password);
    startTransition(() => formAction(formData));
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Inscrivez-vous pour gérer vos réservations et vos paiements.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
              Nom complet
            </label>
            <Input id="fullName" type="text" {...form.register("fullName")} />
            {form.formState.errors.fullName && <p className="text-xs text-red-600">{form.formState.errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>}
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer mon compte"}
          </Button>

          <p className="text-sm text-slate-600">
            Déjà inscrit ?{" "}
            <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
