import type { NextRequest } from "next/server";

import { getMultiStoreConfig, getStoreById, findStoreByHostname } from "./registry";
import type { ResolvedStore } from "./types";

export const STORE_COOKIE = "chat_store_id";

export function resolveStoreFromApiRequest(
  request: Request,
  bodyStoreId?: string | null,
): ResolvedStore | null {
  const cfg = getMultiStoreConfig();
  if (!cfg.stores.length) return null;

  const fromBody = bodyStoreId?.trim();
  if (fromBody) {
    const s = getStoreById(fromBody);
    if (s) return s;
  }

  const cookie = parseCookie(request.headers.get("cookie") ?? "", STORE_COOKIE);
  if (cookie) {
    const s = getStoreById(cookie);
    if (s) return s;
  }

  return getStoreById(cfg.defaultStoreId) ?? cfg.stores[0] ?? null;
}

export function resolveStoreForEmbedRequest(request: NextRequest): ResolvedStore | null {
  const cfg = getMultiStoreConfig();
  if (!cfg.stores.length) return null;

  const qs = request.nextUrl.searchParams.get("store")?.trim();
  if (qs) {
    const s = getStoreById(qs);
    if (s) return s;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const host = new URL(referer).hostname;
      const s = findStoreByHostname(host);
      if (s) return s;
    } catch {
      /* ignore */
    }
  }

  return getStoreById(cfg.defaultStoreId) ?? cfg.stores[0] ?? null;
}

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(";").map((c) => c.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}
