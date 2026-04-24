import type { MultiStoreConfigFile, ResolvedStore, StoreDefinition } from "./types";

let cached: MultiStoreConfigFile | undefined;

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function parseDefaultHosts(): string[] {
  const raw = process.env.DEFAULT_STORE_HOSTS?.trim();
  if (!raw) return ["www.fromyheart.com", "fromyheart.com"];
  return raw.split(/[\s,]+/).map(normalizeHost).filter(Boolean);
}

/** Legacy single-store mode when MULTI_STORE_CONFIG is unset. */
function legacySingleStore(): MultiStoreConfigFile {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();
  if (!domain || !token) {
    return {
      defaultStoreId: "default",
      stores: [],
    };
  }
  const brand = process.env.STORE_BRAND_NAME?.trim() || "From My Heart";
  const site = process.env.STORE_PRIMARY_URL?.trim() || "https://www.fromyheart.com";
  const store: StoreDefinition = {
    id: "default",
    hosts: parseDefaultHosts(),
    brandName: brand,
    primarySiteUrl: site,
    vertical: process.env.STORE_VERTICAL?.trim() || "jewellery",
    shopifyStoreDomain: domain.replace(/\.myshopify\.com$/i, ""),
    shopifyStorefrontAccessToken: token,
    shopifyStorefrontApiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION?.trim(),
    metafieldIdentifiers: parseMetafieldEnv(),
  };
  return { defaultStoreId: "default", stores: [store] };
}

function parseMetafieldEnv(): StoreDefinition["metafieldIdentifiers"] {
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
          typeof (x as { namespace?: string }).namespace === "string" &&
          typeof (x as { key?: string }).key === "string",
      )
      .map((x) => ({ namespace: x.namespace, key: x.key }));
  } catch {
    return [];
  }
}

function isStoreDefinition(x: unknown): x is StoreDefinition {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.hosts) &&
    o.hosts.every((h) => typeof h === "string") &&
    typeof o.brandName === "string" &&
    typeof o.primarySiteUrl === "string" &&
    typeof o.shopifyStoreDomain === "string" &&
    typeof o.shopifyStorefrontAccessToken === "string"
  );
}

function parseMultiStoreJson(raw: string): MultiStoreConfigFile {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("MULTI_STORE_CONFIG must be a JSON object");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.defaultStoreId !== "string" || !Array.isArray(o.stores)) {
    throw new Error("MULTI_STORE_CONFIG requires defaultStoreId and stores[]");
  }
  const stores = o.stores.filter(isStoreDefinition);
  if (stores.length === 0) throw new Error("MULTI_STORE_CONFIG.stores is empty or invalid");
  return {
    defaultStoreId: o.defaultStoreId,
    stores: stores.map((s) => ({
      ...s,
      hosts: s.hosts.map((h) => normalizeHost(h)),
      shopifyStoreDomain: s.shopifyStoreDomain.replace(/\.myshopify\.com$/i, ""),
      vertical: s.vertical ?? "general",
      metafieldIdentifiers: s.metafieldIdentifiers ?? [],
    })),
  };
}

export function getMultiStoreConfig(): MultiStoreConfigFile {
  if (cached !== undefined) return cached;

  const raw = process.env.MULTI_STORE_CONFIG?.trim();
  try {
    if (raw) {
      cached = parseMultiStoreJson(raw);
    } else {
      cached = legacySingleStore();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stores] Invalid MULTI_STORE_CONFIG:", msg);
    cached = legacySingleStore();
  }
  return cached!;
}

export function getStoreById(id: string | undefined | null): ResolvedStore | null {
  const cfg = getMultiStoreConfig();
  if (!id) return cfg.stores.find((s) => s.id === cfg.defaultStoreId) ?? cfg.stores[0] ?? null;
  return cfg.stores.find((s) => s.id === id) ?? null;
}

export function getDefaultStore(): ResolvedStore | null {
  const cfg = getMultiStoreConfig();
  return getStoreById(cfg.defaultStoreId) ?? cfg.stores[0] ?? null;
}

export function findStoreByHostname(hostname: string): ResolvedStore | null {
  const h = normalizeHost(hostname);
  if (!h) return null;
  const variants = new Set<string>([h, h.startsWith("www.") ? h.slice(4) : `www.${h}`]);
  const cfg = getMultiStoreConfig();
  for (const s of cfg.stores) {
    for (const sh of s.hosts) {
      if (variants.has(normalizeHost(sh))) return s;
    }
  }
  try {
    for (const s of cfg.stores) {
      const siteHost = normalizeHost(new URL(s.primarySiteUrl).hostname);
      if (variants.has(siteHost)) return s;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Origins for Content-Security-Policy frame-ancestors (https + http variants). */
export function collectFrameAncestorSources(): string[] {
  const cfg = getMultiStoreConfig();
  const out = new Set<string>([
    "'self'",
    "https://*.myshopify.com",
    "http://*.myshopify.com",
    "https://myshopify.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  for (const s of cfg.stores) {
    for (const h of s.hosts) {
      out.add(`https://${h}`);
      out.add(`http://${h}`);
    }
    try {
      const u = new URL(s.primarySiteUrl);
      out.add(`${u.protocol}//${u.host}`);
    } catch {
      /* skip */
    }
  }
  const extra = process.env.FRAME_ANCESTORS_EXTRA?.trim();
  if (extra) {
    for (const p of extra.split(/\s+/)) {
      if (p) out.add(p);
    }
  }
  return [...out];
}
