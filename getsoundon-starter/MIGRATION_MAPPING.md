# MIGRATION_MAPPING

Migration progressive « sans big-bang » depuis les entités salledeculte vers GetSoundOn.

## Deux cibles de schéma dans ce dépôt (à ne pas confondre)

| Cible | Fichier / usage | Tables principales | Rôle |
|--------|------------------|-------------------|------|
| **MVP site (app Next racine)** | `config/supabase-getsoundon-schema.sql` | `gs_users_profile`, `gs_listings`, `gs_listing_images`, `gs_bookings`, `gs_messages`, `gs_payments`, `gs_reviews` | Parcours annonces + réservation simplifiée ; les routes `app/api/listings`, `bookings`, `messages` lisent/écrivent **ces** tables. |
| **Starter transactionnel (ce dossier)** | `sql/001_getsoundon_min_schema.sql`, `local-dev/init/*.sql` | `profiles` (existant), `providers`, `gear_listings`, `rental_requests`, `rental_conversations`, `rental_messages`, `rental_offers`, `rental_orders`, `rental_payments`, … | Noyau type salledeculte : demandes, conversations, offres Stripe split/deposit, crons, litiges, EDL. |

**Conséquence :** `MIGRATION_MAPPING.md` décrit surtout **legacy → rental_*** (cohérent avec le SQL du starter). Pour le **site actuel**, le mapping legacy → **`gs_*`** est documenté dans `docs/getsoundon/compat-layer-migration.md`. Toute intégration des templates `templates/` dans l’app implique soit **renommer les requêtes** vers `gs_*`, soit **appliquer le schéma starter** sur Supabase et réécrire les API MVP.

---

## Mapping tables (legacy salledeculte → starter `rental_*`)

| Ancien | Nouveau (starter) |
|--------|-------------------|
| `salles` | `gear_listings` |
| `demandes` | `rental_requests` |
| `conversations` | `rental_conversations` |
| `messages` | `rental_messages` |
| `offers` | `rental_offers` |
| `payments` | `rental_payments` |
| `refund_cases` | `rental_incident_cases` |
| `refund_case_evidences` | `rental_incident_evidences` |
| `etat_des_lieux` | `rental_check_reports` |
| `etat_des_lieux_photos` | `rental_check_report_photos` |

---

## Équivalence conceptuelle legacy → MVP site (`gs_*`)

À utiliser pour backfill / adaptateurs côté `src/modules/*/adapters` quand la base cible est le schéma `gs_*`.

| Legacy / starter | MVP site `gs_*` | Commentaire |
|------------------|-----------------|-------------|
| `salles` | `gs_listings` + `gs_listing_images` | Pas de `slug` obligatoire en `gs_*` ; prix en `numeric` jour (`price_per_day`) vs `base_price_cents`. |
| `profiles` (+ rôle) | `gs_users_profile` | Rôles : `customer` / `provider` / `admin` (vs `user_type` legacy). |
| `demandes` / début de parcours | `gs_bookings` (`status = pending`) | Le starter sépare **demande** (`rental_requests`) et **offre payée** (`rental_offers`) ; le MVP fusionne en une réservation. |
| `offers` payées / commande | `gs_bookings` + `gs_payments` | Statuts booking : `pending`, `accepted`, `refused`, `cancelled`, `completed`. |
| Fil de messages lié conversation | `gs_messages` | Clé **`booking_id`** (pas `conversation_id`). |
| — | `gs_reviews` | Pas d’équivalent direct obligatoire dans le starter minimal local. |

---

## Mapping champs critiques (offers → rental_offers)

- `salle_id` → `listing_id`
- `demande_id` → `request_id`
- `owner_id`, `seeker_id` → identiques
- `amount_cents`, `payment_mode`, `upfront_amount_cents`, `balance_amount_cents` → identiques
- `deposit_*`, `owner_payout_*`, `incident_status` → identiques

### conversations / messages

- `conversations` → `rental_conversations`
- `messages` → `rental_messages`
- logique participants identique

### EDL / litiges

- `etat_des_lieux(role, phase)` → `rental_check_reports(role, phase)`
- `refund_cases` → `rental_incident_cases` (type / status / amount / reason)

---

## Stratégie recommandée (3 étapes)

1. **Dual-write optionnel** (court terme)  
   Nouveau code écrit dans `rental_*` (starter) **ou** `gs_*` (site) selon la branche choisie ; ancien code lit le legacy.

2. **Switch lecture**  
   UI/API lit uniquement la cible (`rental_*` ou `gs_*`).

3. **Nettoyage**  
   Retirer les chemins legacy et les vues de compat.

---

## Compat SQL (facultatif)

Vues `legacy → nouvelle table` selon la cible réelle.

**Exemple si la base suit le starter (`rental_offers`) :**

```sql
create view public.offers as
select
  id,
  conversation_id,
  request_id as demande_id,
  owner_id,
  seeker_id,
  listing_id as salle_id,
  amount_cents,
  status,
  payment_mode,
  upfront_amount_cents,
  balance_amount_cents,
  balance_due_at,
  payment_plan_status,
  deposit_amount_cents,
  deposit_status,
  deposit_hold_status,
  stripe_session_id,
  stripe_payment_intent_id,
  balance_payment_intent_id,
  owner_payout_due_at,
  owner_payout_status,
  incident_status,
  expires_at,
  created_at,
  updated_at
from public.rental_offers;
```

**Exemple si la base suit le MVP site :** exposer une vue `salles` / `offers` minimale qui lit `gs_listings` / `gs_bookings` uniquement si tu dois garder du SQL ou des outils qui attendent les anciens noms (champs à mapper au cas par cas).

---

## Checklist

- [ ] Choisir explicitement **une** base cible par environnement : `gs_*` (MVP actuel) ou `rental_*` (starter complet).
- [ ] Si les deux coexistent : documenter les jobs de synchro ou les adaptateurs (pas de double vérité sans règle).
- [ ] Prioriser migration des blocs cœur (`offers` / `payments` / incidents) avant UI quand tu actives le starter.
- [ ] Garder les statuts et transitions Stripe / cron alignés avec les templates `templates/app/api/`.
- [ ] Ajouter tests de non-régression sur checkout / webhook / cron.
- [ ] Côté site : vérifier que `app/api/*` pointe vers les tables réellement créées sur Supabase (`gs_*` vs `rental_*`).
