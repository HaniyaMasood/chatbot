# Version 2 — Multi-store (single Vercel deployment)

One deployment serves **multiple Shopify-backed storefronts** (e.g. `fromyheart.com` and `retroidpk.com`). The app picks the correct **Storefront API credentials**, **branding**, and **system prompt** per request.

## How store detection works

Priority order:

1. **`storeId` in the chat API body** — the embedded UI sends this via `DefaultChatTransport` when `ChatPanel` receives a `storeId` prop (from `/embed?store=<id>` or server-resolved default).
2. **`chat_store_id` cookie** — set on `GET /embed` by middleware from `?store=` or the **`Referer`** hostname (must match a configured `hosts` entry).
3. **`defaultStoreId`** from config (or the first store in the list).

Shopify theme iframes should prefer an explicit embed URL:

`https://<your-vercel-app>.vercel.app/embed?store=fromyheart`

`https://<your-vercel-app>.vercel.app/embed?store=retroidpk`

That avoids ambiguous detection when `Referer` is stripped.

## Configuration modes

### A) Legacy single store (unchanged)

Set `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, optional `STORE_BRAND_NAME`, `STORE_PRIMARY_URL`, `DEFAULT_STORE_HOSTS`, `STORE_VERTICAL`.

### B) Multi-store JSON (`MULTI_STORE_CONFIG`)

Set **`MULTI_STORE_CONFIG`** to a **single-line JSON** object in Vercel (paste minified JSON or use escaped newlines). Shape:

```json
{
  "defaultStoreId": "fromyheart",
  "stores": [
    {
      "id": "fromyheart",
      "hosts": ["www.fromyheart.com", "fromyheart.com"],
      "brandName": "From My Heart",
      "primarySiteUrl": "https://www.fromyheart.com",
      "vertical": "jewellery",
      "shopifyStoreDomain": "your-fromyheart-subdomain",
      "shopifyStorefrontAccessToken": "STOREFRONT_TOKEN_A",
      "metafieldIdentifiers": []
    },
    {
      "id": "retroidpk",
      "hosts": ["www.retroidpk.com", "retroidpk.com"],
      "brandName": "Retroid PK",
      "primarySiteUrl": "https://www.retroidpk.com",
      "vertical": "consumer electronics",
      "shopifyStoreDomain": "your-retroid-subdomain",
      "shopifyStorefrontAccessToken": "STOREFRONT_TOKEN_B"
    }
  ]
}
```

- **`hosts`**: used for **Referer → store** mapping and **CSP `frame-ancestors`** (with `https://` / `http://` variants generated automatically).
- **`vertical`**: free text injected into the assistant system prompt (tone and examples).
- **`metafieldIdentifiers`**: optional per-store list of `{ "namespace", "key" }` for Storefront-exposed metafields.

When `MULTI_STORE_CONFIG` is set, legacy `SHOPIFY_*` single-store vars are **not** used unless parsing fails and the app falls back to legacy mode.

## Catalog snapshot (`/api/sync`)

Warm the in-memory snapshot **per `storeId`**:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://<deployment>/api/sync?storeId=fromyheart"
```

Repeat for each store. Local snapshot search is namespaced by `storeId`.

## Security notes

- Only hostnames listed under **`hosts`** (and `primarySiteUrl`) are trusted for cookie assignment from `Referer`.
- **`storeId`** from the client is **validated** against the registry; unknown ids fall back to the default store.
- Keep Storefront tokens in **Vercel encrypted environment variables** only.

## Related code

- [`lib/stores/registry.ts`](../lib/stores/registry.ts) — load config, host lookup, CSP origins.
- [`lib/stores/resolve-store.ts`](../lib/stores/resolve-store.ts) — cookie name, API + embed resolution.
- [`middleware.ts`](../middleware.ts) — `frame-ancestors`, `chat_store_id` cookie on `/embed`.
- [`app/api/chat/route.ts`](../app/api/chat/route.ts) — resolves store, builds tools + system prompt per store.
