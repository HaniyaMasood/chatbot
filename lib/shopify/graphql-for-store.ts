import { productToCatalogText } from "@/lib/shopify/normalize";
import {
  PRODUCT_BY_HANDLE_BASE,
  PRODUCT_BY_HANDLE_WITH_METAFIELDS,
  SEARCH_PRODUCTS_BASE,
  SEARCH_PRODUCTS_WITH_METAFIELDS,
} from "@/lib/shopify/queries";
import type { ProductNode } from "@/lib/shopify/types";
import type { ResolvedStore } from "@/lib/stores/types";

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

export function storefrontEndpointForStore(store: ResolvedStore): string {
  const shop = store.shopifyStoreDomain.replace(/\.myshopify\.com$/i, "");
  const version = store.shopifyStorefrontApiVersion?.trim() || "2025-01";
  return `https://${shop}.myshopify.com/api/${version}/graphql.json`;
}

export async function storefrontGraphql<T>(
  store: ResolvedStore,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(storefrontEndpointForStore(store), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": store.shopifyStorefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront HTTP ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  if (!body.data) {
    throw new Error("Empty GraphQL data from Shopify");
  }
  return body.data;
}

function metafieldVariables(store: ResolvedStore): Record<string, unknown> | null {
  const ids = store.metafieldIdentifiers ?? [];
  if (!ids.length) return null;
  return { identifiers: ids };
}

export async function searchProductsForStore(
  store: ResolvedStore,
  query: string,
  first = 8,
): Promise<ProductNode[]> {
  const mf = metafieldVariables(store);
  if (mf) {
    const data = await storefrontGraphql<{
      products: { edges: Array<{ node: ProductNode }> };
    }>(store, SEARCH_PRODUCTS_WITH_METAFIELDS, { query, first, ...mf });
    return data.products.edges.map((e) => e.node);
  }
  const data = await storefrontGraphql<{
    products: { edges: Array<{ node: ProductNode }> };
  }>(store, SEARCH_PRODUCTS_BASE, { query, first });
  return data.products.edges.map((e) => e.node);
}

export async function productByHandleForStore(
  store: ResolvedStore,
  handle: string,
): Promise<ProductNode | null> {
  const mf = metafieldVariables(store);
  if (mf) {
    const data = await storefrontGraphql<{
      productByHandle: ProductNode | null;
    }>(store, PRODUCT_BY_HANDLE_WITH_METAFIELDS, { handle, ...mf });
    return data.productByHandle;
  }
  const data = await storefrontGraphql<{
    productByHandle: ProductNode | null;
  }>(store, PRODUCT_BY_HANDLE_BASE, { handle });
  return data.productByHandle;
}

const PAGE_WITH_MF = /* GraphQL */ `
  query CatalogPage($first: Int!, $after: String, $identifiers: [HasMetafieldsIdentifier!]!) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          handle
          description
          tags
          onlineStoreUrl
          availableForSale
          metafields(identifiers: $identifiers) {
            namespace
            key
            value
            type
          }
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

const PAGE_BASE = /* GraphQL */ `
  query CatalogPage($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          handle
          description
          tags
          onlineStoreUrl
          availableForSale
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchFullCatalogChunksForStore(
  store: ResolvedStore,
  pageSize = 50,
  maxProducts = 2000,
): Promise<{ chunks: string[]; handles: string[]; productCount: number }> {
  const ids = store.metafieldIdentifiers ?? [];
  const query = ids.length ? PAGE_WITH_MF : PAGE_BASE;
  const chunks: string[] = [];
  const handles: string[] = [];
  let after: string | null = null;
  let total = 0;
  let hasNext = true;

  while (hasNext && total < maxProducts) {
    const variables: Record<string, unknown> = { first: pageSize, after };
    if (ids.length) variables.identifiers = ids;

    const data = await storefrontGraphql<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: ProductNode }>;
      };
    }>(store, query, variables);

    for (const e of data.products.edges) {
      chunks.push(productToCatalogText(e.node));
      handles.push(e.node.handle);
      total += 1;
      if (total >= maxProducts) break;
    }

    hasNext = data.products.pageInfo.hasNextPage && total < maxProducts;
    after = data.products.pageInfo.endCursor;
    if (!data.products.edges.length) break;
  }

  return { chunks, handles, productCount: total };
}

export function isStoreShopifyConfigured(store: ResolvedStore | null): boolean {
  return Boolean(
    store?.shopifyStoreDomain?.trim() && store?.shopifyStorefrontAccessToken?.trim(),
  );
}
