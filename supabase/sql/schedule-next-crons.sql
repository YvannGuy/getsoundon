-- Planification des jobs HTTP vers l’app Next.js (remplace Vercel Cron).
--
-- Si tu as l’erreur « schema "cron" does not exist » : pg_cron n’est pas installé.
-- 0a) Dashboard : Integrations → Cron (module Postgres) → activer pg_cron
--     https://supabase.com/dashboard/project/_/integrations/cron/overview
-- 0b) Puis exécuter le bloc ci-dessous (doc officielle install) :

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- HTTP sortant depuis Postgres (net.http_post) :
create extension if not exists pg_net;

-- Vérification rapide : select nspname from pg_namespace where nspname in ('cron', 'net');

-- 1) Créer les secrets (une fois). Remplace les valeurs par les tiennes :
--    - next_base_url : origine publique SANS slash final, ex. https://getsoundon.com
--    - cron_secret    : la MÊME valeur que CRON_SECRET sur l’hébergement Next.js
--
-- select vault.create_secret('https://getsoundon.com', 'next_base_url', 'Base URL app Next');
-- select vault.create_secret('TA_VALEUR_CRON_SECRET', 'cron_secret', 'Bearer pour /api/cron/*');

-- 2) Si tu modifies le planning, déprogramme d’abord (noms stables) :
-- select cron.unschedule('next-cron-payout-gs-bookings');
-- select cron.unschedule('next-cron-deposit-release-j-plus-7');
-- select cron.unschedule('next-cron-generate-invoices');

-- 3) Enregistrer les tâches (horaires identiques à l’ancien vercel.json : UTC).

select cron.schedule(
  'next-cron-payout-gs-bookings',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'next_base_url' limit 1)
      || '/api/cron/payout-gs-bookings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'next-cron-deposit-release-j-plus-7',
  '0 10 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'next_base_url' limit 1)
      || '/api/cron/deposit-release-j-plus-7',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'next-cron-generate-invoices',
  '0 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'next_base_url' limit 1)
      || '/api/cron/generate-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Vérifier : select * from cron.job;
