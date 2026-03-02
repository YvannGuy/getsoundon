# Payment/Contract E2E Checklist

## 1. Ponctuel full (100%)
- Créer une offre ponctuelle `payment_mode=full`.
- Accepter contrat + CGV, payer.
- Vérifier:
  - `offers.contract_accepted_at` et `contract_acceptance_version` non nuls.
  - `offers.deposit_hold_status` passe à `authorized` (si caution > 0) ou `none`.
  - message de paiement créé dans la conversation.

## 2. Ponctuel acompte + solde J-7
- Créer une offre ponctuelle `payment_mode=split`.
- Payer l'acompte.
- Vérifier:
  - `offers.balance_due_at` positionné à J-7.
  - statut plan paiement `balance_scheduled`.
- Déclencher `POST /api/cron/balance-j-minus-7`.
- Vérifier:
  - paiement de solde créé (`payments.payment_type=balance`),
  - `offers.payment_plan_status=fully_paid`.

## 3. Annulation stricte/modérée/flexible
- Créer 3 offres avec chaque politique.
- Appeler `POST /api/offers/cancel` en tant que seeker (avec différents délais).
- Vérifier:
  - montant remboursé cohérent avec la policy,
  - `offers.cancellation_outcome_status=applied`,
  - insertion `refund_cases` en `resolved`.

## 4. Incident <48h vs hors délai
- Réservation payée avec `date_fin` proche.
- Ouvrir litige owner via `openUserDisputeCaseAction` dans la fenêtre 48h: OK.
- Rejouer après `incident_deadline_at`: refus attendu.

## 5. Litige et caution
- Ouvrir litige owner avec preuves.
- Réponse seeker avec preuves.
- Admin capture partielle via `resolveDepositClaimAdminAction`.
- Vérifier:
  - `deposit_hold_status=captured`,
  - `incident_status=resolved`.

## 6. No-show owner / seeker
- Déclarer no-show owner et seeker via `POST /api/offers/no-show`.
- Vérifier:
  - `offers.no_show_reported_by` et `no_show_reported_at` remplis,
  - `incident_status=reported`,
  - dossier `refund_cases` ouvert.
