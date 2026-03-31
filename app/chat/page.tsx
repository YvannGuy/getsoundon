import type { Metadata } from "next";

import { ChatPageLayout } from "@/components/chat/ChatPageLayout";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Assistant Événementiel | GetSoundOn",
  description: "Configuration personnalisée pour votre événement avec recommandations de matériel et prestataires locaux.",
  alternates: { canonical: buildCanonical("/chat") },
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default function ChatPage({ searchParams }: { searchParams?: SearchParams }) {
  const initialPrompt = typeof searchParams?.prompt === "string" ? searchParams.prompt : "";
  return <ChatPageLayout initialPrompt={initialPrompt} />;
}