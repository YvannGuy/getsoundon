import { createAdminClient } from "@/lib/supabase/admin";
import { CautionsClient } from "./cautions-client";

type CautionRow = {
  id: string;
  salle_name: string;
  owner_name: string;
  seeker_name: string;
  deposit_amount_cents: number;
  hold_status: string;
  claim_amount_cents: number;
  claim_reason: string | null;
  claim_requested_at: string | null;
  resolved_at: string | null;
};

export default async function AdminCautionsPage({
  searchParams,
}: {
  searchParams: Promise<{ offerId?: string }>;
}) {
  const { offerId } = await searchParams;
  const supabase = createAdminClient();

  const { data: depositCases } = await supabase
    .from("offers")
    .select(
      "id, salle_id, owner_id, seeker_id, deposit_amount_cents, deposit_claim_amount_cents, deposit_claim_reason, deposit_claim_requested_at, deposit_hold_status, updated_at"
    )
    .in("deposit_hold_status", ["claim_requested", "captured", "released"])
    .order("deposit_claim_requested_at", { ascending: false })
    .limit(500);

  const offerRows = (depositCases ?? []) as {
    id: string;
    salle_id: string;
    owner_id: string;
    seeker_id: string;
    deposit_amount_cents: number;
    deposit_claim_amount_cents: number;
    deposit_claim_reason: string | null;
    deposit_claim_requested_at: string | null;
    deposit_hold_status: string | null;
    updated_at: string | null;
  }[];

  const offerSalleIds = [...new Set(offerRows.map((o) => o.salle_id))];
  const offerProfileIds = [...new Set(offerRows.flatMap((o) => [o.owner_id, o.seeker_id]))];

  const [{ data: sallesForClaims }, { data: profilesForClaims }] = await Promise.all([
    offerSalleIds.length > 0
      ? supabase.from("salles").select("id, name").in("id", offerSalleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    offerProfileIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", offerProfileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
  ]);

  const salleClaimMap = new Map((sallesForClaims ?? []).map((s) => [s.id, s.name]));
  const profileClaimMap = new Map(
    (profilesForClaims ?? []).map((p) => [p.id, p.full_name || p.email || "—"])
  );

  const claimsRows: CautionRow[] = offerRows.map((o) => ({
    id: o.id,
    salle_name: salleClaimMap.get(o.salle_id) ?? "Salle",
    owner_name: profileClaimMap.get(o.owner_id) ?? "Propriétaire",
    seeker_name: profileClaimMap.get(o.seeker_id) ?? "Locataire",
    deposit_amount_cents: o.deposit_amount_cents ?? 0,
    hold_status: o.deposit_hold_status ?? "none",
    claim_amount_cents: o.deposit_claim_amount_cents ?? 0,
    claim_reason: o.deposit_claim_reason,
    claim_requested_at: o.deposit_claim_requested_at,
    resolved_at: o.updated_at,
  }));

  const pendingClaims = claimsRows.filter((row) => row.hold_status === "claim_requested");
  const resolvedClaims = claimsRows.filter((row) => ["captured", "released"].includes(row.hold_status));

  return (
    <CautionsClient
      pendingClaims={pendingClaims}
      resolvedClaims={resolvedClaims}
      focusOfferId={offerId ?? null}
    />
  );
}
