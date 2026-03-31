"use client";

import { useAssistantConversation, ReturnTypeUseAssistant } from "./useAssistantConversation";
import { useAssistantConversationV2, ReturnTypeUseAssistantV2 } from "./useAssistantConversationV2";
import { isV2Enabled, migrateStorageFromV1 } from "@/lib/event-assistant/migration-v2";

// ============================================================================
// UNIFIED INTERFACE
// ============================================================================

type UnifiedAssistantReturn = ReturnTypeUseAssistant & {
  // V2 specific extensions (optional)
  engineState?: ReturnTypeUseAssistantV2['engineState'];
  dialogueStats?: ReturnTypeUseAssistantV2['dialogueStats'];
  
  // Metadata
  version: "v1" | "v2";
  canUpgrade: boolean;
};

// ============================================================================
// ADAPTER HOOK
// ============================================================================

export function useAssistantConversationAdapter(): UnifiedAssistantReturn {
  const useV2 = isV2Enabled();
  
  // Run one-time migration if needed
  if (useV2 && typeof window !== "undefined") {
    migrateStorageFromV1();
  }
  
  if (useV2) {
    return useV2Hook();
  } else {
    return useV1Hook();
  }
}

// ============================================================================
// V2 HOOK WRAPPER
// ============================================================================

function useV2Hook(): UnifiedAssistantReturn {
  const v2Result = useAssistantConversationV2();
  
  return {
    ...v2Result,
    version: "v2",
    canUpgrade: false, // Already on V2
    
    // V2 specific data
    engineState: v2Result.engineState,
    dialogueStats: v2Result.dialogueStats
  };
}

// ============================================================================
// V1 HOOK WRAPPER  
// ============================================================================

function useV1Hook(): UnifiedAssistantReturn {
  const v1Result = useAssistantConversation();
  
  return {
    ...v1Result,
    version: "v1",
    canUpgrade: true,
    
    // V2 data (not available in V1)
    engineState: undefined,
    dialogueStats: undefined
  };
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export type ReturnTypeUseAssistantAdapter = ReturnType<typeof useAssistantConversationAdapter>;

// Re-export for backward compatibility
export { useAssistantConversation as useAssistantConversationV1 };
export { useAssistantConversationV2 };

// ============================================================================
// HOOKS FOR TESTING/DEBUGGING  
// ============================================================================

export function useAssistantConversationForced(version: "v1" | "v2"): UnifiedAssistantReturn {
  if (version === "v2") {
    return useV2Hook();
  } else {
    return useV1Hook();
  }
}

export function useAssistantConversationWithFallback(): UnifiedAssistantReturn {
  try {
    return useV2Hook();
  } catch (error) {
    console.warn("V2 assistant failed, falling back to V1:", error);
    return useV1Hook();
  }
}