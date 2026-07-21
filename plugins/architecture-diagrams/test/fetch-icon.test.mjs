// Offline tests for scripts/fetch-icon.mjs. Every case here is served from
// the ICON_MAP table or the bundled asset set — nothing touches the network.
// Slugs that require a live fetch are deliberately not tested.

import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { after, before, test } from "node:test";
import { PLUGIN_ROOT, runScript, tmpdir } from "./helpers.mjs";

process.env.CLAUDE_PLUGIN_ROOT = PLUGIN_ROOT;

let dir;

before(() => {
  dir = tmpdir();
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("iconify format resolves a known slug from the local map", () => {
  const r = runScript("scripts/fetch-icon.mjs", ["postgresql", "--format", "iconify"]);
  assert.equal(r.code, 0, `stderr: ${r.stderr}`);
  assert.equal(r.stdout.trim(), "logos:postgresql");
});

test("aliases resolve to the canonical slug", () => {
  const r = runScript("scripts/fetch-icon.mjs", ["postgres", "--format", "iconify"]);
  assert.equal(r.code, 0, `stderr: ${r.stderr}`);
  assert.equal(r.stdout.trim(), "logos:postgresql");
});

test("a bundled slug serves a PNG data URI offline", () => {
  const r = runScript("scripts/fetch-icon.mjs", ["kafka", "--format", "datauri"]);
  assert.equal(r.code, 0, `stderr: ${r.stderr}`);
  const uri = r.stdout.trim();
  assert.ok(uri.startsWith("data:image/png;base64,"), `unexpected output: ${uri.slice(0, 60)}`);
  // The payload must decode to a real PNG (magic bytes).
  const bytes = Buffer.from(uri.slice("data:image/png;base64,".length), "base64");
  assert.equal(bytes.subarray(0, 4).toString("latin1"), "\x89PNG");
});

test("a bundled role icon writes a PNG file", () => {
  const out = path.join(dir, "role-icon.png");
  const r = runScript("scripts/fetch-icon.mjs", [
    "lucide:circle-user-round",
    "--format",
    "png",
    "--out",
    out,
  ]);
  assert.equal(r.code, 0, `stderr: ${r.stderr}`);
  assert.equal(r.stdout.trim(), out, "script must print the written path");
  const bytes = readFileSync(out);
  assert.equal(bytes.subarray(0, 4).toString("latin1"), "\x89PNG");
});
