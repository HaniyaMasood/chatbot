import type { MetafieldNode, ProductNode, VariantNode } from "./types";

function formatVariant(v: VariantNode): string {
  const opts =
    v.selectedOptions?.map((o) => `${o.name}: ${o.value}`).join(", ") || "default";
  const price = `${v.price.amount} ${v.price.currencyCode}`;
  const stock = v.availableForSale ? "in stock" : "sold out / unavailable";
  const sku = v.sku ? `sku ${v.sku}` : "no sku";
  return `  - ${v.title || "Variant"} (${opts}) — ${price}, ${stock}, ${sku}`;
}

function formatMetafields(metafields: (MetafieldNode | null)[] | null | undefined): string {
  if (!metafields?.length) return "";
  const lines = metafields
    .filter((m): m is MetafieldNode => Boolean(m?.value))
    .map((m) => `  - ${m.namespace}.${m.key} (${m.type}): ${m.value}`);
  return lines.length ? `Metafields:\n${lines.join("\n")}` : "";
}

/**
 * Flattens a Shopify product into plain text for LLM context / RAG chunks.
 */
export function productToCatalogText(p: ProductNode): string {
  const variantLines = p.variants.edges.map((e) => formatVariant(e.node));
  const meta = formatMetafields(p.metafields);
  const tags = p.tags?.length ? p.tags.join(", ") : "none";
  const desc = (p.description || "").trim();

  return [
    `Product: ${p.title}`,
    `Handle: ${p.handle}`,
    `Store URL: ${p.onlineStoreUrl ?? "n/a"}`,
    `Available (product-level): ${p.availableForSale ? "yes" : "no"}`,
    `Tags: ${tags}`,
    desc ? `Description:\n${desc}` : "",
    meta,
    "Variants:",
    variantLines.join("\n") || "  (no variants)",
  ]
    .filter(Boolean)
    .join("\n");
}

export function productsToContextBlock(products: ProductNode[]): string {
  if (!products.length) return "No matching products found in the catalog for this query.";
  return products.map((p, i) => `--- Item ${i + 1} ---\n${productToCatalogText(p)}`).join("\n\n");
}
