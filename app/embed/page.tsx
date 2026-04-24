import type { Metadata } from "next";

import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "From My Heart — Chat",
  description: "Embedded jewellery assistant for fromyheart.com",
};

export default function EmbedPage() {
  return (
    <div className="h-dvh min-h-[400px] bg-background">
      <ChatPanel compact />
    </div>
  );
}
