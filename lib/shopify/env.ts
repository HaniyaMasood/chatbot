function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

/** e.g. fromyheart or from-my-heart-store (without .myshopify.com) */
export function getShopifyStoreDomain(): string {
  const raw = requireEnv("SHOPIFY_STORE_DOMAIN").trim();
  return raw.replace(/\.myshopify\.com$/i, "");
}

export function getStorefrontEndpoint(): string {
  const shop = getShopifyStoreDomain();
  const version = process.env.SHOPIFY_STOREFRONT_API_VERSION?.trim() || "2025-01";
  return `https://${shop}.myshopify.com/api/${version}/graphql.json`;
}

export function getStorefrontAccessToken(): string {
  return requireEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN").trim();
}

export function isShopifyConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  );
}

/**
 * Optional JSON array of { namespace, key } for Storefront-visible metafields.
 * Example: [{"namespace":"custom","key":"material"}]
 */
export function getMetafieldIdentifiers(): Array<{ namespace: string; key: string }> {
  const raw = process.env.SHOPIFY_METAFIELD_IDENTIFIERS?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is { namespace: string; key: string } =>
          typeof x === "object" &&
          x !== null &&
          "namespace" in x &&
          "key" in x &&
          typeof (x as { namespace: string }).namespace === "string" &&
          typeof (x as { key: string }).key === "string",
      )
      .map((x) => ({ namespace: x.namespace, key: x.key }));
  } catch {
    return [];
  }
}
