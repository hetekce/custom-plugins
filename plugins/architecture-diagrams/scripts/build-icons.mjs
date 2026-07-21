#!/usr/bin/env node
// build-icons.mjs — maintainer tool that bundles tech-stack icons for the plugin.
//
// Usage:
//   node build-icons.mjs [--sizes 128,256] [--only slug1,slug2] [--refetch]
//
// Reads assets/icons/catalog.json. For each entry it probes the candidate
// sources IN ORDER (iconify -> devicon -> simple) and keeps the first that
// returns a real SVG:
//
//   iconify  https://api.iconify.design/<prefix>/<name>.svg      CC0/MIT (gilbarbara/logos et al.)
//   devicon  https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/<ref>.svg   MIT
//   simple   https://cdn.simpleicons.org/<ref>                   CC0
//
// The winning SVG is saved to assets/icons/svg/<slug>.svg and rasterized with
// @resvg/resvg-js to assets/icons/png/<size>/<slug>.png (transparent
// background, fit to width). Outputs assets/icons/manifest.json and
// assets/icons/GAPS.md. Licensing/trademark notes: see the plugin NOTICE.
//
// Idempotent: a slug whose SVG and PNGs already exist (and appears in the
// previous manifest) is skipped; pass --refetch to force re-probing.
// Proprietary AWS/Azure/GCP architecture icon sets are deliberately not used.

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { log, die } from "./lib/tools.mjs";

let Resvg;
try {
  ({ Resvg } = await import("@resvg/resvg-js"));
} catch {
  die(
    "@resvg/resvg-js is not installed",
    "run: cd plugins/architecture-diagrams/scripts && npm install",
  );
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(SCRIPT_DIR, "..");
const ICONS_DIR = path.join(PLUGIN_ROOT, "assets", "icons");
const CATALOG_PATH = path.join(ICONS_DIR, "catalog.json");
const MANIFEST_PATH = path.join(ICONS_DIR, "manifest.json");
const GAPS_PATH = path.join(ICONS_DIR, "GAPS.md");

const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 10_000;

const LICENSES = {
  iconify: "CC0-1.0 / MIT (Iconify collections, primarily gilbarbara/logos)",
  devicon: "MIT (devicons/devicon)",
  simple: "CC0-1.0 (simple-icons)",
};

const USAGE = "usage: node build-icons.mjs [--sizes 128,256] [--only slug1,slug2] [--refetch]";

function parseArgs(argv) {
  const args = { sizes: [128, 256], only: null, refetch: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sizes") {
      args.sizes = String(argv[++i] ?? "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter(Boolean);
      if (!args.sizes.length || args.sizes.some((n) => !Number.isInteger(n) || n <= 0))
        die("--sizes must be a comma-separated list of positive integers", USAGE);
    } else if (a === "--only") {
      args.only = new Set(
        String(argv[++i] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      if (!args.only.size) die("--only needs at least one slug", USAGE);
    } else if (a === "--refetch") {
      args.refetch = true;
    } else if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else {
      die(`unknown argument '${a}'`, USAGE);
    }
  }
  return args;
}

function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}

/** Candidate download URLs for a catalog entry, in probe priority order. */
function candidates(entry) {
  const list = [];
  if (entry.iconify) {
    const [prefix, name] = entry.iconify.split(":");
    if (prefix && name)
      list.push({
        source: "iconify",
        ref: entry.iconify,
        url: `https://api.iconify.design/${prefix}/${name}.svg`,
      });
  }
  if (entry.devicon)
    list.push({
      source: "devicon",
      ref: entry.devicon,
      url: `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${entry.devicon}.svg`,
    });
  if (entry.simple)
    list.push({
      source: "simple",
      ref: entry.simple,
      url: `https://cdn.simpleicons.org/${encodeURIComponent(entry.simple)}`,
    });
  return list;
}

/** Fetch a URL; resolve to the SVG text on a real hit, null otherwise. */
async function fetchSvg(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = await res.text();
    // api.iconify.design can answer 200 with a "404" body; require real SVG.
    return body.includes("<svg") ? body : null;
  } catch {
    return null; // network error or timeout — treat as a miss
  }
}

/** Rasterize SVG text to a PNG buffer at the given width (transparent bg). */
function svgToPng(svg, width) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

/** Relative-to-plugin-root path with forward slashes, for the manifest. */
function rel(p) {
  return path.relative(PLUGIN_ROOT, p).split(path.sep).join("/");
}

async function processEntry(entry, { sizes, refetch, previous }) {
  const svgPath = path.join(ICONS_DIR, "svg", `${entry.slug}.svg`);
  const pngPaths = Object.fromEntries(
    sizes.map((s) => [s, path.join(ICONS_DIR, "png", String(s), `${entry.slug}.png`)]),
  );

  // Idempotent skip: everything already on disk and resolved before.
  const prev = previous?.icons?.[entry.slug];
  if (!refetch && prev?.source) {
    const allThere =
      (await exists(svgPath)) &&
      (await Promise.all(sizes.map((s) => exists(pngPaths[s])))).every(Boolean);
    if (allThere) {
      return {
        slug: entry.slug,
        status: "cached",
        record: { ...prev, name: entry.name, category: entry.category, ...(entry.note ? { note: entry.note } : {}) },
      };
    }
  }

  let svg = null;
  let hit = null;
  for (const cand of candidates(entry)) {
    svg = await fetchSvg(cand.url);
    if (svg) {
      hit = cand;
      break;
    }
  }
  if (!svg) return { slug: entry.slug, status: "gap" };

  await writeFile(svgPath, svg, "utf8");

  const png = {};
  for (const size of sizes) {
    try {
      await writeFile(pngPaths[size], svgToPng(svg, size));
      png[size] = rel(pngPaths[size]);
    } catch (err) {
      log(`warning: ${entry.slug}: rasterization at ${size}px failed (${err?.message ?? err})`);
    }
  }

  return {
    slug: entry.slug,
    status: "resolved",
    record: {
      source: hit.source,
      license: LICENSES[hit.source],
      ref: hit.ref,
      name: entry.name,
      category: entry.category,
      ...(entry.note ? { note: entry.note } : {}),
      svg: rel(svgPath),
      png,
    },
  };
}

/** Run tasks over items with bounded concurrency, preserving input order. */
async function pool(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let catalog;
  try {
    catalog = JSON.parse(await readFile(CATALOG_PATH, "utf8"));
  } catch (err) {
    die(`cannot read catalog at ${CATALOG_PATH}: ${err?.message ?? err}`);
  }
  if (!Array.isArray(catalog) || !catalog.length) die("catalog.json must be a non-empty array");

  const seen = new Set();
  for (const e of catalog) {
    if (!e.slug || !e.name || !e.category) die(`catalog entry missing slug/name/category: ${JSON.stringify(e)}`);
    if (seen.has(e.slug)) die(`duplicate slug in catalog: ${e.slug}`);
    seen.add(e.slug);
  }

  let entries = catalog;
  if (args.only) {
    entries = catalog.filter((e) => args.only.has(e.slug));
    const missing = [...args.only].filter((s) => !entries.some((e) => e.slug === s));
    if (missing.length) die(`--only slugs not in catalog: ${missing.join(", ")}`);
  }

  let previous = null;
  try {
    previous = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    // no previous manifest — fine
  }

  await mkdir(path.join(ICONS_DIR, "svg"), { recursive: true });
  for (const s of args.sizes) await mkdir(path.join(ICONS_DIR, "png", String(s)), { recursive: true });

  log(`building ${entries.length} icons (sizes: ${args.sizes.join(", ")}, concurrency: ${CONCURRENCY})`);
  let done = 0;
  const results = await pool(entries, CONCURRENCY, async (entry) => {
    const r = await processEntry(entry, { sizes: args.sizes, refetch: args.refetch, previous });
    done++;
    if (r.status === "gap") log(`[${done}/${entries.length}] MISS ${entry.slug}`);
    else if (done % 25 === 0 || done === entries.length) log(`[${done}/${entries.length}] ...`);
    return r;
  });

  // Merge into the previous manifest so --only runs do not drop other icons.
  const icons = { ...(args.only ? (previous?.icons ?? {}) : {}) };
  const gaps = [];
  const bySource = { iconify: 0, devicon: 0, simple: 0 };
  let cached = 0;
  for (const r of results) {
    if (r.status === "gap") {
      gaps.push(r.slug);
      delete icons[r.slug];
      continue;
    }
    if (r.status === "cached") cached++;
    icons[r.slug] = r.record;
    bySource[r.record.source] = (bySource[r.record.source] ?? 0) + 1;
  }

  const sorted = Object.fromEntries(Object.keys(icons).sort().map((k) => [k, icons[k]]));
  const manifest = {
    generatedAtNote:
      "Generated by scripts/build-icons.mjs from assets/icons/catalog.json. Do not edit by hand; re-run `npm run build:icons` in scripts/ to regenerate. Licensing and trademark notes: see the plugin NOTICE.",
    count: Object.keys(sorted).length,
    sizes: args.sizes,
    icons: sorted,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const gapLines = [
    "# Icon gaps",
    "",
    "Catalog slugs for which no candidate source (Iconify logos, Devicon,",
    "Simple Icons) returned an SVG on the last `build-icons.mjs` run.",
    "To fix one: find a permissively licensed ref (e.g. on https://icones.js.org),",
    "update `catalog.json`, and re-run the build. Do not substitute icons from",
    "proprietary cloud-provider icon sets.",
    "",
    ...(gaps.length ? gaps.sort().map((s) => `- ${s}`) : ["_None — every catalog entry resolved._"]),
    "",
  ];
  await writeFile(GAPS_PATH, gapLines.join("\n"), "utf8");

  log("");
  log(`resolved: ${Object.keys(sorted).length}/${entries.length + (args.only ? 0 : 0)} in scope (${cached} reused from disk)`);
  log(`by source: iconify=${bySource.iconify} devicon=${bySource.devicon} simple=${bySource.simple}`);
  log(`gaps: ${gaps.length}${gaps.length ? ` (${gaps.sort().join(", ")})` : ""}`);
  log(`wrote ${rel(MANIFEST_PATH)} and ${rel(GAPS_PATH)}`);
}

main().catch((err) => die(err?.stack ?? String(err)));
