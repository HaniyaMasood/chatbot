type CacheEntry = {
  syncedAt: number;
  documents: string[];
  handles: string[];
};

const caches = new Map<string, CacheEntry>();

export function getCachedCatalog(storeId: string): CacheEntry | null {
  return caches.get(storeId) ?? null;
}

export function setCachedCatalog(
  storeId: string,
  documents: string[],
  handles: string[],
): void {
  caches.set(storeId, {
    syncedAt: Date.now(),
    documents,
    handles,
  });
}

export function clearCachedCatalog(storeId?: string): void {
  if (storeId) caches.delete(storeId);
  else caches.clear();
}

/** Simple substring filter over synced catalog chunks (optional RAG boost). */
export function searchCachedCatalogChunks(
  storeId: string,
  query: string,
  maxChunks = 12,
): string[] {
  const cache = caches.get(storeId);
  if (!cache?.documents.length) return [];
  const q = query.toLowerCase().trim();
  if (!q) return cache.documents.slice(0, maxChunks);
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  const scored = cache.documents.map((doc) => {
    const d = doc.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (d.includes(t)) score += 1;
    }
    return { doc, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, maxChunks)
    .map((s) => s.doc);
}

export function catalogStats(storeId: string): {
  syncedAt: string | null;
  chunks: number;
  handles: number;
} {
  const cache = caches.get(storeId);
  if (!cache) {
    return { syncedAt: null, chunks: 0, handles: 0 };
  }
  return {
    syncedAt: new Date(cache.syncedAt).toISOString(),
    chunks: cache.documents.length,
    handles: cache.handles.length,
  };
}
