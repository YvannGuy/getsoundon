import { createClient } from "@/lib/supabase/server";

/** Nombre total d’unités dans le panier brouillon (somme des quantités). */
export async function getDraftCartUnitsCountForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("gs_orders")
    .select("id")
    .eq("customer_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  const oid = (order as { id?: string } | null)?.id;
  if (!oid) return 0;

  const { data: items } = await supabase.from("gs_order_items").select("quantity").eq("order_id", oid);

  let sum = 0;
  for (const r of items ?? []) {
    sum += Math.max(0, Number((r as { quantity?: number }).quantity ?? 0));
  }
  return sum;
}
