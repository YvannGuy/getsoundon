import Link from "next/link";

/** TODO: brancher une vue logistique dédiée (créneaux livraison / retrait) ; MVP : point d’entrée + lien réservations */
export default function ProprietaireLogistiquePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-black">Livraisons & retraits</h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        Centralisez ici le suivi des retraits et livraisons liés à vos locations. Le détail opérationnel (check-in,
        check-out, messages) est dans <strong className="font-semibold text-slate-700">Mes commandes</strong> /{" "}
        <strong className="font-semibold text-slate-700">Réservations</strong>.
      </p>
      <Link
        href="/proprietaire/commandes"
        className="mt-4 inline-flex text-sm font-semibold text-gs-orange hover:underline"
      >
        Ouvrir mes commandes →
      </Link>
    </div>
  );
}
