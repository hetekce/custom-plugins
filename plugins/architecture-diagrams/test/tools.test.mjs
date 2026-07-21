// Unit tests for scripts/lib/tools.mjs.

import assert from "node:assert/strict";
import { test } from "node:test";
import { slug, hasTool } from "../scripts/lib/tools.mjs";

test("slug kebab-cases mixed text", () => {
  assert.equal(slug("Checkout flow — container view"), "checkout-flow-container-view");
});

test("slug strips diacritics", () => {
  assert.equal(slug("Café déjà-vu"), "cafe-deja-vu");
  assert.equal(slug("Naïve façade"), "naive-facade");
});

test("slug strips punctuation and trims separators", () => {
  assert.equal(slug("  Hello, World!  "), "hello-world");
  assert.equal(slug("a/b\\c:d"), "a-b-c-d");
  assert.equal(slug("---edge---"), "edge");
});

test("hasTool is false for a missing binary", async () => {
  assert.equal(await hasTool("definitely-not-a-real-binary-xyz"), false);
});

test("hasTool is true for node", async () => {
  assert.equal(await hasTool("node"), true);
});
