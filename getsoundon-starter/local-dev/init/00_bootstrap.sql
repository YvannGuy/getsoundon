-- Bootstrap local DB (Postgres) pour getsoundon-starter.
-- Ce fichier est execute automatiquement au premier demarrage du container.

create extension if not exists pgcrypto;

-- Stub minimal profiles pour permettre les FK du schema starter.
create table if not exists public.profiles (
  id uuid primary key,
  user_type text,
  full_name text,
  email text,
  stripe_account_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
