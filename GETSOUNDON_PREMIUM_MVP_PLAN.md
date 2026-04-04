# GetSoundOn — Plan MVP premium (moteur legacy conservé)

> **Note (historique / obsolète)** : ce plan décrit une orientation produit et un moteur legacy **non alignés** avec l’état actuel du dépôt (flow **matériel `gs_*`** en runtime). Conservé pour archive. Des fichiers cités ci-dessous (`lib/types/offer.ts`, etc.) ont été **retirés** du repo lors du ménage 2026.

**Décision figée :** conserver le **moteur transactionnel legacy** (`offers`, `payments`, `conversations`, `messages`, Stripe Connect, caution, webhooks, crons) comme **v1**. Ne **pas** basculer le parcours principal sur `gs_*` (les routes `gs_*` peuvent coexister pour expérimentation mais ne sont pas le cœur produit décrit ici).

**Objectif :** réorienter le **métier** de « salle / lieu » vers **matériel, packs et location événementielle premium**, en **réutilisant** tables et workflows existants.

---

## 1. Où la logique métier est encore liée à un lieu / une salle

### 1.1 Modèle de données & types (noms et sémantique)

| Élément | Fichiers / usage |
|---------|------------------|
| Table **`salles`** + colonnes (`name`, `city`, `capacity`, `jours_visite`, `visite_*`, features type « scène », « PMR ») | Toute la chaîne publication / fiche / recherche |
| **`offers.salle_id`** | Legacy — types `offer.ts` / actions `offers` **retirés** du repo ; référence historique uniquement |
| **`demandes.salle_id`**, champs **`nb_personnes`**, **`type_evenement`**, créneaux « visite » | `create-demande.ts`, `demande-owner.ts`, pages demandes |
| **`demandes_visite`** + `salle_id` | Flux visite physique du lieu |
| **`conversations`** liées à `demande_id` / `demande_visite_id` + `salle_id` | `messagerie.ts`, `dashboard/messagerie`, `proprietaire/messagerie` |
| **`contract_templates.salle_id`** (schéma implicite dans le code) | `contract-template.ts`, `api/contract/*`, PDF contrat |
| **`salles_reports`** | Signalements d’**annonce** encore nommés « salle » |
| **`salle_views`**, **`salle_location_exclusions`**, **`salle_visite_exclusions`** | Stats recherche, carte, créneaux visite |
| Types **`Salle`**, **`SalleRow`**, `rowToSalle`, `formatSalleTarifs` | `lib/types/salle.ts` |
| Mapping wizard → fiche | `lib/onboarding-to-salle.ts` (features culte/concert, « location de la salle ») |

### 1.2 Actions serveur

| Zone | Fichiers |
|------|----------|
| Création annonce | `app/actions/create-salle.ts`, `proprietaire-salle.ts`, `upload-photos.ts` (bucket `salle-photos`) |
| Demandes réservation | `create-demande.ts`, `demande-owner.ts`, `contact-*-demande.ts` |
| Visites | `create-demande-visite.ts`, `demande-visite-seeker.ts`, `demande-visite-owner.ts`, `creneaux.ts` |
| Offres & paiement | `offers.ts` (`salleId` dans FormData, insert `offers`) |
| EDL & litiges | `etats-des-lieux.ts` (joint `offers` / `salles`), `cancellations.ts` |
| Contrats | `contract-template.ts` |
| Signalements / vues | `salle-reports.ts`, `salle-views.ts` |
| Favoris | `favoris.ts` (référence listings `salles`) |

### 1.3 API routes

| Fichiers | Liaison lieu |
|----------|--------------|
| `app/api/stripe/checkout-offer/route.ts` | `salles.name`, profil owner |
| `app/api/contract/*`, `invoice/offer/*` | `salle_id`, `salles` |
| `app/api/contract/salle-pdf/*`, `salle/[salleId]` | Nommage explicite « salle » |

### 1.4 Pages `app/`

| Chemins | Contenu lieu-centric |
|---------|----------------------|
| `app/salles/[slug]/*` | Fiche « lieu », disponibilité, photos |
| `app/rechercher`, `app/dashboard/rechercher` | Carte + filtres « salle » |
| `app/onboarding/salle` | Wizard propriétaire de **salle** |
| `proprietaire/annonces`, `proprietaire/visites`, `proprietaire/contrat` | Libellés + données `salles` / visites |
| `dashboard/demandes`, `demandes/visite/*` | `nb_personnes`, type événement, visite |
| `admin/annonces*`, `admin/signalements` | `salles`, `salles_reports` |
| Toutes pages **réservations / EDL / litiges / cautions** | Affichage `salleMap`, colonnes `salle_id` |

### 1.5 Composants `components/`

| Dossiers / fichiers | Nature |
|---------------------|--------|
| `components/salles/*` | Carte, galerie, calendrier lieu, actions fiche salle |
| `components/rechercher/*` | Recherche géo « salle » |
| `components/proprietaire/salle-wizard.tsx`, `add-salle-modal.tsx`, `contract-template-form.tsx` | Publication / contrat **salle** |
| `components/search/*` | Départements, ville, adresse (fort lien lieu) |
| `components/messagerie/*` | `venueName`, `venueCity`, textes contrat réservation **lieu** |
| `components/etats-des-lieux/*` | Libellés « état des lieux » (sémantique immobilier) |
| `components/demandes/*` | Contact locataire / propriétaire **demande salle** |
| `home/*` | Carrousels lieux / catégories événement **lieu** (selon contenu actuel) |

### 1.6 `lib/` transversal

| Fichiers | Liaison |
|----------|---------|
| `lib/email.ts` | Sujets/corps « salle », réservation lieu, visites |
| `lib/telegram.ts` | « Nouvelle annonce à valider », « Salle: … » |
| `lib/invoice-pdf.ts`, `lib/contract-pdf.ts` | Mentions lieu / salle dans documents |
| `lib/seo.ts`, `app/layout.tsx` | Mots-clés lieux, `SearchAction` → `/rechercher?ville=` |
| `lib/notification-counts.ts` | Agrégats sur `salles`, visites, EDL |
| `lib/auth-utils.ts` | `canAccessOwnerDashboard(..., hasSalles)` |

### 1.7 Stripe / cron

| Fichiers | Détail |
|----------|--------|
| `lib/stripe-webhook.ts` | Métadonnées offre, emails « salle », storage `contrats` par `salle_id` |
| `app/api/cron/*` | Libellés / commentaires métier réservation **lieu** |

---

## 2. Triage : conserver tel quel · rebrand UI · modifier la logique métier

### 2.1 Conserver tel quel (moteur inchangé)

- **Graphe** `demandes` → `conversations` → `messages` → `offers` → `payments`.
- **Stripe** : `checkout-offer`, `process-balance`, webhooks, **Connect** (`profiles.stripe_account_id`).
- **Champs financiers** offre : `payment_mode`, `deposit_*`, `balance_*`, `service_fee_cents`, `payment_plan_status`, crons J-7 / J+3 / J+7.
- **Tables** `etat_des_lieux` / `etat_des_lieux_photos` : structure **`offer_id`, `role`, `phase` (`before` / `after`)** — déjà adaptée à un workflow **départ / retour** sans renommer la table.
- **`refund_cases`** avec `case_type` (`refund_full`, `refund_partial`, `dispute`) et statuts — la **logique** recouvre déjà remboursement + contestation.
- **`contract_templates`** liés à l’ID d’annonce (aujourd’hui `salle_id`) : le **mécanisme** (PDF, upload, merge données offre/profils) reste valable.

### 2.2 Rebrand UI / copy uniquement (pas de changement SQL obligatoire)

- Libellés pages : « Salle » → « Annonce », « Lieu » → « Matériel » / « Pack », « Propriétaire » → « Loueur » / « Prestataire », « Organisateur » → « Client ».
- `components/messagerie/contract-accept-modal.tsx` : `venueName` / `venueCity` → afficher **nom du matériel + ville de prise en charge** (mêmes props, autre sémantique).
- Menus : `site-header`, `site-footer`, `mobile-nav`, sidebars dashboard / admin / proprio.
- `lib/seo.ts`, `config/site.ts`, emails / Telegram : remplacer vocabulaire **lieu culte / salle** par **sono, DJ, lumière, pack, location matériel**.
- Pages légales (relecture juridique + vocabulaire B2B matériel).
- Titres admin : « Annonces à valider » au lieu de seulement « salles » (tant que la source de données reste `salles`).

### 2.3 Modifier la logique métier (comportement ou données)

- **Wizard & champs `salles`** : remplacer ou rendre optionnels champs **spécifiques lieu** (capacité, PMR, scène, visites obligatoires, `jours_visite`) ; ajouter champs **matériel** (voir section 4).
- **`demandes`** : `nb_personnes` / `type_evenement` → optionnels ou remplacés par **type de prestation**, **durée de location**, **adresse de livraison / retrait** selon produit.
- **Flux `demandes_visite`** : soit **désactivation produit** (plus de visite physique lieu), soit **repurpose** en « **inspection / essai matériel** » (même table, autre copy et règles).
- **`onboarding-to-salle.ts` + features** : cartographier les `features` vers **équipements sono/lumière** (ou JSON libre) au lieu de « estrade / culte ».
- **`offers`** : conserver `salle_id` comme **FK vers l’annonce** ; ajuster validations (ex. plus de logique « capacité ≥ nb_personnes » si champ abandonné).
- **`etats-des-lieux.ts` + UI** : règles métier identiques (photos avant/après) mais **seuils texte / emails** orientés **casse, manquant, rayure** plutôt que « dégradation des murs ».
- **`refund_cases`** : enrichir **types** ou `reason` structuré pour **casse / manque / dégradation** (peut rester sous `dispute` + raison détaillée au premier jet).
- **Contrats** : variables du PDF : « désignation du matériel », « état au départ / retour », « caution matériel » — même pipeline, autre contenu template.
- **Recherche** : filtres « capacité » → **catégorie matériel**, **puissance**, **poids**, **zone d’intervention** (selon colonnes ajoutées).

---

## 3. Plan de transformation (réutilisation maximale)

### 3.1 `salles` = table d’annonces **matériel** (temporaire, sans renommer tout de suite)

- **Décision** : garder le nom de table **`salles`** en v1 pour éviter une migration massive de FK (`offers.salle_id`, `demandes.salle_id`, `contract_templates`, etc.).
- **Sémantique** : documenter en interne que **`salles` = listings matériel** (alias mental « `listings` »).
- **Actions** :
  - Ajouter colonnes métier matériel (section 4) ; utiliser `description`, `images`, `pricing_inclusions`, `features` (JSON) pour **fiches pack**.
  - Rendre **optionnels** ou **masqués en UI** : capacité, visites, champs purement « lieu de culte ».
  - Bucket photos : renommer **affichage** + policies ; migration bucket `salle-photos` → `listing-photos` **quand** prêt (coordination code + Supabase).

### 3.2 `offers` = centre transactionnel (inchangé structurellement)

- Aucun remplacement par `gs_bookings` sur le parcours premium.
- **Seule évolution** : les montants / dépôts représentent une **location de matériel** ; textes contrat et emails alignés.
- `event_type` (`ponctuel` / `mensuel`) peut rester pour **location longue durée pack** vs **one-shot** — à clarifier produit.

### 3.3 `etat_des_lieux` → workflow **check-in / check-out matériel**

- **Conserver** table + `phase` `before` / `after` + rôles `owner` / `seeker` (loueur / client).
- **Renommer dans l’UI** : « État des lieux » → « **État du matériel** » / « **Check départ / retour** ».
- **Emails & admin** : mêmes triggers ; adapter libellés et consignes photos (numéros de série, étiquettes, contenu de caisse).
- Option ultérieure : migration SQL `etat_des_lieux` → `equipment_check_reports` **sans urgence** si la dette nommage est acceptée en v1.

### 3.4 `refund_cases` → litiges **casse / manque / dégradation**

- **Court terme** : garder `case_type` existants ; utiliser **`dispute`** + `reason` / pièces jointes pour casse, vol apparent, manque d’accessoire.
- **Moyen terme** : migration CHECK / enum pour ajouter par ex. `damage`, `missing_items`, `degradation` **en plus** de `dispute`, ou sous-typage JSON `metadata` — à valider avec juridique et Stripe.
- Crons / cautions : logique **inchangée** ; seul le **wording** et les critères métier (qui valide une « dégradation acceptable ») évoluent.

### 3.5 `contract_templates` → contrats de **location de matériel**

- Garder **`salle_id`** comme clé d’annonce.
- Adapter champs édités par le loueur (raison sociale, conditions) + **placeholders** PDF : liste matériel, valeur de remplacement, franchise casse, zone géographique d’utilisation.
- Fichiers : `contract-template.ts`, `api/contract/*`, `lib/contract-pdf.ts`, chemins storage `contrats/salles/{id}/modele.pdf` — **renommage chemins** optionnel après stratégie storage.

---

## 4. Colonnes / champs manquants ou à clarifier (location matériel premium)

> Liste **additive** recommandée (migrations Supabase). À prioriser selon MVP ; certaines peuvent être reportées en JSON existant (`features`, `conditions`).

### Table `salles` (annonces)

| Champ suggéré | Rôle |
|---------------|------|
| `listing_kind` ou `asset_type` | `equipment` \| `pack` \| `service` (défaut `equipment`) |
| `gear_category` | ex. `son`, `lumiere`, `dj`, `structure`, `pack` |
| `brand`, `model` | Identification matériel |
| `serial_numbers` (jsonb/text[]) | Traçabilité premium |
| `replacement_value_cents` | Assurances / litiges |
| `deposit_recommended_cents` | Suggestion caution (en plus de `caution_requise` bool) |
| `weight_kg`, `dimensions_cm` | Logistique |
| `pickup_address` / `delivery_zones` | Distinction **lieu de retrait** vs ancienne « adresse salle » |
| `insurance_required` | Bool + doc |
| `included_accessories` (jsonb) | Liste accessoires du pack |
| `min_rental_days`, `max_rental_days` | Règles location |
| Réutilisation | `capacity` → optionnel ou **sens « audience max recommandée »** pour packs sono, ou nullable |

### Table `demandes`

| Champ suggéré | Rôle |
|---------------|------|
| `delivery_mode` | `pickup` \| `delivery` \| `on_site_install` |
| `setup_address` | Si installation sur site |
| Remplacer sémantique | `nb_personnes` → optionnel ; `type_evenement` → `event_context` (mariage, corporate, concert) |

### Table `offers` (si besoin au-delà du copy)

| Champ suggéré | Rôle |
|---------------|------|
| `equipment_manifest` (jsonb) | Snapshot du pack au moment de l’offre |
| `handover_notes` | Notes départ/retour |

### `refund_cases`

| Champ suggéré | Rôle |
|---------------|------|
| `damage_category` | Enum ou texte : `missing`, `broken`, `wear`, `other` |
| `evidence_required` | Bool (déjà partiellement via pièces) |

### `etat_des_lieux` / photos

| Champ suggéré | Rôle |
|---------------|------|
| `checklist_json` | Points de contrôle (câbles, flight case, etc.) |
| Colonne display | Aucune obligatoire si checklist portée par UI + photos |

**Note :** tant que ces colonnes n’existent pas, une partie peut tenir dans **`features` / `conditions` / `description`** (JSON/texte) — acceptable pour un pilote, fragile pour reporting admin.

---

## 5. Fichiers à modifier en priorité (ordre suggéré)

1. **`lib/types/salle.ts`** — commentaires, types optionnels, helpers tarifs (libellés « / jour » OK pour location matériel).
2. **`lib/onboarding-to-salle.ts`** — mapping features / événements vers taxonomie **matériel / événementiel**.
3. **`components/proprietaire/salle-wizard.tsx`** + **`app/actions/create-salle.ts`** — champs formulaire + `insert` alignés section 4.
4. **`app/actions/create-demande.ts`** + **`demande-owner.ts`** — champs demande + messages auto.
5. **`components/messagerie/*`** (`offer-card`, `contract-accept-modal`, `create-offer-modal`) — variables `venue*` → sémantique matériel.
6. **`app/api/stripe/checkout-offer/route.ts`** + **`lib/stripe-webhook.ts`** — textes produit Stripe, metadata si besoin.
7. **`lib/email.ts`** + **`lib/telegram.ts`** — tous les flux « salle ».
8. **`app/actions/etats-des-lieux.ts`** + pages **`dashboard/etats-des-lieux`**, **`proprietaire/etats-des-lieux`**, **`admin/etats-des-lieux`** — copy + éventuelle checklist.
9. **`app/actions/contract-template.ts`** + **`lib/contract-pdf.ts`** + **`api/contract/*`** — placeholders contrat matériel.
10. **`components/salles/*`** + **`app/salles/[slug]/page.tsx`** — fiche « annonce matériel » (affichage champs nouveaux).
11. **`components/rechercher/*`** + **`app/rechercher`** — filtres.
12. **`lib/seo.ts`** + **`app/layout.tsx`** — SearchAction, keywords.
13. **`components/layout/site-header.tsx`**, **`site-footer.tsx`**, **`mobile-nav.tsx`**, sidebars **`dashboard-sidebar`**, **`owner-sidebar`**, **`admin-sidebar`**.
14. **`lib/notification-counts.ts`** + **`app/admin/layout.tsx`** — libellés alertes.
15. **`GETSOUNDON_AUDIT.md` / doc interne** — une phrase : **`salles` = listings matériel v1** pour éviter les régressions `gs_*` sur le premium path.

---

## 6. Pièges à éviter (spécifiques à cette stratégie)

- **Renommer la table `salles` trop tôt** : casse toutes les FK et les centaines de requêtes ; rester sur sémantique métier + colonnes jusqu’à migration planifiée.
- **Dupliquer le parcours** `gs_*` et legacy **sans règle produit** : risque double source de vérité ; garder **`offers` unique** pour le premium.
- **Oublier Stripe Connect** : les textes changent, pas la **compliance** KYC / capabilities.
- **EDL sans photos lisibles** : le workflow juridique premium repose sur **preuve** ; garder exigences qualité upload.
- **Visites** : si le produit retire la visite physique, **désactiver l’entrée UI** sans casser les conversations déjà liées à `demandes_visite`.

---

## 7. Synthèse

| Objectif | Moyen |
|----------|--------|
| Moteur transactionnel | **Legacy inchangé** (`offers`, `payments`, Stripe, caution, crons) |
| Annonces | Table **`salles`** = **catalogue matériel** + migrations colonnes |
| Qualité premium | **EDL** = check-in/out matériel ; **refund_cases** = litiges dommages ; **contract_templates** = contrats matériel |
| UX | Rebrand massif + wizard + fiche + recherche |
| Hors scope immédiat | Migration renommage tables ; bascule MVP principal sur `gs_*` |

---

*Document : `GETSOUNDON_PREMIUM_MVP_PLAN.md` — aligné avec la décision produit « premium legacy first ».*
