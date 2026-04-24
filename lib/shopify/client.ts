import { getMetafieldIdentifiers, getStorefrontAccessToken, getStorefrontEndpoint } from "./env";
import {
  PRODUCT_BY_HANDLE_BASE,
  PRODUCT_BY_HANDLE_WITH_METAFIELDS,
  SEARCH_PRODUCTS_BASE,
  SEARCH_PRODUCTS_WITH_METAFIELDS,
} from "./queries";
import type { ProductNode } from "./types";

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

export async function storefrontRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
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
  if (!body.data) {
    throw new Error("Empty GraphQL data from Shopify");
  }
  return body.data;
}

function metafieldVariables(): Record<string, unknown> | null {
  const ids = getMetafieldIdentifiers();
  if (!ids.length) return null;
  return { identifiers: ids };
}

export async function searchProducts(query: string, first = 8): Promise<ProductNode[]> {
  const mf = metafieldVariables();
  if (mf) {
    const data = await storefrontRequest<{
      products: { edges: Array<{ node: ProductNode }> };
    }>(SEARCH_PRODUCTS_WITH_METAFIELDS, { query, first, ...mf });
    return data.products.edges.map((e) => e.node);
  }
  const data = await storefrontRequest<{
    products: { edges: Array<{ node: ProductNode }> };
  }>(SEARCH_PRODUCTS_BASE, { query, first });
  return data.products.edges.map((e) => e.node);
}

export async function productByHandle(handle: string): Promise<ProductNode | null> {
  const mf = metafieldVariables();
  if (mf) {
    const data = await storefrontRequest<{
      productByHandle: ProductNode | null;
    }>(PRODUCT_BY_HANDLE_WITH_METAFIELDS, { handle, ...mf });
    return data.productByHandle;
  }
  const data = await storefrontRequest<{
    productByHandle: ProductNode | null;
  }>(PRODUCT_BY_HANDLE_BASE, { handle });
  return data.productByHandle;
}
