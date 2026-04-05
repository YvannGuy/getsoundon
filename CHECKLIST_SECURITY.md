# Checklist sécurité — nouvelle feature

Cocher mentalement (ou dans la PR) avant merge.

## Modèle de données

- [ ] **Qui peut voir** quelles lignes ? (RLS SELECT)
- [ ] **Qui peut créer** ? (RLS INSERT + validation serveur)
- [ ] **Qui peut modifier** ? (RLS UPDATE + ownership / rôle)
- [ ] **Qui peut supprimer** ? (soft delete préférable si historique métier)

## Données sensibles

- [ ] Données personnelles (email, téléphone, adresse) : minimisation, pas dans l’URL, pas dans les logs bruts
- [ ] Paiements / IBAN / compte Stripe : jamais en clair côté client hors champs Stripe.js officiels

## Validation

- [ ] **Zod (ou équivalent) côté serveur** pour body, query, formData
- [ ] IDs (UUID) validés au format attendu
- [ ] Enums / statuts : liste blanche, pas de chaîne libre du client pour statuts métier

## Auth & autorisation

- [ ] **Auth** : utilisateur requis ? (`requireUser`)
- [ ] **Autorisation** : rôle admin / owner / client explicite ?
- [ ] **Ownership** : ressource appartient-elle à l’utilisateur ? (recoupement DB, pas le body)

## Abus & disponibilité

- [ ] **Rate limit** sur endpoint ou action exposée (spam, énumération)
- [ ] Taille max upload / nombre de requêtes raisonnable

## Paiement & webhooks

- [ ] Prix / montants recalculés serveur
- [ ] Webhook : signature vérifiée ; idempotence si double livraison
- [ ] Aucune action financière sur simple GET sans token métier

## Storage

- [ ] Bucket non public si données privées
- [ ] Signed URL **courte**
- [ ] Chemin non contrôlable entièrement par le client

## Observabilité

- [ ] **auditLog** (ou équivalent) pour action critique (modération, annulation, remboursement, changement rôle)

## Tests manuels rapides

- [ ] Utilisateur A ne peut pas lire / modifier la ressource de B
- [ ] Non connecté : refus propre (401/403 ou redirect)
- [ ] Client ne peut pas appeler route admin
