#!/usr/bin/env node
// mermaid-to-drawio.mjs — translate a diagram-model JSON file (see
// schema/diagram-model.schema.json) into an editable draw.io file.
//
// The output is native mxGraph XML: one movable vertex per node, one
// orthogonal edge per relation, and container cells for groups. Nothing is
// rasterized except node icons, which are embedded as PNG data URIs so the
// file stays self-contained.
//
// Usage:
//   node mermaid-to-drawio.mjs <diagram-model.json> <output.drawio> [--theme light|dark]
//
// The --theme flag overrides the model's own "theme" field. Icon paths in the
// model are resolved relative to the JSON file's directory.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { die, log } from "./lib/tools.mjs";

// ---------------------------------------------------------------------------
// Geometry constants (pixels). Tuned for readable spacing with orthogonal
// edge routing; all layout below is deterministic.
// ---------------------------------------------------------------------------
const NODE_W = 160; // plain vertex width
const NODE_H = 60; // plain vertex height
const ICON_SIZE = 72; // image vertex is square
const ICON_LABEL_CLEARANCE = 28; // room below an image vertex for its label
const MARGIN = 48; // canvas margin
const RANK_GAP = 140; // gap between ranks (columns for LR, rows for TB)
const STACK_GAP = 40; // gap between nodes inside one rank
const GROUP_GAP = 56; // extra gap where group membership changes in a rank
const GROUP_PAD = 24; // container padding around member cells
const GROUP_LABEL_PAD = 36; // extra top padding inside a container for its label

// ---------------------------------------------------------------------------
// Role palette. Fill/stroke/font per role, per theme. Hex only — draw.io
// styles take literal colors.
// ---------------------------------------------------------------------------
const PALETTE = {
  light: {
    service: { fill: "#eef2ff", stroke: "#6366f1" },
    datastore: { fill: "#ecfdf5", stroke: "#10b981" },
    queue: { fill: "#fff7ed", stroke: "#f97316" },
    cache: { fill: "#fef2f2", stroke: "#ef4444" },
    gateway: { fill: "#f0f9ff", stroke: "#0ea5e9" },
    external: { fill: "#f8fafc", stroke: "#94a3b8" },
    actor: { fill: "#fdf4ff", stroke: "#a855f7" },
    client: { fill: "#f0fdfa", stroke: "#14b8a6" },
    job: { fill: "#fefce8", stroke: "#eab308" },
    default: { fill: "#f8fafc", stroke: "#64748b" },
    font: "#1e293b",
    edge: "#64748b",
    edgeLabelBg: "#ffffff",
    groupFill: "#f8fafc",
    groupStroke: "#cbd5e1",
    groupFont: "#475569",
    background: "#ffffff",
  },
  dark: {
    service: { fill: "#312e81", stroke: "#818cf8" },
    datastore: { fill: "#064e3b", stroke: "#34d399" },
    queue: { fill: "#7c2d12", stroke: "#fb923c" },
    cache: { fill: "#7f1d1d", stroke: "#f87171" },
    gateway: { fill: "#0c4a6e", stroke: "#38bdf8" },
    external: { fill: "#1e293b", stroke: "#64748b" },
    actor: { fill: "#581c87", stroke: "#c084fc" },
    client: { fill: "#134e4a", stroke: "#2dd4bf" },
    job: { fill: "#713f12", stroke: "#facc15" },
    default: { fill: "#1f2937", stroke: "#94a3b8" },
    font: "#e2e8f0",
    edge: "#94a3b8",
    edgeLabelBg: "#0f172a",
    groupFill: "#162133",
    groupStroke: "#475569",
    groupFont: "#94a3b8",
    background: "#0f172a",
  },
};

// Side hint -> fractional connection point on the vertex perimeter.
const SIDE_POINT = {
  L: { x: 0, y: 0.5 },
  R: { x: 1, y: 0.5 },
  T: { x: 0.5, y: 0 },
  B: { x: 0.5, y: 1 },
};

/** Natural exit/entry sides for an edge, from the two boxes' centres. */
function portsFor(a, b) {
  const dx = a.x + a.w / 2 - (b.x + b.w / 2);
  const dy = a.y + a.h / 2 - (b.y + b.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx <= 0 ? { exit: "R", entry: "L" } : { exit: "L", entry: "R" };
  return dy <= 0 ? { exit: "B", entry: "T" } : { exit: "T", entry: "B" };
}

/** Style fragment pinning an edge endpoint to `side` at fractional offset `off`
 *  along that side. Spreading several edges that share one side into distinct
 *  offsets turns overlapping lines into parallel ones with separated labels. */
function portFragment(kind, side, off) {
  const o = Number(off.toFixed(3));
  if (side === "R") return `${kind}X=1;${kind}Y=${o};${kind}Dx=0;${kind}Dy=0;`;
  if (side === "L") return `${kind}X=0;${kind}Y=${o};${kind}Dx=0;${kind}Dy=0;`;
  if (side === "T") return `${kind}X=${o};${kind}Y=0;${kind}Dx=0;${kind}Dy=0;`;
  if (side === "B") return `${kind}X=${o};${kind}Y=1;${kind}Dx=0;${kind}Dy=0;`;
  return "";
}

/** Escape a string for use inside an XML attribute value. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Word-wrap an edge label into short lines so it never overflows. Returns a
 *  value for an mxCell `value="..."` attribute: each line is XML-escaped and the
 *  breaks are the entity-encoded `&lt;br&gt;`, which draw.io decodes back to a
 *  real <br> and (with html=1) renders as a line break. Using a raw "<br>" here
 *  would be invalid inside an XML attribute and draw.io would drop the cell.
 *  Long single words are kept whole rather than split mid-word. */
function wrapLabel(text, maxChars = 16) {
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
  return lines.map(esc).join("&lt;br&gt;");
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { theme: null, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--theme") {
      args.theme = argv[++i];
      if (!["light", "dark"].includes(args.theme)) {
        die(`invalid --theme "${args.theme}"`, "use --theme light or --theme dark");
      }
    } else if (argv[i].startsWith("-")) {
      die(`unknown flag "${argv[i]}"`, "usage: node mermaid-to-drawio.mjs <model.json> <out.drawio> [--theme light|dark]");
    } else {
      args.positional.push(argv[i]);
    }
  }
  if (args.positional.length !== 2) {
    die("expected an input model and an output path", "usage: node mermaid-to-drawio.mjs <model.json> <out.drawio> [--theme light|dark]");
  }
  return args;
}

// ---------------------------------------------------------------------------
// Model validation — minimal but strict on what would break the output.
// ---------------------------------------------------------------------------
function validate(model) {
  if (typeof model !== "object" || model === null || Array.isArray(model)) {
    die("model is not a JSON object");
  }
  if (typeof model.title !== "string" || !model.title) die("model.title is missing");
  if (!Array.isArray(model.nodes) || model.nodes.length === 0) die("model.nodes is missing or empty");

  const nodeIds = new Set();
  for (const n of model.nodes) {
    if (!n || typeof n.id !== "string" || typeof n.label !== "string") {
      die("every node needs a string id and label");
    }
    if (nodeIds.has(n.id)) die(`duplicate node id "${n.id}"`);
    nodeIds.add(n.id);
  }

  const groupIds = new Set();
  for (const g of model.groups ?? []) {
    if (!g || typeof g.id !== "string" || typeof g.label !== "string") {
      die("every group needs a string id and label");
    }
    if (groupIds.has(g.id)) die(`duplicate group id "${g.id}"`);
    groupIds.add(g.id);
  }

  // Drop malformed or dangling edges with a warning rather than aborting the
  // whole diagram — one bad edge should not cost the user their drawing.
  model.edges = (model.edges ?? []).filter((e) => {
    if (!e || typeof e.from !== "string" || typeof e.to !== "string") {
      log("skipping edge with missing from/to fields");
      return false;
    }
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
      log(`skipping edge with unknown endpoint: ${e.from} -> ${e.to}`);
      return false;
    }
    return true;
  });
  return { nodeIds, groupIds };
}

// ---------------------------------------------------------------------------
// Icons — accept a data URI or a PNG file path; anything else (for example an
// Iconify id meant for Mermaid) falls back to a plain vertex.
// ---------------------------------------------------------------------------
async function resolveIcon(icon, baseDir, nodeId) {
  if (!icon) return null;
  if (icon.startsWith("data:image/")) {
    // draw.io stores data URIs with a comma instead of ";base64," inside
    // styles, because ";" is the style separator.
    return icon.replace(";base64,", ",");
  }
  if (icon.includes(":") || !icon.toLowerCase().endsWith(".png")) {
    log(`note: node "${nodeId}" icon "${icon}" is not a PNG path or data URI; drawing a plain vertex`);
    return null;
  }
  const file = path.resolve(baseDir, icon);
  try {
    const buf = await readFile(file);
    return `data:image/png,${buf.toString("base64")}`;
  } catch {
    log(`note: icon file not found for node "${nodeId}" (${file}); drawing a plain vertex`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Layout — simple layered placement.
//
// 1. Rank every node by its longest path from a source (cycle-safe).
// 2. Ranks become columns (LR/RL) or rows (TB/BT).
// 3. Inside a rank, nodes sort by group path so group members stay adjacent,
//    with extra spacing where membership changes.
// ---------------------------------------------------------------------------
function computeRanks(nodes, edges) {
  const rank = new Map(nodes.map((n) => [n.id, 0]));
  // Longest-path relaxation, bounded by node count so cycles cannot loop
  // forever; ranks are capped at nodes.length for the same reason.
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const e of edges) {
      const candidate = rank.get(e.from) + 1;
      if (candidate < nodes.length && candidate > rank.get(e.to)) {
        rank.set(e.to, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return rank;
}

/** "cloud/vpc" style path used to keep group members adjacent when sorting. */
function groupPathOf(groupId, groupById) {
  const parts = [];
  const seen = new Set();
  let cur = groupId;
  while (cur && groupById.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    parts.unshift(cur);
    cur = groupById.get(cur).parent;
  }
  return parts.join("/");
}

function layout(model, iconById) {
  const groupById = new Map((model.groups ?? []).map((g) => [g.id, g]));
  const rank = computeRanks(model.nodes, model.edges ?? []);
  const direction = model.direction ?? "LR";
  const horizontal = direction === "LR" || direction === "RL";

  // Per-node box size. Image vertices reserve clearance for the label below.
  const size = new Map();
  for (const n of model.nodes) {
    const iconic = iconById.has(n.id);
    size.set(n.id, {
      w: iconic ? ICON_SIZE : NODE_W,
      h: iconic ? ICON_SIZE : NODE_H,
      clearance: iconic ? ICON_LABEL_CLEARANCE : 0,
    });
  }

  // Bucket nodes by rank, sorted so group members are contiguous.
  const maxRank = Math.max(...model.nodes.map((n) => rank.get(n.id)));
  const buckets = [];
  for (let r = 0; r <= maxRank; r++) {
    const inRank = model.nodes.filter((n) => rank.get(n.id) === r);
    inRank.sort((a, b) => {
      const pa = groupPathOf(a.group, groupById);
      const pb = groupPathOf(b.group, groupById);
      return pa === pb ? a.id.localeCompare(b.id) : pa.localeCompare(pb);
    });
    buckets.push(inRank);
  }
  // RL and BT reverse the visual order of ranks.
  const visual = direction === "RL" || direction === "BT" ? [...buckets].reverse() : buckets;

  // Walk ranks along the main axis, stack nodes along the cross axis.
  const pos = new Map();
  let mainCursor = MARGIN;
  for (const bucket of visual) {
    if (bucket.length === 0) continue;
    const mainExtent = Math.max(
      ...bucket.map((n) => (horizontal ? size.get(n.id).w : size.get(n.id).h + size.get(n.id).clearance)),
    );
    let crossCursor = MARGIN + GROUP_LABEL_PAD;
    let prevPath = null;
    for (const n of bucket) {
      const p = groupPathOf(n.group, groupById);
      if (prevPath !== null && p !== prevPath && (p || prevPath)) crossCursor += GROUP_GAP;
      prevPath = p;
      const s = size.get(n.id);
      if (horizontal) {
        pos.set(n.id, { x: mainCursor + (mainExtent - s.w) / 2, y: crossCursor, ...s });
        crossCursor += s.h + s.clearance + STACK_GAP;
      } else {
        pos.set(n.id, { x: crossCursor, y: mainCursor + (mainExtent - s.h) / 2, ...s });
        crossCursor += s.w + STACK_GAP;
      }
    }
    mainCursor += mainExtent + RANK_GAP;
  }
  return { pos, groupById };
}

/** Absolute bounding boxes for groups, deepest first so parents enclose children. */
function computeGroupBoxes(model, pos, groupById) {
  const groups = model.groups ?? [];
  const depth = (g) => {
    let d = 0;
    const seen = new Set();
    let cur = g.parent;
    while (cur && groupById.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      d++;
      cur = groupById.get(cur).parent;
    }
    return d;
  };
  const boxes = new Map();
  for (const g of [...groups].sort((a, b) => depth(b) - depth(a))) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of model.nodes) {
      if (n.group !== g.id) continue;
      const p = pos.get(n.id);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w);
      maxY = Math.max(maxY, p.y + p.h + p.clearance);
    }
    for (const child of groups) {
      if (child.parent !== g.id || !boxes.has(child.id)) continue;
      const b = boxes.get(child.id);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    if (minX === Infinity) {
      log(`note: group "${g.id}" has no members; skipping it`);
      continue;
    }
    boxes.set(g.id, {
      x: minX - GROUP_PAD,
      y: minY - GROUP_LABEL_PAD,
      w: maxX - minX + 2 * GROUP_PAD,
      h: maxY - minY + GROUP_LABEL_PAD + GROUP_PAD,
    });
  }
  return boxes;
}

// ---------------------------------------------------------------------------
// XML emission
// ---------------------------------------------------------------------------
function emit(model, theme, pos, groupById, groupBoxes, iconById) {
  const pal = PALETTE[theme];
  const cells = [];

  // Cell ids are prefixed so node/group id spaces can never collide.
  const groupCellId = (id) => `g_${id}`;
  const nodeCellId = (id) => `n_${id}`;

  // Parent cell + absolute origin of that parent, for relative geometry.
  const parentOf = (groupId) => {
    if (groupId && groupBoxes.has(groupId)) {
      const b = groupBoxes.get(groupId);
      return { id: groupCellId(groupId), ox: b.x, oy: b.y };
    }
    return { id: "1", ox: 0, oy: 0 };
  };

  // Groups first (parents before children), as container cells.
  const groups = (model.groups ?? []).filter((g) => groupBoxes.has(g.id));
  const emitted = new Set();
  const emitGroup = (g) => {
    if (emitted.has(g.id)) return;
    const parent = groupById.get(g.parent);
    if (parent) emitGroup(parent);
    emitted.add(g.id);
    const b = groupBoxes.get(g.id);
    const p = parentOf(g.parent && groupBoxes.has(g.parent) ? g.parent : null);
    const style =
      `rounded=1;container=1;collapsible=0;html=1;whiteSpace=wrap;verticalAlign=top;align=left;` +
      `spacingLeft=12;spacingTop=4;fontSize=12;fontStyle=1;arcSize=6;` +
      `fillColor=${pal.groupFill};strokeColor=${pal.groupStroke};fontColor=${pal.groupFont};`;
    cells.push(
      `        <mxCell id="${esc(groupCellId(g.id))}" value="${esc(g.label)}" style="${esc(style)}" vertex="1" parent="${esc(p.id)}">\n` +
        `          <mxGeometry x="${b.x - p.ox}" y="${b.y - p.oy}" width="${b.w}" height="${b.h}" as="geometry"/>\n` +
        `        </mxCell>`,
    );
  };
  groups.forEach(emitGroup);

  // Nodes.
  for (const n of model.nodes) {
    const p = pos.get(n.id);
    const parent = parentOf(n.group);
    const role = PALETTE[theme][n.role] ? n.role : "default";
    const colors = pal[role];
    const icon = iconById.get(n.id);
    let style;
    if (icon) {
      style =
        `shape=image;html=1;image=${icon};imageBorder=none;` +
        `verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=none;` +
        `fontSize=12;fontColor=${pal.font};`;
    } else {
      style =
        `rounded=1;whiteSpace=wrap;html=1;arcSize=8;fontSize=13;` +
        `fillColor=${colors.fill};strokeColor=${colors.stroke};fontColor=${pal.font};` +
        (n.role === "external" ? "dashed=1;" : "");
    }
    cells.push(
      `        <mxCell id="${esc(nodeCellId(n.id))}" value="${esc(n.label)}" style="${esc(style)}" vertex="1" parent="${esc(parent.id)}">\n` +
        `          <mxGeometry x="${p.x - parent.ox}" y="${p.y - parent.oy}" width="${p.w}" height="${p.h}" as="geometry"/>\n` +
        `        </mxCell>`,
    );
  }

  // Edges. Pick each endpoint's side from the real geometry (an explicit
  // fromSide/toSide wins), then spread edges that share a node side into parallel
  // ports so their lines — and labels — separate instead of stacking. Labels are
  // word-wrapped and drawn on an opaque background so long text stays readable.
  const edges = model.edges ?? [];
  const sides = edges.map((e) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    const auto = a && b ? portsFor(a, b) : { exit: null, entry: null };
    return { exit: e.fromSide ?? auto.exit, entry: e.toSide ?? auto.entry };
  });
  // Fractional offset of each edge within its (node, side) bundle.
  const offsetsBy = (keyOf) => {
    const lists = new Map();
    edges.forEach((e, i) => {
      const k = keyOf(e, i);
      if (!lists.has(k)) lists.set(k, []);
      lists.get(k).push(i);
    });
    const off = new Map();
    for (const list of lists.values())
      list.forEach((i, idx) => off.set(i, list.length > 1 ? (idx + 1) / (list.length + 1) : 0.5));
    return off;
  };
  const exitOffset = offsetsBy((e, i) => `${e.from}|${sides[i].exit}`);
  const entryOffset = offsetsBy((e, i) => `${e.to}|${sides[i].entry}`);

  edges.forEach((e, i) => {
    const kind = e.kind ?? "sync";
    let style =
      `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;jettySize=auto;orthogonalLoop=1;` +
      `fontSize=11;fontColor=${pal.font};strokeColor=${pal.edge};` +
      `labelBackgroundColor=${pal.edgeLabelBg};spacing=4;`;
    if (kind === "async") style += "endArrow=block;endFill=1;dashed=1;";
    else if (kind === "data") style += "endArrow=open;endFill=0;";
    else if (kind === "bidirectional") style += "startArrow=block;startFill=1;endArrow=block;endFill=1;";
    else style += "endArrow=block;endFill=1;";
    if (sides[i].exit) style += portFragment("exit", sides[i].exit, exitOffset.get(i));
    if (sides[i].entry) style += portFragment("entry", sides[i].entry, entryOffset.get(i));
    cells.push(
      `        <mxCell id="e_${i}"${e.label ? ` value="${wrapLabel(e.label)}"` : ""} style="${esc(style)}" edge="1" parent="1" source="${esc(nodeCellId(e.from))}" target="${esc(nodeCellId(e.to))}">\n` +
        `          <mxGeometry relative="1" as="geometry"/>\n` +
        `        </mxCell>`,
    );
  });

  const background = theme === "dark" ? ` background="${pal.background}"` : "";
  return (
    `<mxfile host="app.diagrams.net" type="device">\n` +
    `  <diagram id="diagram-1" name="${esc(model.title)}">\n` +
    `    <mxGraphModel dx="800" dy="600" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="826" math="0" shadow="0"${background}>\n` +
    `      <root>\n` +
    `        <mxCell id="0"/>\n` +
    `        <mxCell id="1" parent="0"/>\n` +
    cells.join("\n") +
    `\n      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>\n` +
    `</mxfile>\n`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { theme: themeFlag, positional } = parseArgs(process.argv.slice(2));
  const [inputPath, outputPath] = positional;

  let raw;
  try {
    raw = await readFile(inputPath, "utf8");
  } catch (err) {
    die(`cannot read ${inputPath}: ${err.message}`);
  }
  let model;
  try {
    model = JSON.parse(raw);
  } catch (err) {
    die(`${inputPath} is not valid JSON: ${err.message}`);
  }
  validate(model);

  const theme = themeFlag ?? (model.theme === "dark" ? "dark" : "light");
  const baseDir = path.dirname(path.resolve(inputPath));

  // Resolve icons up front; failures degrade to plain vertices, never abort.
  const iconById = new Map();
  for (const n of model.nodes) {
    const uri = await resolveIcon(n.icon, baseDir, n.id);
    if (uri) iconById.set(n.id, uri);
  }

  const { pos, groupById } = layout(model, iconById);
  const groupBoxes = computeGroupBoxes(model, pos, groupById);
  const xml = emit(model, theme, pos, groupById, groupBoxes, iconById);

  try {
    await writeFile(outputPath, xml, "utf8");
  } catch (err) {
    die(`cannot write ${outputPath}: ${err.message}`);
  }
  log(
    `wrote ${outputPath} (${model.nodes.length} nodes, ${(model.edges ?? []).length} edges, ` +
      `${groupBoxes.size} groups, ${theme} theme)`,
  );
}

main();
