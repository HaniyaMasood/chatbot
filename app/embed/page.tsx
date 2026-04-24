import { cookies } from "next/headers";
import type { Metadata } from "next";

import { ChatPanel } from "@/components/chat-panel";
import { getDefaultStore, getStoreById } from "@/lib/stores/registry";
import { STORE_COOKIE } from "@/lib/stores/resolve-store";

type SearchParams = { store?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const rawId = sp.store?.trim() || cookieStore.get(STORE_COOKIE)?.value;
  const store = getStoreById(rawId || undefined) ?? getDefaultStore();
  const name = store?.brandName ?? "Store";
  return {
    title: `${name} — Chat`,
    description: `Embedded assistant for ${store?.primarySiteUrl ?? "your storefront"}`,
  };
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const rawId = sp.store?.trim() || cookieStore.get(STORE_COOKIE)?.value;
  const store = getStoreById(rawId || undefined) ?? getDefaultStore();

  return (
    <div className="h-dvh min-h-[400px] bg-background">
      <ChatPanel
        compact
        storeId={store?.id}
        brandName={store?.brandName ?? "Store"}
        tagline={
          store
            ? `Assistant for ${store.primarySiteUrl}`
            : "Configure MULTI_STORE_CONFIG or SHOPIFY_* env vars."
        }
      />
    </div>
  );
}
