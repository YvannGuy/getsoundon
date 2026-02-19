import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Clock, FolderOpen, Plus, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Demandes reçues", value: "8", icon: FolderOpen, color: "text-[#6366f1]", bgColor: "bg-[#6366f1]/10" },
  { label: "Annonces actives", value: "5", icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  { label: "En validation", value: "2", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100" },
  { label: "Taux de réponse", value: "94%", icon: Star, color: "text-sky-500", bgColor: "bg-sky-100" },
];

const annonces = [
  { name: "Église Saint-Martin", location: "Paris 15ème", status: "Active", statusColor: "text-emerald-600", image: "/img.png" },
  { name: "Salle paroissiale Notre-Dame", location: "Lyon 3ème", status: "En validation", statusColor: "text-amber-600", image: "/img2.png" },
  { name: "Chapelle Sainte-Anne", location: "Marseille 8ème", status: "Active", statusColor: "text-emerald-600", image: "/img.png" },
];

const demandes = [
  { name: "Marie Leclerc", email: "marie@example.com", type: "Concert de musique classique", date: "15 Mars 2024", status: "Nouvelle", statusColor: "text-emerald-600" },
  { name: "Pierre Martin", email: "pierre@example.com", type: "Exposition d'art contemporain", date: "22 Mars 2024", status: "En attente", statusColor: "text-amber-600" },
  { name: "Sophie Bernard", email: "sophie@example.com", type: "Conférence spirituelle", date: "10 Avril 2024", status: "Répondue", statusColor: "text-sky-600" },
];

export default function ProprietaireDashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-slate-500">Gérez vos annonces et vos demandes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.bgColor}`}>
                  <Icon className={`h-6 w-6 ${m.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{m.value}</p>
                  <p className="text-sm text-slate-500">{m.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Mes annonces</CardTitle>
          <Link href="/proprietaire/annonces" className="text-sm font-medium text-[#6366f1] hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {annonces.map((a) => (
              <div
                key={a.name}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="relative h-40">
                  <Image src={a.image} alt="" fill className="object-cover" />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-slate-900">{a.name}</p>
                  <p className="text-sm text-slate-500">{a.location}</p>
                  <span className={`mt-2 inline-block text-sm font-medium ${a.statusColor}`}>
                    • {a.status}
                  </span>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-slate-300">
                      Voir
                    </Button>
                    <Button size="sm" className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5]">
                      Modifier
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Demandes récentes</CardTitle>
          <Link href="/proprietaire/demandes" className="text-sm font-medium text-[#6366f1] hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Organisateur</th>
                  <th className="pb-3 pr-4">Type d&apos;événement</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Statut</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demandes.map((d) => (
                  <tr key={d.name + d.date} className="group">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{d.name}</p>
                          <p className="text-sm text-slate-500">{d.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600">{d.type}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600">{d.date}</td>
                    <td className="py-4 pr-4">
                      <span className={`text-sm font-medium ${d.statusColor}`}>• {d.status}</span>
                    </td>
                    <td className="py-4">
                      <Link href="#" className="text-sm font-medium text-[#6366f1] hover:underline">
                        Voir la demande
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/onboarding/salle"
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#6366f1] text-white shadow-lg hover:bg-[#4f46e5]"
        title="Nouvelle annonce"
      >
        <Plus className="h-7 w-7" />
      </Link>
    </div>
  );
}
