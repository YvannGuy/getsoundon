# Constitution sécurité — GetSoundOn

Document prescriptif. Toute évolution du produit doit rester compatible avec ces règles.

## Principes non négociables

1. **Auth ≠ autorisation** : être connecté ne suffit pas. Chaque mutation ou lecture sensible vérifie le droit métier (rôle, ownership, statut réservation, etc.).
2. **Ne jamais faire confiance au client** pour : prix, montants, `user_id` cible, rôles, `owner_id`, statuts de booking, permissions admin, métadonnées Stripe « magiques ».
3. **Serveur = source de vérité** : valider avec **Zod** (ou équivalent) sur la route handler / server action ; recalculer les montants côté serveur à partir des données DB + règles métier.
4. **RLS** : toute table exposée aux utilisateurs finaux a une stratégie RLS explicite avant mise en prod. Pas de table « user-facing » sans policy documentée.
5. **Storage** : buckets sensibles **privés** ; lecture via **signed URL courte** ; chemins contrôlés (préfixe `userId` / `bookingId` validé).
6. **Webhooks** : jamais de traitement sans **`constructEvent`** (signature Stripe) + secret d’environnement ; idempotence sur `event.id` quand applicable.
7. **Service role** : réservé au code **serveur** strictement nécessaire ; jamais importé dans composants client ou bundles « use client ».
8. **Admin** : pas d’accès implicite. Vérification explicite (`requireAdmin` / équivalent) alignée sur `lib/admin-access.ts` + layout admin.
9. **Middleware** : utile pour session / redirections / rate limit global ; **ne remplace pas** les garde-fous dans actions et API routes.
10. **Secrets** : aucune clé secrète, `service_role`, `STRIPE_SECRET`, webhook secret dans le code client ou `NEXT_PUBLIC_*` (sauf clés explicitement publiques prévues par le fournisseur).

## Journalisation et observabilité

- Actions critiques (paiement, annulation, modération, virement, changement de rôle) : **audit log** structuré (`lib/security/audit-log.ts`) — au minimum stdout JSON en attendant une table dédiée.
- Analytics / logs : pas de PII inutile ; pas de tokens ou secrets dans les messages.

## Références repo

- Garde-fous code : `lib/auth/guards.ts`, `lib/auth/admin-guard.ts`, `lib/admin-access.ts`
- Validation : `lib/validation/index.ts`
- Stripe : `lib/billing/stripe-helpers.ts`, `lib/stripe.ts`, `app/api/stripe/webhook/route.ts`
- Storage : `lib/storage/index.ts`
- Checklists : `CHECKLIST_SECURITY.md`, `CHECKLIST_RELEASE.md`
