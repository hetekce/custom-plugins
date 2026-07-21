// End-to-end tests for scripts/model-to-gliffy.mjs: run the script on a
// fixture model and inspect the emitted .gliffy JSON. Fully offline.

import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { after, before, test } from "node:test";
import { PLUGIN_ROOT, runScript, tmpdir } from "./helpers.mjs";

process.env.CLAUDE_PLUGIN_ROOT = PLUGIN_ROOT;

const model = {
  title: "Order pipeline",
  direction: "LR",
  groups: [{ id: "core", label: "Core services" }],
  nodes: [
    { id: "web", label: "Storefront", role: "client" },
    { id: "orders", label: "Order service", role: "service", group: "core", tech: "nodejs" },
    { id: "db", label: "Orders DB", role: "datastore", group: "core" },
  ],
  edges: [
    { from: "web", to: "orders", label: "Place order" },
    { from: "orders", to: "db", kind: "async" },
    { from: "orders", to: "ghost" }, // dangling on purpose — must be skipped, not fatal
  ],
};

let dir;
let result;
let doc;

before(() => {
  dir = tmpdir();
  const input = path.join(dir, "model.json");
  const output = path.join(dir, "out.gliffy");
  writeFileSync(input, JSON.stringify(model));
  result = runScript("scripts/model-to-gliffy.mjs", [input, output]);
  if (result.code === 0) doc = JSON.parse(readFileSync(output, "utf8"));
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("exits 0 on a valid model", () => {
  assert.equal(result.code, 0, `stderr: ${result.stderr}`);
});

test("output file is valid gliffy JSON", () => {
  assert.equal(doc.contentType, "application/gliffy+json");
  assert.equal(doc.version, "1.1");
  assert.equal(doc.metadata.title, model.title);
  assert.ok(Array.isArray(doc.stage.objects));
});

test("object count covers nodes, valid edges, and group rectangles", () => {
  // 1 group rect + 3 node rects + 2 valid edges; the dangling edge is dropped.
  assert.equal(doc.stage.objects.length, 1 + model.nodes.length + 2);
  const rects = doc.stage.objects.filter((o) => o.graphic?.type === "Shape");
  const lines = doc.stage.objects.filter((o) => o.graphic?.type === "Line");
  assert.equal(rects.length, 1 + model.nodes.length);
  assert.equal(lines.length, 2);
});

test("the dangling edge is skipped with a warning", () => {
  assert.match(result.stderr, /skipping edge with unknown endpoint: orders -> ghost/);
});
