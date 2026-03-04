## Plan du site – salles-du-culte.com

Ce document décrit l’arborescence principale du site, pour l’équipe produit / tech / contenu.

---

### 1. Zone publique (marketing / découverte)

- Accueil : `/`
- Page d’accueil alternative : `/accueil` (si utilisée)
- Rechercher une salle : `/rechercher`
- Tarifs : `/pricing`
- Avantages propriétaires : `/avantages`
- Blog : `/blog`, `/blog/[slug]`
- Centre d’aide :
  - Général : `/centre-aide`
  - Organisateurs : `/centre-aide/organisateur`
  - Propriétaires : `/centre-aide/proprietaire`
  - Questions générales : `/centre-aide/general`

### 2. Espace organisateur (connecté)

- Authentification :
  - Connexion : `/login`
  - Inscription : `/signup`
  - Auth multi-onglets : `/auth` (login / signup via query string)
  - Mot de passe oublié : `/auth/mot-de-passe-oublie`
  - Nouveau mot de passe : `/auth/mot-de-passe-oublie/nouveau`

- Tableau de bord organisateur : `/dashboard`
  - Demandes : `/dashboard/demandes`, `/dashboard/demandes/[id]`, `/dashboard/demandes/visite/[id]`
  - Réservations : `/dashboard/reservations`
  - Favoris : `/dashboard/favoris`
  - États des lieux : `/dashboard/etats-des-lieux`
  - Litiges : `/dashboard/litiges`
  - Messagerie : `/dashboard/messagerie`
  - Paiements :
    - Vue synthétique : `/dashboard/paiement`
    - Historique : `/dashboard/paiement/historique`
  - Recherche depuis dashboard : `/dashboard/rechercher`
  - Paramètres du compte : `/dashboard/parametres`

### 3. Espace propriétaire

- Landing / hub propriétaire : `/proprietaire`
- Annonces :
  - Liste : `/proprietaire/annonces`
  - Onboarding salle : `/onboarding/salle`
- Réservations : `/proprietaire/reservations`
- Demandes (avec détails) : `/proprietaire/demandes`, `/proprietaire/demandes/[id]`
- Visites : `/proprietaire/visites`
- Messagerie : `/proprietaire/messagerie`
- États des lieux : `/proprietaire/etats-des-lieux`
- Cautions : `/proprietaire/cautions`
- Litiges : `/proprietaire/litiges`
- Contrats : `/proprietaire/contrat`
- Paiements : `/proprietaire/paiement`
- Paramètres du compte : `/proprietaire/parametres`

### 4. Pages salles

- Détail salle : `/salles/[slug]`
- Disponibilités : `/salles/[slug]/disponibilite`
- Photos : `/salles/[slug]/photos`

### 5. Zone admin (interne plateforme)

- Dashboard admin : `/admin`
- Gestion des annonces : `/admin/annonces`, `/admin/annonces-a-valider`
- Gestion des réservations : `/admin/reservations`
- Gestion des demandes : `/admin/demandes`, `/admin/demandes/[id]`
- États des lieux : `/admin/etats-des-lieux`
- Cautions : `/admin/cautions`
- Litiges : `/admin/litiges`
- Signalements : `/admin/signalements`
- Paiements : `/admin/paiements`
- Utilisateurs : `/admin/utilisateurs`
- Paramètres : `/admin/parametres`
- Auth admin dédiée : `/auth/admin`

### 6. Pages légales & cookies

- Mentions légales : `/mentions-legales`
- CGU : `/cgu`
- CGV : `/cgv`
- Confidentialité : `/confidentialite`
- Cookies : `/cookies`

### 7. Plan du site & SEO

- Page HTML plan du site : `/plan-du-site`
- Sitemap XML : généré via `app/sitemap.ts` → exposé en `/sitemap.xml`
- Robots : généré via `app/robots.ts` → référence le sitemap

### 8. Futur : boutique en ligne (à venir)

Prévision d’arborescence (non encore implémentée) :

- Boutique : `/boutique`
  - Catégories : `/boutique/[categorie]`
  - Produit : `/boutique/produit/[slug]`
- Panier : `/boutique/panier`
- Checkout : `/boutique/commande`
- Espace client boutique :
  - Mes commandes : `/boutique/mes-commandes`
  - Détail commande : `/boutique/mes-commandes/[id]`

Ce document peut être mis à jour au fur et à mesure des évolutions produit (nouvelles routes, changement de noms de pages, etc.).

