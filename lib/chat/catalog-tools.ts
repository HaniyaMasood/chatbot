import { tool } from "ai";
import { z } from "zod";

import { searchCachedCatalogChunks } from "@/lib/catalog/cache";
import { productByHandle, searchProducts } from "@/lib/shopify/client";
import { isShopifyConfigured } from "@/lib/shopify/env";
import { productToCatalogText, productsToContextBlock } from "@/lib/shopify/normalize";

export const catalogTools = {
  searchShopifyCatalog: tool({
    description:
      "Search the From My Heart Shopify catalog by keywords (e.g. gold ring, necklace, earrings, diamond). Returns titles, handles, descriptions, tags, variants, prices, and configured metafields. Use this before answering product questions.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Storefront search query, e.g. product type, material, or name fragment"),
      limit: z
        .number()
        .min(1)
        .max(15)
        .optional()
        .describe("Max products to return (default 8)"),
    }),
    execute: async ({ query, limit }) => {
      if (!isShopifyConfigured()) {
        return {
          ok: false as const,
          error:
            "Shopify Storefront API is not configured (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN).",
        };
      }
      try {
        const products = await searchProducts(query, limit ?? 8);
        return {
          ok: true as const,
          context: productsToContextBlock(products),
          handles: products.map((p) => p.handle),
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false as const, error: `Shopify search failed: ${message}` };
      }
    },
  }),

  getProductByHandle: tool({
    description:
      "Load a single product by its Shopify handle (URL slug). Use when the customer names a specific product or you have a handle from search results.",
    inputSchema: z.object({
      handle: z.string().describe("Product handle, e.g. from the URL /products/{handle}"),
    }),
    execute: async ({ handle }) => {
      if (!isShopifyConfigured()) {
        return {
          ok: false as const,
          error:
            "Shopify Storefront API is not configured (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN).",
        };
      }
      try {
        const product = await productByHandle(handle.trim());
        if (!product) {
          return { ok: false as const, error: `No product found for handle "${handle}".` };
        }
        return { ok: true as const, context: productToCatalogText(product) };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false as const, error: `Shopify lookup failed: ${message}` };
      }
    },
  }),

  searchLocalCatalogSnapshot: tool({
    description:
      "Search the last server-side catalog snapshot synced via /api/sync (substring match). Use together with live Shopify search when the snapshot may contain richer merged text.",
    inputSchema: z.object({
      query: z.string().describe("Search phrase to match against synced catalog chunks"),
    }),
    execute: async ({ query }) => {
      const hits = searchCachedCatalogChunks(query, 10);
      if (!hits.length) {
        return {
          ok: true as const,
          context:
            "No matching chunks in the local catalog snapshot. Run POST /api/sync or rely on searchShopifyCatalog.",
        };
      }
      return {
        ok: true as const,
        context: hits.map((h, i) => `--- Snapshot ${i + 1} ---\n${h}`).join("\n\n"),
      };
    },
  }),
};
