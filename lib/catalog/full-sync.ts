import { getMetafieldIdentifiers, getStorefrontAccessToken, getStorefrontEndpoint } from "@/lib/shopify/env";
import { productToCatalogText } from "@/lib/shopify/normalize";
import type { ProductNode } from "@/lib/shopify/types";

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

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(getStorefrontEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": getStorefrontAccessToken(),
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
  if (!body.data) throw new Error("Empty GraphQL data");
  return body.data;
}

/**
 * Walks all products via Storefront pagination and returns normalized text chunks.
 * Used by /api/sync to warm the in-memory catalog cache (Phase 1; replace with DB/Blob for scale).
 */
export async function fetchFullCatalogChunks(
  pageSize = 50,
  maxProducts = 2000,
): Promise<{ chunks: string[]; handles: string[]; productCount: number }> {
  const ids = getMetafieldIdentifiers();
  const query = ids.length ? PAGE_WITH_MF : PAGE_BASE;
  const chunks: string[] = [];
  const handles: string[] = [];
  let after: string | null = null;
  let total = 0;
  let hasNext = true;

  while (hasNext && total < maxProducts) {
    const variables: Record<string, unknown> = { first: pageSize, after };
    if (ids.length) variables.identifiers = ids;

    const data = await gql<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: ProductNode }>;
      };
    }>(query, variables);

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
