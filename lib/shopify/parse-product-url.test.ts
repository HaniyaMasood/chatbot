import { describe, expect, it } from "vitest";

import { resolveHandleFromProductUrl } from "./parse-product-url";
import type { ResolvedStore } from "@/lib/stores/types";

const retroid: ResolvedStore = {
  id: "retroidpk",
  hosts: ["www.retroidpk.com", "retroidpk.com"],
  brandName: "Retroid PK",
  primarySiteUrl: "https://www.retroidpk.com",
  vertical: "gaming",
  shopifyStoreDomain: "xshr3w-vw",
  shopifyStorefrontAccessToken: "x",
};

describe("resolveHandleFromProductUrl", () => {
  it("accepts apex domain and extracts handle", () => {
    const r = resolveHandleFromProductUrl(
      "https://retroidpk.com/products/retro-pocket-handheld-console-with-hd-ips-screen-15000-games",
      retroid,
    );
    expect(r).toEqual({
      ok: true,
      handle: "retro-pocket-handheld-console-with-hd-ips-screen-15000-games",
    });
  });

  it("rejects wrong host", () => {
    const r = resolveHandleFromProductUrl(
      "https://evil.com/products/retro-pocket-handheld-console-with-hd-ips-screen-15000-games",
      retroid,
    );
    expect(r.ok).toBe(false);
  });
});
