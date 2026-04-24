import { setCachedCatalog } from "@/lib/catalog/cache";
import { fetchFullCatalogChunks } from "@/lib/catalog/full-sync";
import { isShopifyConfigured } from "@/lib/shopify/env";

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handleSync() {
  if (!isShopifyConfigured()) {
    return Response.json(
      { ok: false, error: "Shopify env not configured" },
      { status: 503 },
    );
  }
  const { chunks, handles, productCount } = await fetchFullCatalogChunks(50, 2500);
  setCachedCatalog(chunks, handles);
  return Response.json({
    ok: true,
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
    return await handleSync();
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
    return await handleSync();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
