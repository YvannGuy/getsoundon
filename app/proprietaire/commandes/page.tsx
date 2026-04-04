import DashboardMaterielPage from "@/app/dashboard/materiel/page";

// Vue "Mes commandes" unifiée : réutilise l'écran client matériel existant dans l'univers /proprietaire.
export const dynamic = "force-dynamic";

export default function ProprietaireCommandesPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <DashboardMaterielPage {...props} />;
}
