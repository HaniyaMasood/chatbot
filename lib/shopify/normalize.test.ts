import { describe, expect, it } from "vitest";

import { productToCatalogText } from "./normalize";
import type { ProductNode } from "./types";

const sampleProduct: ProductNode = {
  id: "gid://shopify/Product/1",
  title: "Sample Ring",
  handle: "sample-ring",
  description: "14k gold band, 2mm width.",
  tags: ["gold", "ring"],
  onlineStoreUrl: "https://example.com/products/sample-ring",
  availableForSale: true,
  metafields: [
    { namespace: "custom", key: "material", value: "14k yellow gold", type: "single_line_text_field" },
  ],
  variants: {
    edges: [
      {
        node: {
          id: "gid://shopify/ProductVariant/1",
          title: "6 / Gold",
          sku: "RNG-6",
          availableForSale: true,
          price: { amount: "120.00", currencyCode: "USD" },
          selectedOptions: [
            { name: "Size", value: "6" },
            { name: "Metal", value: "Gold" },
          ],
        },
      },
    ],
  },
};

describe("productToCatalogText", () => {
  it("includes title, handle, metafields, and variants", () => {
    const text = productToCatalogText(sampleProduct);
    expect(text).toContain("Sample Ring");
    expect(text).toContain("sample-ring");
    expect(text).toContain("14k yellow gold");
    expect(text).toContain("120.00 USD");
    expect(text).toContain("RNG-6");
  });
});
