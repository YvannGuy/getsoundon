import { NextResponse } from "next/server";
import { z } from "zod";

import { sendContactFormAcknowledgementEmail, sendHowItWorksContactEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`contact-ccm:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez plus tard." }, { status: 429 });
  }

  try {
    const json = (await request.json()) as unknown;
    const data = bodySchema.parse(json);
    const result = await sendHowItWorksContactEmail(data);
    if (!result.success) {
      return NextResponse.json({ error: "Envoi impossible pour le moment." }, { status: 502 });
    }
    await sendContactFormAcknowledgementEmail(data.email, {
      contextLine:
        "Merci pour votre demande depuis la page « Comment ça marche » (location de matériel).",
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Veuillez vérifier les champs du formulaire." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
