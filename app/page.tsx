import { ChatPanel } from "@/components/chat-panel";
import { getDefaultStore } from "@/lib/stores/registry";

export default async function Home() {
  const store = getDefaultStore();
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-3 py-6 dark:bg-black md:px-8 md:py-10">
      <ChatPanel
        storeId={store?.id}
        brandName={store?.brandName ?? "Store assistant"}
        tagline={
          store
            ? `Live catalog for ${store.primarySiteUrl}`
            : "Set SHOPIFY_* or MULTI_STORE_CONFIG to enable catalog tools."
        }
      />
    </div>
  );
}
