import { tool } from "ai";
import { z } from "zod";

import { searchCachedCatalogChunks } from "@/lib/catalog/cache";
import {
  isStoreShopifyConfigured,
  productByHandleForStore,
  searchProductsForStore,
} from "@/lib/shopify/graphql-for-store";
import { resolveHandleFromProductUrl } from "@/lib/shopify/parse-product-url";
import { productToCatalogText, productsToContextBlock } from "@/lib/shopify/normalize";
import type { ResolvedStore } from "@/lib/stores/types";

export function createCatalogTools(store: ResolvedStore | null) {
  const sid = store?.id ?? "default";
  const brand = store?.brandName ?? "this store";

  return {
    searchShopifyCatalog: tool({
      description: `Search the ${brand} Shopify catalog. Use a concrete search string (e.g. ring, gold, controller). For a broad first page of active products use query "status:active". Max 15 products per call.`,
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Storefront search string (non-empty). Examples: gold necklace, status:active, gift",
          ),
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
            error: "Shopify Storefront API is not configured for this store.",
          };
        }
        try {
          const q = query.trim() || "status:active";
          const lim = Math.min(Math.max(Number(limit) || 8, 1), 15);
          const products = await searchProductsForStore(store, q, lim);
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
            error: "Shopify Storefront API is not configured for this store.",
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
          const product = await productByHandleForStore(store, resolvedHandle);
          if (!product) {
            return {
              ok: false as const,
              error: `No product found for handle "${resolvedHandle}". The handle may differ on Shopify, or the product may be unpublished to the Storefront API.`,
            };
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
        "Search the last server-side catalog snapshot synced via /api/sync for this store (substring match). Use with live Shopify search when the snapshot may contain richer merged text.",
      inputSchema: z.object({
        query: z.string().describe("Search phrase to match against synced catalog chunks"),
      }),
      execute: async ({ query }) => {
        const hits = searchCachedCatalogChunks(sid, query, 10);
        if (!hits.length) {
          return {
            ok: true as const,
            context:
              "No matching chunks in the local catalog snapshot for this store. Run POST /api/sync?storeId=... or rely on searchShopifyCatalog.",
          };
        }
        return {
          ok: true as const,
          context: hits.map((h, i) => `--- Snapshot ${i + 1} ---\n${h}`).join("\n\n"),
        };
      },
    }),
  };
}
