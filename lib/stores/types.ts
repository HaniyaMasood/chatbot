export type MetafieldIdentifier = { namespace: string; key: string };

/** One storefront backing a public site hostname set. */
export type StoreDefinition = {
  id: string;
  /** Hostnames that map to this store (lowercase, no port), e.g. www.fromyheart.com */
  hosts: string[];
  brandName: string;
  /** Public site URL for prompts, e.g. https://www.fromyheart.com */
  primarySiteUrl: string;
  /** Free-text vertical for the system prompt (jewellery, electronics, …) */
  vertical?: string;
  /** Shopify subdomain without .myshopify.com */
  shopifyStoreDomain: string;
  shopifyStorefrontAccessToken: string;
  shopifyStorefrontApiVersion?: string;
  metafieldIdentifiers?: MetafieldIdentifier[];
};

export type MultiStoreConfigFile = {
  defaultStoreId: string;
  stores: StoreDefinition[];
};

export type ResolvedStore = StoreDefinition;
