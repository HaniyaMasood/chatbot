import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { createCatalogTools } from "@/lib/chat/catalog-tools";
import { buildAssistantSystemPrompt } from "@/lib/prompts/store-assistant-prompt";
import { resolveStoreFromApiRequest } from "@/lib/stores/resolve-store";

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

type ChatBody = {
  messages?: UIMessage[];
  storeId?: string;
};

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

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "Expected { messages: UIMessage[] }" }, { status: 400 });
  }

  const store = resolveStoreFromApiRequest(req, body.storeId);
  if (!store) {
    return Response.json(
      {
        error:
          "No store configuration found. Set SHOPIFY_* for single-store mode or MULTI_STORE_CONFIG for multiple stores. See docs/version-2-multistore.md",
      },
      { status: 503 },
    );
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

  const catalogTools = createCatalogTools(store);
  const system = buildAssistantSystemPrompt(store);

  const result = streamText({
    model: litellm.chat(modelId),
    system,
    messages: await convertToModelMessages(messages, { tools: catalogTools }),
    tools: catalogTools,
    stopWhen: stepCountIs(12),
    providerOptions: {
      openai: {
        parallelToolCalls: false,
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
