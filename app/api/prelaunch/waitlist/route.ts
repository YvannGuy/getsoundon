import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPrelaunchWaitlistEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  profile: z.enum(["organisateur", "prestataire", "autre"]),
  city: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`prelaunch-waitlist:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez plus tard." }, { status: 429 });
  }

  try {
    const json = (await request.json()) as unknown;
    const data = bodySchema.parse(json);
    const result = await sendPrelaunchWaitlistEmail(data);
    if (!result.success) {
      return NextResponse.json({ error: "Envoi impossible pour le moment." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Veuillez vérifier les champs du formulaire." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
