#!/usr/bin/env node
/**
 * Lists model IDs from your LiteLLM OpenAI-compatible proxy.
 * Usage (from repo root):
 *   LITELLM_API_KEY=sk-... node scripts/list-litellm-models.mjs
 * Optional: LITELLM_BASE_URL=https://litellm.arbisoft.com/v1
 */

const rawBase =
  process.env.LITELLM_BASE_URL?.trim() || "https://litellm.arbisoft.com/v1";
let base = rawBase.replace(/\/+$/, "");
if (!base.endsWith("/v1")) base = `${base}/v1`;

const apiKey = process.env.LITELLM_API_KEY?.trim() || process.env.LITELLM_VIRTUAL_KEY?.trim();
if (!apiKey) {
  console.error("Set LITELLM_API_KEY (or LITELLM_VIRTUAL_KEY).");
  process.exit(1);
}

const url = `${base}/models`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${apiKey}` },
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

const json = JSON.parse(text);
const ids = (json.data || []).map((m) => m.id).filter(Boolean);
console.log("Available model ids:\n");
for (const id of ids) console.log(`  ${id}`);
console.log(`\nTotal: ${ids.length}`);
console.log("\nSet in .env.local, for example:");
console.log(`  LITELLM_MODEL=${ids[0] || "groq/llama-3.1-8b-instant"}`);
