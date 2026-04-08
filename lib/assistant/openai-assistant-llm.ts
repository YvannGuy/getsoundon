import type { EventBrief } from "@/lib/event-assistant/types";
import type { ChatMessage } from "@/lib/event-assistant/types";
import type { MatchingProvider, ProviderScoreBreakdown } from "@/lib/event-assistant/types";
import type { UiRecommendedSetups } from "@/lib/event-assistant/types";
import { formatRequestedItemsForDisplay } from "@/lib/event-assistant/requested-equipment";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";

import {
  getOpenAIAssistantModel,
  getOpenAIClient,
  isOpenAIAssistantLlmConfigured,
} from "./openai-client";

const MAX_DRAFT_CHARS = 14_000;
/** Sortie courte : au-delà, on rejette et on garde le brouillon. */
const MAX_OUTPUT_CHARS = 1_800;

const SYSTEM_INSTRUCTIONS = `Tu es l'assistant conversationnel GetSoundOn (location de matériel événementiel, France).

RÔLE
Tu reçois un BROUILLON déjà produit par un moteur métier déterministe (slots, règles, recommandations, matching). Tu ne décides pas du fond : tu améliores UNIQUEMENT la forme (clarté, ton, fluidité).

INTERDICTIONS ABSOLUES — NE JAMAIS
- Inventer un prestataire, un nom d’entreprise, une offre ou un profil non listé dans le bloc « Prestataires matchés (seule source pour citer un nom) ».
- Inventer un prix, un montant en euros, une promotion, une disponibilité, un stock, une quantité de matériel, un lieu ou une date absents du contexte ou du brouillon.
- Affirmer qu’un prestataire est « compatible », « retenu », « disponible » ou « recommandé » s’il n’apparaît pas dans ce bloc (ou si la liste est vide).
- Décrire le matériel, les services ou les quantités autrement que ce qui figure dans « Recommandation (source de vérité) », « requestedItems » ou le brouillon.
- Promettre réservation, contrat, paiement ou engagement contractuel.
- Ajouter du marketing creux (« solution idéale », « expérience inoubliable », etc.) ou un long discours.

OBLIGATIONS
- T’appuyer UNIQUEMENT sur : brief, requestedItems, recommandation résumée, prestataires matchés (liste fournie), dernier message utilisateur, brouillon.
- Si une information manque, ne pas la supposer : rester générique ou renvoyer à la suite du parcours.
- Conserver les faits et chiffres du brouillon (invités, quantités, types d’équipement) : tu peux reformuler mais ne pas les effacer ni les contredire.
- Respecter la « DIRECTIVE DE SCÉNARIO » fournie dans le message utilisateur : c’est prioritaire sur le style.

STYLE
- Français, professionnel, utile, direct ; pas robotique, pas slogan.
- Court : idéalement moins de 1200 caractères ; jamais de « roman » ni listes interminables.
- Une seule question principale si la qualification est encore incomplète (sauf si le brouillon en pose déjà plusieurs de façon nécessaire — alors reste concis).

SORTIE
- Uniquement le texte final pour l’utilisateur, sans titre « Réponse : », sans markdown imposé.`;

function briefLines(brief: EventBrief): string[] {
  const lines: string[] = [];
  const et = brief.eventType?.value;
  if (et) lines.push(`Type d'événement : ${et}`);
  const gc = brief.guestCount?.value;
  if (typeof gc === "number") lines.push(`Invités (estim.) : ${gc}`);
  const loc = brief.location?.value;
  if (loc?.city || loc?.label) lines.push(`Lieu : ${loc.city ?? loc.label}`);
  const sn = brief.serviceNeeds?.value;
  if (sn?.length) lines.push(`Besoins services (slots) : ${sn.join(", ")}`);
  return lines;
}

function recommendedSummary(rec: UiRecommendedSetups): string {
  const parts = rec.tiers.slice(0, 3).map((tier) => {
    const items = tier.items
      .slice(0, 12)
      .map((i) => (i.quantity ? `${i.quantity}× ${i.label}` : i.label))
      .join("; ");
    return `${tier.title}: ${items || "—"}`;
  });
  return [rec.summary ? `Résumé : ${rec.summary}` : "", ...parts].filter(Boolean).join("\n");
}

function rankedProvidersForLlm(
  ranked: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>,
  matchesStub: boolean,
): string {
  if (ranked.length === 0) {
    return "Aucun prestataire dans la liste matchée pour ce tour (0 résultat). Ne dis pas qu’il y a des profils à parcourir ni ne cite de noms.";
  }
  const lines = ranked.slice(0, 10).map((r, i) => {
    const p = r.provider;
    return `${i + 1}. ${p.title} — ${p.location}`;
  });
  const stubNote = matchesStub
    ? "\n(Note interne : données d’exemple / démo — ne présente pas comme une offre réelle vérifiée ; reste factuel et prudent.)"
    : "";
  return `Nombre affiché : ${ranked.length}\nTu peux mentionner UNE transition vers les fiches pour ces titres exacts uniquement ; ne rajoute aucun autre nom ni détail (prix, note, stock) non fourni ici.\n${lines.join("\n")}${stubNote}`;
}

function buildFlowDirective(ctx: AssistantLlmContext): string {
  const n = ctx.rankedProviders.length;
  const ready = ctx.readyForResults;

  if (!ready) {
    return [
      "Scénario : QUALIFICATION EN COURS.",
      "- Réécris court : une reformulation utile et/ou UNE question claire prioritaire.",
      "- N’annonce pas encore de configuration finale ni de liste de prestataires.",
      "- Ne dis pas que la recommandation est « prête » ou « affichée ».",
    ].join("\n");
  }

  if (n === 0) {
    return [
      "Scénario : RECOMMANDATION / RÉSULTATS SANS PRESTATAIRE MATCHÉ.",
      "- Tu peux résumer la configuration proposée d’après le bloc recommandation + brouillon.",
      "- Dis honnêtement qu’aucun prestataire n’a été retenu dans les résultats pour l’instant (ou qu’il n’y a pas encore de correspondance à afficher).",
      "- N’invente pas de prestataires, n’invite pas à un carousel fictif, ne promets pas de mise en relation immédiate.",
    ].join("\n");
  }

  return [
    "Scénario : RECOMMANDATION + PRESTATAIRES MATCHÉS.",
    "- Résume la reco si pertinent, puis enchaîne vers la consultation des profils listés ci-dessous.",
    "- Cite uniquement les titres fournis dans « Prestataires matchés » ; aucun nom, prix ou détail en plus.",
    "- Ne garantis pas disponibilité ni compatibilité absolue : le matching est une suggestion basée sur les critères actuels.",
  ].join("\n");
}

function hasEuroAmount(text: string): boolean {
  return /€|eur\b|euros?\b|\d+\s*[.,]\d{2}\s*€/i.test(text);
}

/**
 * Phrases typiques d’hallucination quand il n’y a aucun prestataire matché.
 */
function suggestsFakeProviderListWhenEmpty(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /\bvoici\s+(les\s+)?(profils?|prestataires?|partenaires?)\b/.test(t) ||
    /\bvoilà\s+(les\s+)?(profils?|prestataires?)\b/.test(t) ||
    /\b(j’ai|j'ai|nous avons)\s+(sélectionné|retenu|trouvé)\s+\d+\s+prestataires?\b/.test(t) ||
    /\bplusieurs\s+prestataires?\s+(compatibles?|disponibles?)\b/.test(t) ||
    /\bdécouvrez\s+(les\s+)?prestataires?\b/.test(t) ||
    /\bparcourez\s+(les\s+)?(fiches?|profils?)\s+ci-dessous\b/.test(t)
  ) {
    return true;
  }
  return false;
}

function deniesProvidersWhenSomeExist(text: string, count: number): boolean {
  if (count === 0) return false;
  return /\bachun\s+prestataire\b|\bpas\s+de\s+prestataire\b|\baucune\s+offre\s+disponible\b/i.test(text);
}

/** Formes juridiques : si le modèle en ajoute alors qu’aucun titre matché ni le brouillon n’en contient, probable hallucination. */
function citesLegalFormWithoutSource(polished: string, ranked: Array<{ provider: MatchingProvider }>, draft: string): boolean {
  const legal = /\b(SARL|SAS|SASU|EURL|SA)\b/i;
  if (!legal.test(polished)) return false;
  if (legal.test(draft)) return false;
  return !ranked.some((r) => legal.test(r.provider.title));
}

/**
 * Garde-fous post-modèle : false = rejeter la sortie et garder le brouillon.
 */
export function validatePolishedAssistantText(
  polished: string,
  draft: string,
  ctx: AssistantLlmContext,
): boolean {
  const text = polished.trim();
  if (!text || text.length > MAX_OUTPUT_CHARS) return false;

  if (hasEuroAmount(text) && !hasEuroAmount(draft) && !hasEuroAmount(ctx.lastUserMessage)) {
    return false;
  }

  if (ctx.rankedProviders.length === 0 && suggestsFakeProviderListWhenEmpty(text)) {
    return false;
  }

  if (deniesProvidersWhenSomeExist(text, ctx.rankedProviders.length)) {
    return false;
  }

  if (citesLegalFormWithoutSource(text, ctx.rankedProviders, draft)) {
    return false;
  }

  return true;
}

export type AssistantLlmContext = {
  engineState: ConversationEngineState;
  brief: EventBrief;
  recommended: UiRecommendedSetups;
  rankedProviders: Array<{ provider: MatchingProvider; score: ProviderScoreBreakdown }>;
  /** Aligné sur meta API : stub ou liste vide côté matching */
  matchesStub: boolean;
  readyForResults: boolean;
  lastUserMessage: string;
  draftAssistantMessage: ChatMessage;
};

function shouldPolishMessage(msg: ChatMessage): boolean {
  return msg.role === "assistant" && msg.kind !== "system_note";
}

/**
 * Retourne le texte amélioré, ou undefined si skip / erreur / garde-fous (appelant garde le brouillon).
 */
export async function polishAssistantMessageWithResponsesApi(
  ctx: AssistantLlmContext,
): Promise<string | undefined> {
  if (!isOpenAIAssistantLlmConfigured()) return undefined;

  const draft = ctx.draftAssistantMessage;
  if (!shouldPolishMessage(draft)) return undefined;
  if (draft.content.length > MAX_DRAFT_CHARS) {
    console.warn("[openai-assistant-llm] draft too long, skip LLM");
    return undefined;
  }

  const client = getOpenAIClient();
  if (!client) return undefined;

  const req = formatRequestedItemsForDisplay(ctx.engineState.requestedItems ?? []);
  const excluded = (ctx.engineState.excludedEquipmentTypes ?? []).join(", ") || "—";
  const flow = buildFlowDirective(ctx);

  const userBlock = [
    "=== DIRECTIVE DE SCÉNARIO (obligatoire) ===",
    flow,
    "",
    `Phase qualification (moteur) : ${ctx.engineState.qualification.stage}`,
    `ready_for_results : ${ctx.readyForResults ? "oui" : "non"}`,
    `Type de message assistant : ${draft.kind}`,
    "",
    "=== Contexte brief (slots) ===",
    ...briefLines(ctx.brief),
    "",
    "=== Matériel structuré (requestedItems) — ne pas perdre les quantités ===",
    req || "—",
    `Exclusions : ${excluded}`,
    "",
    "=== Recommandation (source de vérité matériel / tiers) ===",
    recommendedSummary(ctx.recommended) || "—",
    "",
    "=== Prestataires matchés (seule source pour citer un nom) ===",
    rankedProvidersForLlm(ctx.rankedProviders, ctx.matchesStub),
    "",
    "=== Dernier message utilisateur ===",
    ctx.lastUserMessage,
    "",
    "=== BROUILLON À RÉÉCRIRE (conserver les faits) ===",
    draft.content,
  ].join("\n");

  try {
    const response = await client.responses.create({
      model: getOpenAIAssistantModel(),
      instructions: SYSTEM_INSTRUCTIONS,
      input: userBlock,
      temperature: 0.35,
    });

    const text =
      typeof (response as { output_text?: string }).output_text === "string"
        ? (response as { output_text: string }).output_text.trim()
        : "";

    if (!text) {
      console.warn("[openai-assistant-llm] empty model output, keeping draft");
      return undefined;
    }

    if (!validatePolishedAssistantText(text, draft.content, ctx)) {
      console.warn("[openai-assistant-llm] output failed post-guards, keeping draft");
      return undefined;
    }

    return text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[openai-assistant-llm] Responses API error:", msg);
    return undefined;
  }
}

export function replaceLastAssistantContent(
  state: ConversationEngineState,
  newContent: string,
): ConversationEngineState {
  const messages = [...state.messages];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "assistant") {
      messages[i] = { ...m, content: newContent };
      return { ...state, messages };
    }
  }
  return state;
}
