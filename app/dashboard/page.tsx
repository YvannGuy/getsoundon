import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="container py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <form action={signOutAction}>
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Se déconnecter
          </button>
        </form>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Bienvenue {profile?.full_name ?? "sur votre espace"}</CardTitle>
          <CardDescription>Voici les informations de votre compte Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Email :</span> {profile?.email ?? user.email}
          </p>
          <p>
            <span className="font-medium text-slate-900">ID utilisateur :</span> {user.id}
          </p>
          <p>
            <span className="font-medium text-slate-900">Créé le :</span>{" "}
            {profile?.created_at ? new Date(profile.created_at).toLocaleString("fr-FR") : "N/A"}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
