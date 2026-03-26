import { NextResponse } from "next/server";
import { z } from "zod";

import { cancelRentalOrderAction } from "@/app/actions/cancellations-gear";

const schema = z.object({
  offerId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = await cancelRentalOrderAction(payload.offerId, payload.reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Annulation impossible." }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      refundCents: result.refundCents ?? 0,
      ownerKeepsCents: result.ownerKeepsCents ?? 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
