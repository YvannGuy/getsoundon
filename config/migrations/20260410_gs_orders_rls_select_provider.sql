-- Le prestataire ne voit pas le panier en cours d’édition (`draft`) ; le reste reste visible pour le suivi / paiement en attente.

drop policy if exists gs_orders_select_participant on public.gs_orders;

create policy gs_orders_select_participant on public.gs_orders
for select
to authenticated
using (
  customer_id = auth.uid()
  or (
    provider_id = auth.uid()
    and status <> 'draft'
  )
);
