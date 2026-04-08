import { NextResponse } from "next/server";
import { z } from "zod";

import { runAssistantTurn } from "@/lib/assistant/server-orchestrator";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  engine_state: z.record(z.string(), z.unknown()),
  message: z.string().min(1).max(8000),
});

/**
 * POST /api/internal/assistant/step
 * Étape moteur seule (sans DB) — pour FastAPI ou tests internes.
 * Protégé par secret partagé.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-assistant-internal-secret");
  const expected = process.env.ASSISTANT_INTERNAL_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload invalide.", details: parsed.error.flatten() }, { status: 400 });
    }

    const engineState = parsed.data.engine_state as unknown as ConversationEngineState;
    const turn = await runAssistantTurn(engineState, parsed.data.message);

    return NextResponse.json({
      engine_state: turn.engineState,
      brief: turn.brief,
      recommended: turn.recommended,
      ranked_providers: turn.rankedProviders,
      ready_for_results: turn.readyForResults,
      meta: turn.meta,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[api/internal/assistant/step]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
