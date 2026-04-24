import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { catalogTools } from "@/lib/chat/catalog-tools";
import { JEWELRY_SYSTEM_PROMPT } from "@/lib/jewelry-system-prompt";

export const maxDuration = 60;

/** OpenAI-compatible LiteLLM proxy; must end with `/v1` for the AI SDK. */
function getLiteLlmBaseUrl(): string {
  let raw =
    process.env.LITELLM_BASE_URL?.trim() ||
    "https://litellm.arbisoft.com/v1";
  raw = raw.replace(/\/+$/, "");
  if (!raw.endsWith("/v1")) {
    raw = `${raw}/v1`;
  }
  return raw;
}

function getLiteLlmApiKey(): string | undefined {
  return (
    process.env.LITELLM_API_KEY?.trim() ||
    process.env.LITELLM_VIRTUAL_KEY?.trim() ||
    undefined
  );
}

export async function POST(req: Request) {
  const apiKey = getLiteLlmApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Set LITELLM_API_KEY (your LiteLLM / LibreChat proxy key). Optional: LITELLM_BASE_URL (default https://litellm.arbisoft.com/v1). See .env.example.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "Expected { messages: UIMessage[] }" }, { status: 400 });
  }

  const modelId =
    process.env.LITELLM_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "groq/llama-3.1-8b-instant";

  const litellm = createOpenAI({
    name: "litellm",
    baseURL: getLiteLlmBaseUrl(),
    apiKey,
  });

  const result = streamText({
    model: litellm.chat(modelId),
    system: JEWELRY_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools: catalogTools }),
    tools: catalogTools,
    stopWhen: stepCountIs(12),
  });

  return result.toUIMessageStreamResponse();
}
