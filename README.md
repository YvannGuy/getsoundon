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

## Supabase Auth (inscription propriétaire)

Pour que la redirection vers l'onboarding fonctionne après création de compte « Je possède une salle », désactivez la confirmation email en développement : **Supabase Dashboard → Authentication → Providers → Email** → décochez « Confirm email ». Sinon l'utilisateur doit d'abord confirmer son email avant d'accéder à l'onboarding.

## SQL Supabase

Exécutez le script `config/supabase.sql` dans l'éditeur SQL Supabase pour :

- créer la table `profiles`
- activer les policies RLS
- créer un trigger qui crée automatiquement le profil à l'inscription

## Storage Supabase (photos onboarding)

1. Ajoutez `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` (clé depuis Supabase → Settings → API)
2. Créez le bucket : `npm run supabase:init-storage`
3. Exécutez `config/supabase-storage.sql` dans l'éditeur SQL Supabase pour les politiques RLS

## Pièces jointes messagerie

1. Créez le bucket : `npm run supabase:init-message-storage`
2. Exécutez `config/supabase-message-attachments.sql` dans l'éditeur SQL Supabase (table `message_attachments` + politiques storage)

## Éditer / supprimer les messages

Exécutez `config/supabase-messages-edit-delete.sql` dans l'éditeur SQL Supabase pour ajouter les colonnes `edited_at` et `deleted_at` à la table `messages`.

## Archiver / supprimer les conversations

Exécutez `config/supabase-user-conversation-preferences.sql` dans l'éditeur SQL Supabase pour créer la table `user_conversation_preferences` (archiver, relancer, supprimer définitivement).

## Table salles

Exécutez `config/supabase-salles.sql` dans l'éditeur SQL Supabase pour créer la table des annonces.

## Tables complètes (demandes, favoris, messagerie, abonnements)

Exécutez `config/supabase-tables-complete.sql` après les scripts ci-dessus.

Puis `config/supabase-demandes-alter.sql` pour les colonnes du formulaire « Vérifier la disponibilité » (frequence, horaires).

## Offres & Stripe Connect Express

Exécutez `config/supabase-offers-connect.sql` dans l'éditeur SQL Supabase pour :

- ajouter `stripe_account_id` à la table `profiles` (compte Connect des propriétaires)
- créer la table `offers` (offres de réservation owner → seeker)
- ajouter `offer_id` à la table `payments` (lien paiement ↔ offre)

Puis `config/supabase-offers-alter-event-type.sql` pour ajouter le type d'évènement (ponctuel/mensuel) et la période valable (date_debut, date_fin).

**Contrats & factures** :
- `config/supabase-contract-templates.sql` : table `contract_templates` (modèle par salle)
- `config/supabase-offers-contract.sql` : colonne `contract_path` sur `offers`
- `config/supabase-payments-invoice.sql` : colonne `invoice_path` sur `payments`
- `npm run supabase:init-contract-storage` : bucket storage `contrats` (contrats + factures PDF)
- Le propriétaire remplit les infos contrat dans `/proprietaire/contrat`. L'organisateur lit le contrat avant de payer, coche l'acceptation, puis paie. Contrat et facture sont générés après paiement.

Crée les tables :

- **profiles** (colonnes user_type, phone, avatar_url, stripe_customer_id)
- **salles** (colonnes heure_debut, heure_fin, jours_ouverture, evenements_acceptes, places_parking)
- **demandes** (demandes de réservation organisateur → propriétaire)
- **favoris** (salles sauvegardées)
- **subscriptions** (abonnements Stripe)
- **credits_usage** (historique crédits)
- **conversations** + **messages** (messagerie)
- **salle_views** (stats de consultation)

Les salles créées via l'onboarding ont le statut `pending`. Pour les afficher en recherche, mettez `status = 'approved'` dans le Dashboard Supabase.

## Déploiement Vercel

**Important** : configurez les variables d'environnement dans Vercel (Settings → Environment Variables) :

- `NEXT_PUBLIC_SUPABASE_URL` – URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Clé anonyme Supabase
- Optionnel : `NEXT_PUBLIC_SITE_URL` (ex: `https://votredomaine.com`)

Sans ces variables, le site renvoie une erreur 500 (le proxy Supabase ne peut pas s'initialiser).

## Admin Dashboard

1. Ajoutez `ADMIN_EMAILS` dans `.env.local` : liste d'emails séparés par des virgules (ex: `admin@example.com,autre@example.com`)
2. Accédez à `/auth/admin` pour vous connecter
3. Les utilisateurs dont l'email figure dans `ADMIN_EMAILS` peuvent valider les annonces depuis `/admin`

## Routes principales

- `/` landing page
- `/pricing`
- `/login`
- `/signup`
- `/dashboard` (protégé via middleware)
- `/api/stripe/checkout`
- `/api/stripe/webhook`
