import { resolveStoreFromApiRequest } from "@/lib/stores/resolve-store";

export const maxDuration = 60;

type JsonObject = Record<string, unknown>;

type JsonRpcRequest = {
  jsonrpc?: string;
  method?: string;
  id?: unknown;
  params?: {
    name?: string;
    arguments?: JsonObject;
  };
};

function parseBooleanFlag(v: string | null): boolean {
  if (!v) return false;
  return ["1", "true", "yes", "on", "ucp"].includes(v.trim().toLowerCase());
}

function mcpEndpointForStore(shopifyStoreDomain: string, useUcp: boolean): string {
  const shop = shopifyStoreDomain.replace(/\.myshopify\.com$/i, "").trim();
  const base = `https://${shop}.myshopify.com/api`;
  return useUcp ? `${base}/ucp/mcp` : `${base}/mcp`;
}

function withUcpAgentProfile(body: JsonRpcRequest, profile: string): JsonRpcRequest {
  if (body.method !== "tools/call") return body;
  const args = body.params?.arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) return body;

  const metaRaw = args.meta;
  const meta: JsonObject =
    metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)
      ? { ...(metaRaw as JsonObject) }
      : {};
  const existingAgent = meta["ucp-agent"];
  const ucpAgent: JsonObject =
    existingAgent && typeof existingAgent === "object" && !Array.isArray(existingAgent)
      ? { ...(existingAgent as JsonObject) }
      : {};
  if (typeof ucpAgent.profile !== "string" || !ucpAgent.profile.trim()) {
    ucpAgent.profile = profile;
  }
  meta["ucp-agent"] = ucpAgent;

  return {
    ...body,
    params: {
      ...body.params,
      arguments: {
        ...args,
        meta,
      },
    },
  };
}

export async function POST(req: Request) {
  const store = resolveStoreFromApiRequest(req, undefined);
  if (!store) {
    return Response.json(
      {
        error:
          "No store configuration found. Set SHOPIFY_* for single-store mode or MULTI_STORE_CONFIG for multiple stores.",
      },
      { status: 503 },
    );
  }

  if (!store.shopifyStorefrontAccessToken?.trim()) {
    return Response.json(
      { error: `Store "${store.id}" is missing shopifyStorefrontAccessToken.` },
      { status: 503 },
    );
  }

  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = new URL(req.url);
  const useUcp = parseBooleanFlag(url.searchParams.get("ucp"));
  const endpoint = mcpEndpointForStore(store.shopifyStoreDomain, useUcp);
  const profile =
    process.env.SHOPIFY_UCP_AGENT_PROFILE?.trim() ||
    "https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json";
  const outgoingBody = useUcp ? withUcpAgentProfile(body, profile) : body;

  const buyerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": store.shopifyStorefrontAccessToken.trim(),
  };
  if (buyerIp) {
    headers["Shopify-Storefront-Buyer-IP"] = buyerIp;
  }

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(outgoingBody),
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}
