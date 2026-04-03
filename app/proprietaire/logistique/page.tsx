import Link from "next/link";

/** TODO: brancher une vue logistique dédiée (créneaux livraison / retrait) ; MVP : point d’entrée + lien réservations */
export default function ProprietaireLogistiquePage() {
  return (
    <div className="space-y-4 p-6 md:p-8">
      <h1 className="font-landing-heading text-2xl font-bold text-gs-dark">Livraisons & retraits</h1>
      <p className="font-landing-body max-w-2xl text-sm text-slate-600">
        Centralisez ici le suivi des retraits et livraisons liés à vos locations. Le détail opérationnel (check-in,
        check-out, messages) est disponible dans <strong>Locations matériel</strong>.
      </p>
      <Link href="/proprietaire/materiel" className="inline-flex text-sm font-semibold text-gs-orange hover:underline">
        Ouvrir Locations matériel
      </Link>
    </div>
  );
}
