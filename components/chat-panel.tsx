"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

type ChatPanelProps = {
  /** Compact layout for /embed iframe */
  compact?: boolean;
};

function MessageBody({
  message,
}: {
  message: { role: string; parts: Array<{ type: string; text?: string; toolName?: string }> };
}) {
  return (
    <div className="space-y-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
      {message.parts.map((part, index) => {
        if (part.type === "text" && part.text) {
          return <span key={index}>{part.text}</span>;
        }
        if (part.type.startsWith("tool-")) {
          return (
            <span
              key={index}
              className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            >
              Catalog lookup
            </span>
          );
        }
        return null;
      })}
    </div>
  );
}

export function ChatPanel({ compact }: ChatPanelProps) {
  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  const busy = status === "submitted" || status === "streaming";

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-[320px] flex-col bg-background"
          : "mx-auto flex h-[min(720px,calc(100vh-8rem))] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      }
    >
      <header
        className={
          compact
            ? "border-b border-zinc-200 px-3 py-2 dark:border-zinc-800"
            : "border-b border-zinc-200 px-4 py-3 dark:border-zinc-800"
        }
      >
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          From My Heart
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Jewellery assistant — answers use your live catalog when configured.
        </p>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 md:px-4">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ask about materials, sizing, a product you saw on the site, or gift ideas.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-2xl bg-zinc-900 px-3 py-2 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "mr-6 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60"
              }
            >
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <MessageBody message={m as { role: string; parts: { type: string; text?: string }[] }} />
            </div>
          ))}
          {busy && status === "submitted" && (
            <p className="text-xs text-zinc-500">Thinking…</p>
          )}
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            Something went wrong.{" "}
            <button type="button" className="underline" onClick={() => clearError()}>
                Dismiss
              </button>
          </div>
        )}

        <form
          className="border-t border-zinc-200 p-2 dark:border-zinc-800"
          onSubmit={(e) => {
            e.preventDefault();
            const t = input.trim();
            if (!t || busy) return;
            sendMessage({ text: t });
            setInput("");
          }}
        >
          <div className="flex gap-2">
            <textarea
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              rows={compact ? 2 : 2}
              placeholder="Ask about a piece…"
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex flex-col gap-1">
              {busy ? (
                <button
                  type="button"
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-medium dark:border-zinc-600"
                  onClick={() => void stop()}
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  disabled={!input.trim()}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
