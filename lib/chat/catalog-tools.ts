import { tool } from "ai";
import { z } from "zod";

import { isStoreShopifyConfigured } from "@/lib/shopify/graphql-for-store";
import { resolveHandleFromProductUrl } from "@/lib/shopify/parse-product-url";
import type { ResolvedStore } from "@/lib/stores/types";

type CatalogMoney = { amount?: number; currency?: string };
type CatalogVariant = {
  title?: string;
  price?: CatalogMoney;
  availability?: { available?: boolean };
  options?: Array<{ name?: string; label?: string }>;
};
type CatalogProduct = {
  id?: string;
  title?: string;
  url?: string;
  description?: { html?: string };
  price_range?: { min?: CatalogMoney; max?: CatalogMoney };
  variants?: CatalogVariant[];
};

function shopifyMcpEndpoint(store: ResolvedStore): string {
  const shop = store.shopifyStoreDomain.replace(/\.myshopify\.com$/i, "").trim();
  return `https://${shop}.myshopify.com/api/ucp/mcp`;
}

async function callShopifyMcpTool(
  store: ResolvedStore,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(shopifyMcpEndpoint(store), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": store.shopifyStorefrontAccessToken,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `chat-${Date.now()}`,
      method: "tools/call",
      params: {
        name,
        arguments: {
          ...args,
          meta: {
            "ucp-agent": {
              profile:
                process.env.SHOPIFY_UCP_AGENT_PROFILE?.trim() ||
                "https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json",
            },
          },
        },
      },
    }),
    cache: "no-store",
  });

  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Shopify MCP HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  if (body.error) {
    throw new Error(`Shopify MCP error: ${JSON.stringify(body.error)}`);
  }
  return body;
}

function parseProductsFromSearchResponse(payload: Record<string, unknown>): CatalogProduct[] {
  const products = payload.products;
  if (!Array.isArray(products)) return [];
  return products.filter((p): p is CatalogProduct => typeof p === "object" && p !== null);
}

function summarizeProduct(p: CatalogProduct): string {
  const min = p.price_range?.min;
  const max = p.price_range?.max;
  const price =
    min && max
      ? `${min.currency ?? ""} ${Number(min.amount ?? 0) / 100} - ${Number(max.amount ?? 0) / 100}`.trim()
      : "price not available";
  const variants =
    p.variants
      ?.slice(0, 6)
      .map((v) => {
        const vPrice =
          v.price?.amount != null
            ? `${v.price.currency ?? ""} ${Number(v.price.amount) / 100}`.trim()
            : "n/a";
        const inStock = v.availability?.available ? "in stock" : "availability unknown";
        return `- ${v.title ?? "Variant"} (${vPrice}; ${inStock})`;
      })
      .join("\n") ?? "";
  return [
    `Title: ${p.title ?? "Unknown"}`,
    p.url ? `URL: ${p.url}` : undefined,
    `Price: ${price}`,
    variants ? `Variants:\n${variants}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createCatalogTools(store: ResolvedStore | null) {
  const brand = store?.brandName ?? "this store";

  return {
    searchShopifyCatalog: tool({
      description: `Search the ${brand} Shopify catalog via Storefront MCP. Use a concrete search string (e.g. ring, gold, controller). Max 15 products per call.`,
      inputSchema: z.object({
        query: z
          .string()
          .describe("Search string (non-empty). Examples: gold necklace, controller, gift"),
        limit: z.coerce
          .number()
          .min(1)
          .max(15)
          .optional()
          .describe("Max products to return (default 8, hard max 15)"),
      }),
      execute: async ({ query, limit }) => {
        if (!store || !isStoreShopifyConfigured(store)) {
          return {
            ok: false as const,
            error: "Shopify Storefront MCP is not configured for this store.",
          };
        }
        try {
          const q = query.trim() || "products";
          const lim = Math.min(Math.max(Number(limit) || 8, 1), 15);
          const rpc = await callShopifyMcpTool(store, "search_catalog", {
            catalog: {
              query: q,
              pagination: { limit: lim },
            },
          });
          const products = parseProductsFromSearchResponse(rpc);
          return {
            ok: true as const,
            context: products.length
              ? products
                  .map((p, i) => `--- Product ${i + 1} ---\n${summarizeProduct(p)}`)
                  .join("\n\n")
              : "No products found.",
            productIds: products.map((p) => p.id).filter(Boolean),
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return { ok: false as const, error: `Shopify MCP search failed: ${message}` };
        }
      },
    }),

    getProductByHandle: tool({
      description: `Load one product for ${brand}. Use productUrl when the customer pastes a full link (https://.../products/...). Otherwise pass handle only (slug after /products/).`,
      inputSchema: z
        .object({
          handle: z
            .string()
            .optional()
            .describe("Product handle only, e.g. retro-pocket-handheld-console-with-hd-ips-screen-15000-games"),
          productUrl: z
            .string()
            .optional()
            .describe("Full product page URL for this store, e.g. https://retroidpk.com/products/..."),
        })
        .refine((d) => Boolean(d.handle?.trim() || d.productUrl?.trim()), {
          message: "Provide either handle or productUrl",
        }),
      execute: async ({ handle, productUrl }) => {
        if (!store || !isStoreShopifyConfigured(store)) {
          return {
            ok: false as const,
            error: "Shopify Storefront MCP is not configured for this store.",
          };
        }

        let resolvedHandle = handle?.trim() ?? "";
        const url = productUrl?.trim();
        if (url) {
          const parsed = resolveHandleFromProductUrl(url, store);
          if (!parsed.ok) return { ok: false as const, error: parsed.error };
          resolvedHandle = parsed.handle;
        }

        if (!resolvedHandle) {
          return { ok: false as const, error: "Missing product handle or productUrl." };
        }

        try {
          const searchRpc = await callShopifyMcpTool(store, "search_catalog", {
            catalog: { query: resolvedHandle, pagination: { limit: 15 } },
          });
          const candidates = parseProductsFromSearchResponse(searchRpc);
          const best = candidates.find((p) => p.url?.includes(`/products/${resolvedHandle}`));
          if (!best?.id) {
            return {
              ok: false as const,
              error: `No product found for handle "${resolvedHandle}".`,
            };
          }

          const detailRpc = await callShopifyMcpTool(store, "get_product_details", {
            product_id: best.id,
          });
          const detail = (detailRpc.product ?? best) as CatalogProduct;
          return { ok: true as const, context: summarizeProduct(detail) };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return { ok: false as const, error: `Shopify MCP lookup failed: ${message}` };
        }
      },
    }),
  };
}
