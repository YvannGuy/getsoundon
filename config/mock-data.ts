import { Building2, CalendarClock, ShieldCheck } from "lucide-react";

export const stats = [
  { label: "Salles référencées", value: "260+" },
  { label: "Demandes traitées", value: "12k+" },
  { label: "Villes couvertes", value: "90+" },
];

export const features = [
  {
    title: "Demandes qualifiées",
    description: "Recevez des demandes structurées selon votre capacité, votre localisation et vos disponibilités.",
    icon: Building2,
  },
  {
    title: "Mise en relation rapide",
    description: "Filtrez les salles en quelques clics pour identifier les meilleures options selon vos besoins.",
    icon: CalendarClock,
  },
  {
    title: "Données sécurisées",
    description: "Gestion des comptes et des paiements avec des outils robustes et reconnus.",
    icon: ShieldCheck,
  },
];

export const steps = [
  {
    title: "Décrivez votre besoin",
    description: "Indiquez ville, capacité, budget et date cible.",
  },
  {
    title: "Filtrez les salles",
    description: "Comparez les offres et sélectionnez les lieux adaptés.",
  },
  {
    title: "Validez votre réservation",
    description: "Confirmez avec un paiement sécurisé et suivez depuis le dashboard.",
  },
];

export const faqItems = [
  {
    question: "Comment fonctionne la mise en relation ?",
    answer: "Vous publiez une demande puis les salles compatibles vous répondent avec leurs disponibilités et tarifs.",
  },
  {
    question: "Puis-je annuler un abonnement ?",
    answer: "Oui, vous pouvez annuler à tout moment depuis votre espace client. L'accès reste actif jusqu'à la fin de la période.",
  },
  {
    question: "La plateforme couvre-t-elle toute la France ?",
    answer: "Le service est disponible partout en France métropolitaine avec une couverture renforcée dans les grandes agglomérations.",
  },
  {
    question: "Quels moyens de paiement sont acceptés ?",
    answer: "Les paiements sont traités par Stripe. Les cartes Visa, Mastercard et American Express sont supportées.",
  },
];
