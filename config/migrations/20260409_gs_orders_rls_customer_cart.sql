-- Restreint les mises à jour `draft` / `pending_payment` au seul client (évite qu’un prestataire modifie le panier).

drop policy if exists gs_orders_update_participant on public.gs_orders;

create policy gs_orders_update_customer_cart on public.gs_orders
for update
to authenticated
using (customer_id = auth.uid() and status in ('draft', 'pending_payment'))
with check (customer_id = auth.uid() and status in ('draft', 'pending_payment'));

create policy gs_orders_update_participant_post_checkout on public.gs_orders
for update
to authenticated
using (
  (customer_id = auth.uid() or provider_id = auth.uid())
  and status not in ('draft', 'pending_payment')
)
with check (customer_id = auth.uid() or provider_id = auth.uid());
