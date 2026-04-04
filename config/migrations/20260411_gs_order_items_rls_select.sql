-- Aligne la lecture des lignes sur la visibilité commande : pas de fuite du panier `draft` vers le prestataire.

drop policy if exists gs_order_items_select_participant on public.gs_order_items;

create policy gs_order_items_select_participant on public.gs_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.gs_orders o
    where o.id = gs_order_items.order_id
      and (
        o.customer_id = auth.uid()
        or (
          o.provider_id = auth.uid()
          and o.status <> 'draft'
        )
      )
  )
);
