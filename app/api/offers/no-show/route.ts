import { NextResponse } from "next/server";
import { z } from "zod";

import { reportNoShowAction } from "@/app/actions/etats-des-lieux";

const schema = z.object({
  offerId: z.string().uuid(),
  details: z.string().trim().max(500).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = await reportNoShowAction(payload.offerId, payload.details);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Signalement impossible." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
