import Link from "next/link";
import { Package, Users, Headphones, Ban, Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: newUsers7 },
    { count: openIncidents },
    { count: pendingCancels },
    { count: bookings30 },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("gs_bookings").select("id", { count: "exact", head: true }).eq("incident_status", "open"),
    admin
      .from("gs_booking_cancellation_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin.from("gs_bookings").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
  ]);

  let conciergeNew = 0;
  try {
    const { count } = await admin
      .from("concierge_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    conciergeNew = count ?? 0;
  } catch {
    /* optional table */
  }

  const links = [
    { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, hint: "Comptes et suspension" },
    { href: "/admin/incidents-materiel", label: "Incidents matériel", icon: Package, hint: "Litiges gs_bookings" },
    { href: "/admin/materiel-annulations", label: "Annulations matériel", icon: Ban, hint: "Demandes locataires" },
    { href: "/admin/conciergerie", label: "Conciergerie", icon: Headphones, hint: "Briefs accompagnement" },
    { href: "/admin/parametres", label: "Paramètres", icon: Settings, hint: "Plateforme" },
  ];

  return (
    <div className="space-y-6 p-4 pb-24 md:space-y-8 md:p-8 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-black md:text-2xl">Dashboard admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Outils actifs pour le flux matériel (catalogue, réservations, paiements Stripe côté gs_*).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-sky-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Nouveaux comptes (7 j.)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{newUsers7 ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Incidents ouverts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{openIncidents ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Annulations en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{pendingCancels ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Réservations matériel (30 j.)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-black">{bookings30 ?? 0}</p>
            <p className="text-xs text-slate-500">Tous statuts (volume)</p>
          </CardContent>
        </Card>
      </div>

      {conciergeNew > 0 && (
        <Card className="border-amber-200 bg-amber-50/80 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-amber-900">
              <strong>{conciergeNew}</strong> demande(s) conciergerie « new »
            </p>
            <Link
              href="/admin/conciergerie"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Traiter
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Accès rapides</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map(({ href, label, icon: Icon, hint }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <Icon className="h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-semibold text-black">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
