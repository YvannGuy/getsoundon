import type { AssistantStatus } from "@/lib/event-assistant/types";
import type { ConversationEngineState } from "@/lib/event-assistant/v2-types";
import type { EventBrief } from "@/lib/event-assistant/types";

/**
 * Shape attendu par les composants existants (AssistantChat, carrousels).
 */
export type AssistantUiBridgeState = {
  messages: ConversationEngineState["messages"];
  brief: EventBrief;
  qualification: ConversationEngineState["qualification"];
  status: AssistantStatus;
  isExpanded: boolean;
  isTyping: boolean;
};

export function toUiBridgeState(
  engine: ConversationEngineState,
  brief: EventBrief,
  readyForResults: boolean,
): AssistantUiBridgeState {
  const status: AssistantStatus = readyForResults ? "ready" : engine.messages.length > 0 ? "chatting" : "idle";
  return {
    messages: engine.messages,
    brief,
    qualification: engine.qualification,
    status,
    isExpanded: true,
    isTyping: false,
  };
}
