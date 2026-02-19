import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Crown, FileText, Heart, Lock, MessageCircle, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const overviewCards = [
  { label: "Demandes envoyées", value: "12", icon: FileText, color: "text-[#6366f1]", bgColor: "bg-[#6366f1]/10" },
  { label: "Conversations actives", value: "4", icon: MessageCircle, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  { label: "Salles favorites", value: "8", icon: Heart, color: "text-amber-500", bgColor: "bg-amber-100" },
  { label: "Réponses reçues", value: "7", icon: CheckCircle2, color: "text-sky-500", bgColor: "bg-sky-100" },
];

const recentRequests = [
  { salle: "Église Saint-Martin", location: "Paris 15ème", type: "Concert de musique classique", date: "15 Mars 2024", status: "Envoyée", statusColor: "text-emerald-600", image: "/img.png" },
  { salle: "Salle paroissiale Notre-Dame", location: "Lyon 3ème", type: "Exposition d'art", date: "22 Mars 2024", status: "Répondue", statusColor: "text-sky-600", image: "/img2.png" },
  { salle: "Chapelle Sainte-Anne", location: "Marseille 8ème", type: "Conférence spirituelle", date: "10 Avril 2024", status: "En attente", statusColor: "text-amber-600", image: "/img.png" },
  { salle: "Temple Saint-Jean", location: "Bordeaux 1er", type: "Séminaire d'entreprise", date: "18 Avril 2024", status: "Refusée", statusColor: "text-red-600", image: "/img2.png" },
];

const conversations = [
  { name: "Jean Dupont", venue: "Église Saint-Martin", time: "Il y a 2h", preview: "Bonjour, je serais ravi d'accueillir votre événement...", isNew: true },
  { name: "Marc Lefebvre", venue: "Chapelle Sainte-Anne", time: "Hier", preview: "Merci pour votre demande. Pouvez-vous me donner plus de dét...", isNew: false },
  { name: "Thomas Moreau", venue: "Salle paroissiale Notre-Dame", time: "Il y a 3j", preview: "La salle sera disponible pour ces dates. Le tarif est de...", isNew: true },
  { name: "Pierre Martin", venue: "Temple Saint-Pierre", time: "Il y a 5j", preview: "D'accord, je vous envoie le contrat de location par email...", isNew: false },
];

const favorites = [
  { name: "Église Saint-Martin", location: "Paris 15ème", image: "/img.png" },
  { name: "Salle paroissiale Notre-Dame", location: "Lyon 3ème", image: "/img2.png" },
  { name: "Chapelle Sainte-Anne", location: "Marseille 8ème", image: "/img.png" },
  { name: "Temple Saint-Jean", location: "Bordeaux 1er", image: "/img2.png" },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-slate-500">Suivez vos recherches et demandes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Pass 24h actif</p>
                    <p className="text-sm text-white/80">Expire dans : 18h</p>
                  </div>
                </div>
                <p className="max-w-[200px] text-right text-sm text-white/90">
                  Les Pass permettent d&apos;envoyer des demandes illimitées
                </p>
              </div>
              <Button className="mt-4 flex items-center gap-2 bg-white text-[#6366f1] hover:bg-white/90">
                <Lock className="h-4 w-4" />
                Prolonger mon accès
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Paiement & accès</CardTitle>
              <Link href="/dashboard/paiement" className="text-sm font-medium text-[#6366f1] hover:underline">
                Voir tout
              </Link>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">Pass 24h</p>
                  <p className="text-sm text-slate-500">15 Fév 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">8,80€</p>
                  <p className="text-sm text-emerald-600">Payé</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">Pass 7 jours</p>
                  <p className="text-sm text-slate-500">8 Fév 2024</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">29,90€</p>
                  <p className="text-sm text-emerald-600">Payé</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Mon Pass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-gradient-to-br from-[#6366f1]/10 to-[#4f46e5]/10 p-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-[#6366f1]" />
                <div>
                  <p className="font-semibold text-slate-900">Pass 24h actif</p>
                  <p className="text-sm text-slate-500">18h restantes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Demandes récentes</CardTitle>
          <Link href="/dashboard/demandes" className="text-sm font-medium text-[#6366f1] hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Salle</th>
                  <th className="pb-3 pr-4">Type d&apos;événement</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Statut</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <tr key={req.salle + req.date} className="group">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <Image src={req.image} alt="" fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{req.salle}</p>
                          <p className="text-sm text-slate-500">{req.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600">{req.type}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600">{req.date}</td>
                    <td className="py-4 pr-4">
                      <span className={`text-sm font-medium ${req.statusColor}`}>• {req.status}</span>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <Link href="/dashboard/messagerie" className="text-sm font-medium text-[#6366f1] hover:underline">
              Ouvrir la messagerie →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversations.map((conv) => (
                <div
                  key={conv.name + conv.venue}
                  className="flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                    {conv.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{conv.name}</p>
                      <span className="text-xs text-slate-400">{conv.time}</span>
                    </div>
                    <p className="text-xs text-slate-500">{conv.venue}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{conv.preview}</p>
                    {conv.isNew && (
                      <span className="mt-1 inline-block text-xs font-medium text-emerald-600">
                        • Nouveau message
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Favoris</CardTitle>
            <Link href="/dashboard/favoris" className="text-sm font-medium text-[#6366f1] hover:underline">
              Voir mes favoris →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {favorites.map((fav) => (
                <div
                  key={fav.name}
                  className="relative h-32 w-44 shrink-0 overflow-hidden rounded-xl border border-slate-200"
                >
                  <Image src={fav.image} alt="" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-medium text-white">{fav.name}</p>
                    <p className="text-xs text-white/80">{fav.location}</p>
                  </div>
                  <button className="absolute right-2 top-2 text-white hover:text-red-400">
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Link
        href="/"
        className="fixed bottom-8 right-8 flex items-center gap-2 rounded-full bg-[#6366f1] px-6 py-3 text-white shadow-lg hover:bg-[#4f46e5]"
      >
        <Search className="h-5 w-5" />
        Nouvelle recherche
      </Link>
    </div>
  );
}
