import OpenAI from "openai";

let singleton: OpenAI | null = null;

/**
 * Client serveur uniquement. Jamais importé depuis un composant client.
 */
export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!singleton) {
    singleton = new OpenAI({
      apiKey: key,
      maxRetries: 1,
      timeout: 45_000,
    });
  }
  return singleton;
}

export function getOpenAIAssistantModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Désactive explicitement le LLM même si une clé est présente. */
export function isOpenAIAssistantExplicitlyDisabled(): boolean {
  const v = process.env.OPENAI_ASSISTANT_ENABLED?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off";
}

export function isOpenAIAssistantLlmConfigured(): boolean {
  if (isOpenAIAssistantExplicitlyDisabled()) return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
