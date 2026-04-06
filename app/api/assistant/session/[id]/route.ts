import { NextResponse } from "next/server";
import { z } from "zod";

import { toUiBridgeState } from "@/lib/assistant/bridge-ui-state";
import { loadAssistantSnapshot } from "@/lib/assistant/persistence";
import { convertSlotsToBrief } from "@/lib/assistant/slots-to-brief";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/assistant/session/:id
 * Recharge l’état depuis Supabase (même contrat que POST response).
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Identifiant de session invalide." }, { status: 400 });
    }

    const loaded = await loadAssistantSnapshot(idParsed.data);
    if (loaded.kind === "not_found") {
      return NextResponse.json({ error: "Session introuvable ou expirée." }, { status: 404 });
    }
    if (loaded.kind === "db_error") {
      console.error("[api/assistant/session] load snapshot", loaded.message);
      return NextResponse.json(
        { error: "Erreur technique : impossible de charger la session. Réessayez dans quelques instants." },
        { status: 500 },
      );
    }

    const snap = loaded.snapshot;
    const brief = convertSlotsToBrief(snap.engine_state.slots);
    const uiState = toUiBridgeState(snap.engine_state, brief, snap.ready_for_results);

    return NextResponse.json({
      session_id: idParsed.data,
      state: uiState,
      recommended: snap.recommended,
      ranked_providers: snap.ranked_providers,
      ready_for_results: snap.ready_for_results,
      meta: snap.meta,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[api/assistant/session]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
