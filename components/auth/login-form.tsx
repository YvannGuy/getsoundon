"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

type LoginSchema = z.infer<typeof loginSchema>;

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginSchema) => {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    startTransition(() => formAction(formData));
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Connectez-vous pour accéder à votre dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Connexion..." : "Se connecter"}
          </Button>

          <p className="text-sm text-slate-600">
            Pas encore de compte ?{" "}
            <Link href="/auth?tab=signup" className="font-medium text-black underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
