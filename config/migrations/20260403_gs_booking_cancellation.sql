-- Phase 7 — Demandes d'annulation locataire (gs_bookings) + politique sur annonces matériel
-- À appliquer sur le projet Supabase (SQL editor ou migration).

-- Politique d'annulation affichée côté admin (souplesse indicative ; décision finale = admin)
ALTER TABLE public.gs_listings
ADD COLUMN IF NOT EXISTS cancellation_policy text NOT NULL DEFAULT 'moderate'
  CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

COMMENT ON COLUMN public.gs_listings.cancellation_policy IS
  'Indication produit : flexible | modérée | stricte — la décision d''annulation/remboursement reste administrative.';

CREATE TABLE IF NOT EXISTS public.gs_booking_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.gs_bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'rejected',
      'approved_no_refund',
      'approved_partial_refund',
      'approved_full_refund'
    )),
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 10),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  admin_note text,
  refund_amount_eur numeric(12,2),
  stripe_refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gs_booking_cancel_req_booking_idx
  ON public.gs_booking_cancellation_requests (booking_id);

CREATE INDEX IF NOT EXISTS gs_booking_cancel_req_pending_idx
  ON public.gs_booking_cancellation_requests (status)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS gs_booking_cancellation_requests_set_updated_at ON public.gs_booking_cancellation_requests;
CREATE TRIGGER gs_booking_cancellation_requests_set_updated_at
BEFORE UPDATE ON public.gs_booking_cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.gs_set_updated_at();

ALTER TABLE public.gs_booking_cancellation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gs_booking_cancel_select_customer ON public.gs_booking_cancellation_requests;
CREATE POLICY gs_booking_cancel_select_customer
ON public.gs_booking_cancellation_requests
FOR SELECT TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS gs_booking_cancel_insert_customer ON public.gs_booking_cancellation_requests;
CREATE POLICY gs_booking_cancel_insert_customer
ON public.gs_booking_cancellation_requests
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.gs_bookings b
    WHERE b.id = booking_id AND b.customer_id = auth.uid()
  )
);
