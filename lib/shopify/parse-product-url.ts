import type { ResolvedStore } from "@/lib/stores/types";

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function allowedProductPageHosts(store: ResolvedStore): Set<string> {
  const hosts = new Set<string>();
  for (const h of store.hosts) {
    hosts.add(normalizeHost(h));
  }
  try {
    hosts.add(normalizeHost(new URL(store.primarySiteUrl).hostname));
  } catch {
    /* ignore */
  }
  const sub = store.shopifyStoreDomain.replace(/\.myshopify\.com$/i, "").toLowerCase();
  hosts.add(`${sub}.myshopify.com`);
  return hosts;
}

const PRODUCT_PATH = /^\/(?:[a-z]{2}\/)?products\/([^/?#]+)\/?$/i;

/**
 * Extract Shopify product handle from a storefront product URL for this store's configured hosts.
 */
export function resolveHandleFromProductUrl(
  rawUrl: string,
  store: ResolvedStore,
): { ok: true; handle: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Invalid product URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) product URLs are supported." };
  }

  const host = normalizeHost(url.hostname);
  const allowed = allowedProductPageHosts(store);
  if (!allowed.has(host)) {
    return {
      ok: false,
      error: `That link's host (${host}) is not configured for ${store.brandName}. Paste a product URL from ${store.primarySiteUrl} or ask using the product name.`,
    };
  }

  const m = url.pathname.match(PRODUCT_PATH);
  if (!m?.[1]) {
    return {
      ok: false,
      error:
        "Could not find /products/{handle} in that URL. Paste a standard product page link (not a collection or checkout URL).",
    };
  }

  const handle = decodeURIComponent(m[1]).trim();
  if (!handle) {
    return { ok: false, error: "Empty product handle in URL." };
  }

  return { ok: true, handle };
}
