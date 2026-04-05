# Checklist release — GetSoundOn

Avant déploiement production ou release majeure.

## Configuration

- [ ] Variables d’environnement critiques présentes : Supabase (URL, anon, service_role **serveur uniquement**), Stripe (secret, webhook secret, Connect si actif), Upstash si rate limit distribué
- [ ] Aucun secret ajouté en `NEXT_PUBLIC_*` par erreur
- [ ] `ADMIN_EMAILS` / rôles admin cohérents avec la politique d’accès

## Base & Storage

- [ ] Migrations Supabase appliquées (RLS inclus)
- [ ] Buckets sensibles : **privés** ; policies storage alignées
- [ ] Pas de table nouvelle sans RLS revue

## Stripe

- [ ] Webhook endpoint configuré avec le bon **signing secret** (prod vs test)
- [ ] Connect : URLs de retour / refresh cohérentes avec l’environnement

## Application

- [ ] `npm run build` OK
- [ ] Optionnel : `npm run security:check` (scripts légers repo)

## Post-déploiement

- [ ] Smoke test : login, checkout test si concerné, webhook reçu (dashboard Stripe)
- [ ] Vérifier logs erreurs (pas de stack trace sensible exposée aux clients)
