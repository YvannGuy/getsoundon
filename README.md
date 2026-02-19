# Boilerplate Next.js + Stripe + Supabase

Projet Next.js 14 (App Router) en TypeScript avec :

- Tailwind CSS
- Composants shadcn/ui (Button, Card, Accordion, Input, Select)
- Stripe (Checkout + Webhook)
- Supabase (Auth + DB)

## Lancer le projet

1. Copier `.env.example` vers `.env.local`
2. Renseigner les variables Supabase et Stripe
3. Installer et lancer :

```bash
npm install
npm run dev
```

## SQL Supabase

Exécutez le script `config/supabase.sql` dans l'éditeur SQL Supabase pour :

- créer la table `profiles`
- activer les policies RLS
- créer un trigger qui crée automatiquement le profil à l'inscription

## Routes principales

- `/` landing page
- `/pricing`
- `/login`
- `/signup`
- `/dashboard` (protégé via middleware)
- `/api/stripe/checkout`
- `/api/stripe/webhook`
