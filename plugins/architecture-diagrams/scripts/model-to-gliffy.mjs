#!/usr/bin/env node
// model-to-gliffy.mjs — turn a diagram-model JSON into a best-effort .gliffy file.
//
// Usage:
//   node model-to-gliffy.mjs <diagram-model.json> <output.gliffy> [--theme light|dark]
//
// Output uses basic shapes only (rectangle / line / text). Gliffy's stencil
// artwork is proprietary and is never bundled or referenced. The .gliffy format
// itself is undocumented; the structures here are reverse-engineered (see
// skills/gliffy-diagrams/references/gliffy-format.md). No external dependencies.

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { die, log } from "./lib/tools.mjs";

// ---------------------------------------------------------------------------
// Layout constants (pixels).

const NODE_W = 160;
const NODE_H = 60;
const GAP_MAIN = 120; // gap between ranks, along the flow direction
const GAP_CROSS = 60; // gap between siblings within a rank
const MARGIN = 60; // page margin around everything
const GROUP_PAD = 24; // padding a group box adds around its members, per nesting level
const GROUP_LABEL_H = 22; // extra headroom for the group label

// Role-based colors, one palette per theme. Fill is the box, stroke the border.
const PALETTES = {
  light: {
    background: "#ffffff",
    text: "#1e293b",
    mutedText: "#64748b",
    line: "#64748b",
    group: { fill: "#f8fafc", stroke: "#cbd5e1", text: "#475569" },
    roles: {
      service: { fill: "#eef2ff", stroke: "#6366f1" },
      datastore: { fill: "#ecfdf5", stroke: "#10b981" },
      queue: { fill: "#fff7ed", stroke: "#f97316" },
      cache: { fill: "#fef2f2", stroke: "#ef4444" },
      gateway: { fill: "#f0f9ff", stroke: "#0ea5e9" },
      external: { fill: "#f8fafc", stroke: "#94a3b8" },
      actor: { fill: "#fdf4ff", stroke: "#d946ef" },
      client: { fill: "#f0fdfa", stroke: "#14b8a6" },
      job: { fill: "#fefce8", stroke: "#ca8a04" },
      default: { fill: "#ffffff", stroke: "#64748b" },
    },
  },
  dark: {
    background: "#0f172a",
    text: "#e2e8f0",
    mutedText: "#94a3b8",
    line: "#94a3b8",
    group: { fill: "#1e293b", stroke: "#475569", text: "#cbd5e1" },
    roles: {
      service: { fill: "#312e81", stroke: "#818cf8" },
      datastore: { fill: "#064e3b", stroke: "#34d399" },
      queue: { fill: "#7c2d12", stroke: "#fb923c" },
      cache: { fill: "#7f1d1d", stroke: "#f87171" },
      gateway: { fill: "#0c4a6e", stroke: "#38bdf8" },
      external: { fill: "#1e293b", stroke: "#94a3b8" },
      actor: { fill: "#701a75", stroke: "#e879f9" },
      client: { fill: "#134e4a", stroke: "#2dd4bf" },
      job: { fill: "#713f12", stroke: "#facc15" },
      default: { fill: "#1e293b", stroke: "#94a3b8" },
    },
  },
};

// Fractional anchor on a shape's bounding box, per side.
const SIDE_ANCHOR = { L: [0, 0.5], R: [1, 0.5], T: [0.5, 0], B: [0.5, 1] };

// ---------------------------------------------------------------------------
// CLI parsing.

function parseArgs(argv) {
  const positional = [];
  let theme = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--theme") {
      theme = argv[++i];
      if (theme !== "light" && theme !== "dark") {
        die(`invalid --theme value: ${theme}`, "use --theme light or --theme dark");
      }
    } else if (a.startsWith("--")) {
      die(`unknown flag: ${a}`, "usage: node model-to-gliffy.mjs <diagram-model.json> <output.gliffy> [--theme light|dark]");
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 2) {
    die("expected an input model and an output path", "usage: node model-to-gliffy.mjs <diagram-model.json> <output.gliffy> [--theme light|dark]");
  }
  return { input: positional[0], output: positional[1], theme };
}

function loadModel(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    die(`cannot read ${path}: ${err.message}`);
  }
  let model;
  try {
    model = JSON.parse(raw);
  } catch (err) {
    die(`${path} is not valid JSON: ${err.message}`);
  }
  if (!model || typeof model !== "object") die(`${path} is not a JSON object`);
  if (!model.title || !Array.isArray(model.nodes) || model.nodes.length === 0) {
    die(`${path} does not look like a diagram model`, "it needs at least a title and a non-empty nodes array");
  }
  return model;
}

// ---------------------------------------------------------------------------
// Layout: layered grid placement.

/**
 * Assign each node a rank (its layer along the flow direction) by relaxing
 * edge constraints. Capped iterations keep cycles from looping forever.
 */
function computeRanks(nodes, edges) {
  const rank = new Map(nodes.map((n) => [n.id, 0]));
  const usable = edges.filter((e) => rank.has(e.from) && rank.has(e.to));
  const cap = nodes.length;
  for (let pass = 0; pass < cap; pass++) {
    let changed = false;
    for (const e of usable) {
      const want = rank.get(e.from) + 1;
      if (want > rank.get(e.to) && want <= cap) {
        rank.set(e.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return rank;
}

/** Walk group.parent links up to the root group id (used to keep siblings together). */
function rootGroupOf(groupId, groupById) {
  let cur = groupId;
  const seen = new Set();
  while (cur && groupById.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const parent = groupById.get(cur).parent;
    if (!parent || !groupById.has(parent)) break;
    cur = parent;
  }
  return cur ?? "";
}

/**
 * Place nodes on a grid: rank picks the position along the flow axis,
 * the index within the rank picks the cross-axis position. Nodes in the same
 * group are kept adjacent within a rank so group boxes stay tight.
 * Returns Map<nodeId, {x, y, w, h}> in absolute page coordinates.
 */
function layoutNodes(model) {
  const direction = model.direction || "LR";
  const groupById = new Map((model.groups || []).map((g) => [g.id, g]));
  const rank = computeRanks(model.nodes, model.edges || []);
  const maxRank = Math.max(...rank.values());

  // Bucket nodes per rank, keeping model order but clustering by root group.
  const buckets = new Map();
  model.nodes.forEach((n, i) => {
    const r = rank.get(n.id);
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r).push({ node: n, index: i });
  });
  for (const list of buckets.values()) {
    list.sort((a, b) => {
      const ga = rootGroupOf(a.node.group, groupById);
      const gb = rootGroupOf(b.node.group, groupById);
      if (ga !== gb) return ga < gb ? -1 : 1;
      return a.index - b.index;
    });
  }

  const horizontal = direction === "LR" || direction === "RL";
  const reversed = direction === "RL" || direction === "BT";
  const positions = new Map();
  for (const [r, list] of buckets) {
    const layer = reversed ? maxRank - r : r; // mirror for RL / BT
    list.forEach(({ node }, i) => {
      if (horizontal) {
        // Ranks advance left-to-right; siblings stack top-to-bottom.
        const x = MARGIN + layer * (NODE_W + GAP_MAIN);
        const y = MARGIN + GROUP_LABEL_H + i * (NODE_H + GAP_CROSS);
        positions.set(node.id, { x, y, w: NODE_W, h: NODE_H });
      } else {
        // Ranks advance top-to-bottom; siblings spread left-to-right.
        const x = MARGIN + i * (NODE_W + GAP_CROSS);
        const y = MARGIN + GROUP_LABEL_H + layer * (NODE_H + GAP_MAIN);
        positions.set(node.id, { x, y, w: NODE_W, h: NODE_H });
      }
    });
  }
  return positions;
}

/**
 * Compute each group's bounding box from its transitive member nodes.
 * Deeper groups get less padding so parents visually enclose children.
 * Returns [{group, x, y, w, h, depth}] sorted parents-first.
 */
function layoutGroups(model, positions) {
  const groups = model.groups || [];
  if (groups.length === 0) return [];
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const depthOf = (g) => {
    let d = 0;
    let cur = g;
    const seen = new Set();
    while (cur.parent && groupById.has(cur.parent) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = groupById.get(cur.parent);
      d++;
    }
    return d;
  };
  const maxDepth = Math.max(...groups.map(depthOf));

  // Transitive membership: a node belongs to its group and every ancestor.
  const members = new Map(groups.map((g) => [g.id, []]));
  for (const node of model.nodes) {
    let gid = node.group;
    const seen = new Set();
    while (gid && members.has(gid) && !seen.has(gid)) {
      seen.add(gid);
      members.get(gid).push(node.id);
      gid = groupById.get(gid).parent;
    }
  }

  const boxes = [];
  for (const g of groups) {
    const ids = members.get(g.id).filter((id) => positions.has(id));
    if (ids.length === 0) {
      log(`skipping empty group: ${g.id}`);
      continue;
    }
    const xs = ids.map((id) => positions.get(id));
    const depth = depthOf(g);
    const pad = GROUP_PAD * (maxDepth - depth + 1); // parents pad more than children
    const minX = Math.min(...xs.map((p) => p.x)) - pad;
    const minY = Math.min(...xs.map((p) => p.y)) - pad - GROUP_LABEL_H;
    const maxX = Math.max(...xs.map((p) => p.x + p.w)) + pad;
    const maxY = Math.max(...xs.map((p) => p.y + p.h)) + pad;
    boxes.push({ group: g, x: minX, y: minY, w: maxX - minX, h: maxY - minY, depth });
  }
  boxes.sort((a, b) => a.depth - b.depth); // parents first = drawn behind
  return boxes;
}

// ---------------------------------------------------------------------------
// Gliffy object builders.

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Word-wrap into short lines (long single words kept whole). */
function wrapWords(text, maxChars) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (line && line.length + 1 + w.length > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function textHtml(text, color, { size = 12, bold = false, align = "center", wrap = 0 } = {}) {
  const weight = bold ? " font-weight: bold;" : "";
  const body = wrap ? wrapWords(text, wrap).map(escapeHtml).join("<br/>") : escapeHtml(text);
  return (
    `<p style='text-align: ${align};'>` +
    `<span style='font-family: Arial; font-size: ${size}px; color: ${color};${weight}'>` +
    body +
    "</span></p>"
  );
}

function textChild(id, w, h, html, extra = {}) {
  return {
    x: 0,
    y: 0,
    width: w,
    height: h,
    rotation: 0,
    id,
    uid: null,
    order: "auto",
    ...extra,
    graphic: {
      type: "Text",
      Text: { tid: null, valign: extra.valign ?? "middle", overflow: "none", vposition: "none", hposition: "none", html },
    },
    children: [],
  };
}

function rectangle(id, order, box, fill, stroke, children) {
  return {
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    rotation: 0,
    id,
    uid: "com.gliffy.shape.basic.basic_v1.default.rectangle",
    order,
    lockAspectRatio: false,
    lockShape: false,
    graphic: {
      type: "Shape",
      Shape: {
        tid: "com.gliffy.stencil.rectangle.basic_v1",
        strokeWidth: 2,
        strokeColor: stroke,
        fillColor: fill,
        gradient: false,
        dropShadow: false,
        state: 0,
        opacity: 1,
      },
    },
    children,
    linkMap: [],
  };
}

/** Pick the side of `from` that faces `to`, honoring an explicit hint. */
function pickSide(from, to, hint) {
  if (hint && SIDE_ANCHOR[hint]) return hint;
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "R" : "L";
  return dy >= 0 ? "B" : "T";
}

function anchorPoint(box, side) {
  const [px, py] = SIDE_ANCHOR[side];
  return { x: box.x + box.w * px, y: box.y + box.h * py };
}

/**
 * A simple orthogonal control path from start to end (relative to start).
 * Gliffy re-routes ortho lines after import, so plausible is enough.
 */
function orthoPath(fromSide, toSide, dx, dy) {
  const horizStart = fromSide === "L" || fromSide === "R";
  const horizEnd = toSide === "L" || toSide === "R";
  let points;
  if (horizStart && horizEnd) {
    const mid = Math.round(dx / 2);
    points = [[0, 0], [mid, 0], [mid, dy], [dx, dy]];
  } else if (!horizStart && !horizEnd) {
    const mid = Math.round(dy / 2);
    points = [[0, 0], [0, mid], [dx, mid], [dx, dy]];
  } else if (horizStart) {
    points = [[0, 0], [dx, 0], [dx, dy]]; // one elbow
  } else {
    points = [[0, 0], [0, dy], [dx, dy]];
  }
  // Drop consecutive duplicates (straight lines collapse to two points).
  return points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
}

// Edge kind -> arrow codes and dash pattern. 0 none, 2 filled block.
function edgeStyle(kind) {
  switch (kind) {
    case "async":
      return { startArrow: 0, endArrow: 2, dashStyle: "4.0,4.0" };
    case "data":
      return { startArrow: 0, endArrow: 0, dashStyle: null };
    case "bidirectional":
      return { startArrow: 2, endArrow: 2, dashStyle: null };
    default: // sync
      return { startArrow: 0, endArrow: 2, dashStyle: null };
  }
}

// ---------------------------------------------------------------------------
// Main.

function main() {
  const { input, output, theme: themeFlag } = parseArgs(process.argv.slice(2));
  const model = loadModel(input);
  const theme = themeFlag || model.theme || "light";
  const palette = PALETTES[theme];

  const positions = layoutNodes(model);
  const groupBoxes = layoutGroups(model, positions);

  let nextId = 1;
  let order = 0;
  const objects = [];
  const shapeIdByNode = new Map(); // node id -> gliffy numeric id, for constraints

  // Group backgrounds first so they sit behind everything else.
  for (const gb of groupBoxes) {
    const rectId = nextId++;
    const label = textChild(
      nextId++,
      gb.w,
      GROUP_LABEL_H,
      textHtml(gb.group.label, palette.group.text, { size: 12, bold: true, align: "left" }),
      { valign: "top" },
    );
    objects.push(rectangle(rectId, order++, gb, palette.group.fill, palette.group.stroke, [label]));
  }

  // One rectangle per node, with a centered label (and the tech slug, muted).
  for (const node of model.nodes) {
    const box = positions.get(node.id);
    const colors = palette.roles[node.role] || palette.roles.default;
    const rectId = nextId++;
    shapeIdByNode.set(node.id, rectId);
    let html = textHtml(node.label, palette.text);
    if (node.tech) html += textHtml(node.tech, palette.mutedText, { size: 10 });
    const label = textChild(nextId++, box.w, box.h, html);
    objects.push(rectangle(rectId, order++, box, colors.fill, colors.stroke, [label]));
  }

  // One orthogonal line per edge, endpoints glued to the two shapes.
  let skippedEdges = 0;
  for (const edge of model.edges || []) {
    const fromBox = positions.get(edge.from);
    const toBox = positions.get(edge.to);
    if (!fromBox || !toBox) {
      log(`skipping edge with unknown endpoint: ${edge.from} -> ${edge.to}`);
      skippedEdges++;
      continue;
    }
    const fromSide = pickSide(fromBox, toBox, edge.fromSide);
    const toSide = pickSide(toBox, fromBox, edge.toSide);
    const start = anchorPoint(fromBox, fromSide);
    const end = anchorPoint(toBox, toSide);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const { startArrow, endArrow, dashStyle } = edgeStyle(edge.kind || "sync");

    const children = [];
    if (edge.label) {
      // Wrap long labels to a few short lines so they do not overflow the line,
      // and lift the label clear of the line (perpendicular offset) so the line
      // does not run through the text.
      const lines = wrapWords(edge.label, 16);
      const labelW = Math.max(60, ...lines.map((l) => l.length * 7));
      const labelH = 14 * lines.length;
      children.push(
        textChild(
          nextId++,
          labelW,
          labelH,
          textHtml(edge.label, palette.mutedText, { size: 11, wrap: 16 }),
          { lineTValue: 0.5, linePerpValue: -(labelH / 2 + 6), cardinalityType: null },
        ),
      );
    }

    const [fpx, fpy] = SIDE_ANCHOR[fromSide];
    const [tpx, tpy] = SIDE_ANCHOR[toSide];
    objects.push({
      x: start.x,
      y: start.y,
      width: Math.abs(dx),
      height: Math.abs(dy),
      rotation: 0,
      id: nextId++,
      uid: "com.gliffy.shape.basic.basic_v1.default.line",
      order: order++,
      lockAspectRatio: false,
      lockShape: false,
      graphic: {
        type: "Line",
        Line: {
          strokeWidth: 2,
          strokeColor: palette.line,
          fillColor: "none",
          dashStyle,
          startArrow,
          endArrow,
          startArrowRotation: "auto",
          endArrowRotation: "auto",
          ortho: true,
          interpolationType: "linear",
          cornerRadius: 10,
          controlPath: orthoPath(fromSide, toSide, dx, dy),
          lockSegments: {},
        },
      },
      children,
      constraints: {
        constraints: [],
        startConstraint: {
          type: "StartPositionConstraint",
          StartPositionConstraint: { nodeId: shapeIdByNode.get(edge.from), px: fpx, py: fpy },
        },
        endConstraint: {
          type: "EndPositionConstraint",
          EndPositionConstraint: { nodeId: shapeIdByNode.get(edge.to), px: tpx, py: tpy },
        },
      },
      linkMap: [],
    });
  }

  // Stage size = content bounding box + margin.
  const maxX = Math.max(...objects.map((o) => o.x + (o.width || 0)));
  const maxY = Math.max(...objects.map((o) => o.y + (o.height || 0)));

  const doc = {
    contentType: "application/gliffy+json",
    version: "1.1",
    metadata: {
      title: model.title,
      revision: 0,
      exportBorder: false,
      loadPosition: "default",
      libraries: [],
    },
    embeddedResources: { index: 0, resources: [] },
    stage: {
      background: palette.background,
      width: Math.ceil(maxX + MARGIN),
      height: Math.ceil(maxY + MARGIN),
      nodeIndex: nextId,
      gridOn: true,
      snapToGrid: true,
      objects,
    },
  };

  try {
    writeFileSync(output, JSON.stringify(doc, null, 2) + "\n");
  } catch (err) {
    die(`cannot write ${output}: ${err.message}`);
  }

  const edgeCount = (model.edges || []).length - skippedEdges;
  log(`wrote ${output}: ${model.nodes.length} nodes, ${edgeCount} edges, ${groupBoxes.length} groups (theme: ${theme})`);
  log("deliver it via Gliffy's \"Import a Diagram\" button — there is no headless import.");
}

main();
