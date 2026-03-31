import type { Metadata } from "next";

import { ChatPageLayout } from "@/components/chat/ChatPageLayout";
import { buildCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Assistant Événementiel | GetSoundOn",
  description: "Configuration personnalisée pour votre événement avec recommandations de matériel et prestataires locaux.",
  alternates: { canonical: buildCanonical("/chat") },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialPrompt = typeof params?.prompt === "string" ? params.prompt : "";
  return <ChatPageLayout initialPrompt={initialPrompt} />;
}