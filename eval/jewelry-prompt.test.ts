import { describe, expect, it } from "vitest";

import { JEWELRY_SYSTEM_PROMPT } from "@/lib/jewelry-system-prompt";

describe("JEWELRY_SYSTEM_PROMPT", () => {
  it("requires catalog grounding and forbids inventing specs", () => {
    expect(JEWELRY_SYSTEM_PROMPT).toMatch(/searchShopifyCatalog/i);
    expect(JEWELRY_SYSTEM_PROMPT).toMatch(/Never invent/i);
    expect(JEWELRY_SYSTEM_PROMPT).toMatch(/fromyheart/i);
  });
});
