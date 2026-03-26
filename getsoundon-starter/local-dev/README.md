# Local Dev (DB + Seed)

Ce dossier fournit un setup local rapide pour tester le starter getsoundon:

- Postgres local via Docker Compose
- Bootstrap schema minimal
- Seed de donnees (provider/listing/request/conversation/offer)

## Lancer

Depuis `getsoundon-starter/local-dev`:

```bash
docker compose up -d
```

Services:

- Postgres: `localhost:54329` (`postgres/postgres`, db `getsoundon`)
- Adminer: [http://localhost:8089](http://localhost:8089)

## Donnees seed utiles

- `provider_id`: `11111111-1111-1111-1111-111111111111`
- `renter_id`: `22222222-2222-2222-2222-222222222222`
- `listing_id`: `33333333-3333-3333-3333-333333333333`
- `conversation_id`: `55555555-5555-5555-5555-555555555555`
- `offer_id`: `66666666-6666-6666-6666-666666666666` (status `pending`)

## Re-seed

Les scripts `init/*` s'executent au **premier** start (volume vide).

Pour repartir propre:

```bash
docker compose down -v
docker compose up -d
```

## Integration app Next.js

Si tu pointes ton app locale sur cette DB:

- adapte `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` selon ton setup
- ou garde Supabase cloud pour auth + cette DB en sandbox SQL uniquement

Ce setup est volontairement minimal pour valider les flux checkout/webhook/cron sans attendre le self-host complet Supabase.
