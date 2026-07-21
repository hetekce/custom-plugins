// End-to-end tests for scripts/mermaid-to-drawio.mjs: run the script on a
// fixture model and inspect the emitted mxGraph XML. Fully offline.

import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { after, before, test } from "node:test";
import { PLUGIN_ROOT, runScript, tmpdir } from "./helpers.mjs";

process.env.CLAUDE_PLUGIN_ROOT = PLUGIN_ROOT;

// A bundled PNG, referenced by absolute path so the icon embed path is real.
const ICON_PNG = path.join(PLUGIN_ROOT, "assets", "icons", "png", "128", "postgresql.png");

const model = {
  title: "Test system",
  direction: "LR",
  nodes: [
    { id: "web", label: "Web app", role: "client" },
    { id: "api", label: "API", role: "service" },
    { id: "db", label: "Database", role: "datastore", icon: ICON_PNG },
  ],
  edges: [
    { from: "web", to: "api", label: "HTTPS", kind: "sync" },
    { from: "api", to: "db", label: "publishes order.created", kind: "async" }, // long -> wraps
    { from: "api", to: "ghost" }, // dangling on purpose — must be skipped, not fatal
  ],
};

let dir;
let result;
let xml;

before(() => {
  dir = tmpdir();
  const input = path.join(dir, "model.json");
  const output = path.join(dir, "out.drawio");
  writeFileSync(input, JSON.stringify(model));
  result = runScript("scripts/mermaid-to-drawio.mjs", [input, output]);
  if (result.code === 0) xml = readFileSync(output, "utf8");
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("exits 0 on a valid model", () => {
  assert.equal(result.code, 0, `stderr: ${result.stderr}`);
});

test("output is an mxfile document", () => {
  assert.ok(xml.includes("<mxfile"));
  assert.ok(xml.includes("</mxfile>"));
});

test("one vertex cell per node", () => {
  const vertices = xml.match(/<mxCell id="n_/g) ?? [];
  assert.equal(vertices.length, model.nodes.length);
  for (const n of model.nodes) {
    assert.ok(xml.includes(`<mxCell id="n_${n.id}"`), `missing vertex for node ${n.id}`);
  }
});

test("one edge cell per valid edge; the dangling edge is skipped with a warning", () => {
  const edges = xml.match(/<mxCell id="e_\d+"/g) ?? [];
  assert.equal(edges.length, 2, "dangling edge must be dropped, valid edges kept");
  assert.match(result.stderr, /skipping edge with unknown endpoint: api -> ghost/);
});

test("async edge is dashed", () => {
  const asyncEdge = xml.split("\n").find((l) => l.includes('id="e_1"'));
  assert.ok(asyncEdge, "edge e_1 not found");
  assert.ok(asyncEdge.includes("dashed=1"), "async edge must carry dashed=1");
});

test("edges use orthogonal routing", () => {
  const edgeLines = xml.split("\n").filter((l) => /<mxCell id="e_\d+"/.test(l));
  assert.ok(edgeLines.length > 0);
  for (const line of edgeLines) {
    assert.ok(line.includes("edgeStyle=orthogonalEdgeStyle"), "every edge must be orthogonal");
  }
});

test("a bundled PNG icon path is embedded as an image vertex", () => {
  const dbCell = xml.split("\n").find((l) => l.includes('id="n_db"'));
  assert.ok(dbCell, "db vertex not found");
  assert.ok(dbCell.includes("shape=image"), "icon node must use shape=image");
  assert.ok(dbCell.includes("image=data:image/png"), "icon must be embedded as a PNG data URI");
});

test("long edge labels wrap using an encoded line break, never a raw <br>", () => {
  // A raw "<br>" inside an XML value="..." attribute is invalid and draw.io
  // silently drops the whole cell, so the edge would vanish. The break must be
  // the entity-encoded &lt;br&gt; instead.
  assert.ok(xml.includes("&lt;br&gt;"), "expected a wrapped label to contain an encoded <br>");
  assert.ok(
    !/value="[^"]*<br>/.test(xml),
    "a raw <br> inside a value attribute would make draw.io drop the edge",
  );
});

test("the long-labelled async edge is present with its wrapped label", () => {
  const edge = xml.split("\n").find((l) => l.includes('id="e_1"'));
  assert.ok(edge, "edge e_1 not found");
  assert.ok(edge.includes('value="publishes&lt;br&gt;order.created"'), "wrapped label missing");
});
