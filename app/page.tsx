import { ChatPanel } from "@/components/chat-panel";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-3 py-6 dark:bg-black md:px-8 md:py-10">
      <ChatPanel />
    </div>
  );
}
