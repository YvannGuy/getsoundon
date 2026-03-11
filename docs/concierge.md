# Conciergerie Salledeculte

## Vue d'ensemble

La conciergerie permet aux utilisateurs de confier leur recherche de salle à l'équipe. Ils remplissent un brief ; nous leur proposons 3 à 5 lieux adaptés et organisons les visites.

---

## Emails automatiques

- **Confirmation utilisateur** : après soumission, un email de confirmation est envoyé (Resend) à l'utilisateur (email du compte ou email saisi si non connecté).
- **Notification admin** : un email est envoyé aux admins (`ADMIN_EMAILS`) avec un aperçu du message et un lien vers `/admin/conciergerie`.

---

## Section Homepage

**Emplacement :** `components/concierge/ConciergeSection.tsx`  
**Intégration :** Homepage (`app/accueil/page.tsx`), après la section « Comment ça marche », avant « Pourquoi ajouter votre salle ».

- Titre : « Conciergerie Salledeculte — De la recherche à la visite »
- CTAs : « Confier ma recherche » → `/conciergerie` ; « En savoir plus » → `/conciergerie#comment-ca-marche`

---

## Fallback 0 résultats (Recherche)

**Composant :** `components/search/ZeroResultsConcierge.tsx`  
**Intégration :** `components/rechercher/rechercher-content.tsx`

Quand une recherche ne renvoie **aucun résultat** (`sortedSalles.length === 0`) :
- Affichage du bloc « Aucun résultat pour ces critères »
- CTA « Confier ma recherche » → redirection vers `/conciergerie` avec les critères en query string
- Les paramètres sont pré-remplis dans le formulaire : ville, departement, date_debut, date_fin, personnes_min, personnes_max, type

**Exemple d’URL :**  
`/conciergerie?departement=78&date_debut=2025-04-01&date_fin=2025-04-30&personnes_min=50&personnes_max=100&type=culte-regulier`

---

## Page /conciergerie

**Route :** `app/conciergerie/page.tsx`

1. **Hero** — Titre, sous-texte, CTA qui scroll vers le formulaire  
2. **Comment ça marche** (#comment-ca-marche) — 4 étapes  
3. **Formulaire Brief** (#form) — Champs zone, capacité, type, date/fréquence, budget, contraintes, message  

- Si **utilisateur connecté** : `user_id` renseigné, pas de champs email/téléphone  
- Si **non connecté** : champs email (obligatoire) et téléphone (optionnel)  

**Source enregistrée :**  
- `homepage` : arrivée depuis la section homepage  
- `search_zero_results` : arrivée depuis le fallback 0 résultats  
- `other` : autres cas  

---

## Structure DB : `concierge_requests`

| Colonne    | Type      | Description                          |
|------------|-----------|--------------------------------------|
| id         | uuid      | PK                                   |
| user_id    | uuid      | Nullable, auth.users.id si connecté  |
| email      | text      | Nullable, si non connecté            |
| phone      | text      | Nullable, si non connecté            |
| status     | text      | Default `'new'`                      |
| source     | text      | `homepage` \| `search_zero_results` \| `other` |
| payload    | jsonb     | Tous les critères du formulaire      |
| created_at | timestamptz | Date de création                  |

**RLS :**  
- INSERT : tous (authenticated + anon)  
- SELECT : l’utilisateur ne voit que ses lignes (`user_id = auth.uid()`)  

**Script de migration :** `scripts/supabase-concierge-requests.sql`

---

## Page admin

**Route :** `/admin/conciergerie`

- Liste des demandes avec filtre par statut (Nouvelle, Contactée, En cours, Traité).
- Colonnes : Date, Contact, Source, Message (aperçu), Statut.
- Le statut peut être modifié via un select (nouvelle → contactée → en cours → traité).
- Badge dans la sidebar admin : nombre de demandes « nouvelles ».
- Accessible uniquement aux admins (ADMIN_EMAILS ou user_type = admin).

---

## Checklist tests manuels

1. **Search 0 résultat** → Recherche avec critères très restrictifs → le bloc conciergerie s’affiche  
2. **CTA pré-rempli** → Clic « Confier ma recherche » depuis 0 résultats → `/conciergerie` avec params → champs du formulaire pré-remplis  
3. **Submit connecté** → Utilisateur connecté, submit → ligne créée avec `user_id` non null  
4. **Submit non connecté** → Non connecté, remplir email ( obligatoire ), submit → ligne créée avec `email` et `user_id` null  
5. **Source correcte** → Vérifier `source = 'search_zero_results'` quand on arrive depuis 0 résultats et `source = 'homepage'` depuis la section homepage  
