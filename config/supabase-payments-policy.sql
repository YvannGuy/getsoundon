-- Policy RLS : utilisateurs peuvent lire leurs propres paiements
-- À exécuter après supabase-payments.sql

create policy "users_select_own_payments"
  on public.payments for select
  using (auth.uid() = user_id);
