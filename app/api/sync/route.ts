import { setCachedCatalog } from "@/lib/catalog/cache";
import { fetchFullCatalogChunks } from "@/lib/catalog/full-sync";
import { getStoreById } from "@/lib/stores/registry";
import { isStoreShopifyConfigured } from "@/lib/shopify/graphql-for-store";

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function storeIdFromRequest(req: Request): string | undefined {
  const u = new URL(req.url);
  const q = u.searchParams.get("storeId")?.trim();
  if (q) return q;
  return undefined;
}

async function handleSync(req: Request) {
  const id = storeIdFromRequest(req);
  const store = getStoreById(id ?? undefined);
  if (!store) {
    return Response.json(
      { ok: false, error: "Unknown storeId. Pass ?storeId=<id> matching MULTI_STORE_CONFIG." },
      { status: 400 },
    );
  }
  if (!isStoreShopifyConfigured(store)) {
    return Response.json(
      { ok: false, error: `Shopify env not configured for store "${store.id}"` },
      { status: 503 },
    );
  }
  const { chunks, handles, productCount } = await fetchFullCatalogChunks(store, 50, 2500);
  setCachedCatalog(store.id, chunks, handles);
  return Response.json({
    ok: true,
    storeId: store.id,
    productCount,
    chunks: chunks.length,
    syncedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await handleSync(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Vercel Cron issues GET requests. */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await handleSync(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
