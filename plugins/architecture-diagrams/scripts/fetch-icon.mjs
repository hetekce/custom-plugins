#!/usr/bin/env node
// fetch-icon.mjs — resolve a technology slug to a brand icon for diagrams.
//
// Usage:
//   node fetch-icon.mjs <tech-slug> [--size 256] [--format png|svg|datauri|iconify] [--out <file>]
//
// Formats:
//   iconify  print the Iconify id for the slug (for Mermaid icon packs); no network
//   svg      fetch the SVG and write it to --out, or print it to stdout
//   png      fetch the SVG, rasterize it, write the PNG (to --out or the cache),
//            and print the resulting file path
//   datauri  like png, but print a data: URI for embedding in draw.io/Gliffy
//
// Default format: datauri, unless --out ends in .png or .svg (then png/svg).
//
// Sources, tried in priority order (licenses listed in the plugin NOTICE):
//   1. Iconify "logos" collection (CC0) via api.iconify.design
//   2. Devicon (MIT) via jsDelivr
//   3. Simple Icons (CC0) via cdn.simpleicons.org
// The official AWS/Azure/GCP icon sets are proprietary and deliberately unused.
//
// A slug containing ":" (e.g. "devicon:neo4j") is treated as a full Iconify id.

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { hasTool, run, die, log } from "./lib/tools.mjs";

// Plugin root, for the bundled icon set under assets/icons/. Prefer the env
// var Claude Code sets; fall back to this script's location (plugin/scripts/).
const PLUGIN_ROOT =
  process.env.CLAUDE_PLUGIN_ROOT ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLED_SIZES = new Set([128, 256]);

/** Look up a slug in the bundled set. Returns {svg, png} absolute paths that exist, or nulls.
 *  Tries the slug itself and, for "pack:name" ids, the name part — so a role
 *  default like "lucide:circle-user-round" resolves to bundled "circle-user-round". */
async function bundled(slug, size) {
  const names = [slug];
  if (slug.includes(":")) names.push(slug.split(":")[1]);
  for (const name of names) {
    const svg = path.join(PLUGIN_ROOT, "assets", "icons", "svg", `${name}.svg`);
    const png = path.join(PLUGIN_ROOT, "assets", "icons", "png", String(size), `${name}.png`);
    const svgOk = (await exists(svg)) ? svg : null;
    const pngOk = BUNDLED_SIZES.has(size) && (await exists(png)) ? png : null;
    if (svgOk || pngOk) return { svg: svgOk, png: pngOk };
  }
  return { svg: null, png: null };
}

const FORMATS = new Set(["png", "svg", "datauri", "iconify"]);

// Common spellings mapped to the canonical slug used by the icon map.
const ALIASES = {
  postgres: "postgresql",
  golang: "go",
  node: "nodejs",
  "node-js": "nodejs",
  k8s: "kubernetes",
  js: "javascript",
  ts: "typescript",
  "google-cloud": "gcp",
  "microsoft-azure": "azure",
  lambda: "aws-lambda",
  s3: "aws-s3",
  ec2: "aws-ec2",
};

// Canonical slug -> Iconify id. Prefers the CC0 "logos" collection (colored
// brand marks). Anything missing here falls through to Devicon, then to
// Simple Icons by slug.
const ICON_MAP = {
  // data stores and messaging
  postgresql: "logos:postgresql",
  mysql: "logos:mysql",
  mariadb: "logos:mariadb-icon",
  sqlite: "logos:sqlite",
  mongodb: "logos:mongodb-icon",
  redis: "logos:redis",
  cassandra: "logos:cassandra",
  clickhouse: "logos:clickhouse",
  elasticsearch: "logos:elasticsearch",
  kafka: "logos:kafka-icon",
  rabbitmq: "logos:rabbitmq-icon",
  // runtime, infrastructure, observability
  docker: "logos:docker-icon",
  kubernetes: "logos:kubernetes",
  helm: "logos:helm",
  nginx: "logos:nginx",
  terraform: "logos:terraform-icon",
  ansible: "logos:ansible",
  vault: "logos:vault-icon",
  jenkins: "logos:jenkins",
  grafana: "logos:grafana",
  prometheus: "logos:prometheus",
  // cloud (CC0/MIT brand marks, not the proprietary provider sets)
  aws: "logos:aws",
  "aws-lambda": "logos:aws-lambda",
  "aws-s3": "logos:aws-s3",
  "aws-ec2": "logos:aws-ec2",
  "aws-rds": "logos:aws-rds",
  "aws-dynamodb": "logos:aws-dynamodb",
  "aws-sqs": "logos:aws-sqs",
  "aws-api-gateway": "logos:aws-api-gateway",
  gcp: "logos:google-cloud",
  azure: "logos:microsoft-azure",
  // languages
  nodejs: "logos:nodejs-icon",
  javascript: "logos:javascript",
  typescript: "logos:typescript-icon",
  python: "logos:python",
  java: "logos:java",
  go: "logos:go",
  rust: "logos:rust",
  csharp: "logos:c-sharp",
  dotnet: "logos:dotnet",
  php: "logos:php",
  ruby: "logos:ruby",
  kotlin: "logos:kotlin-icon",
  swift: "logos:swift",
  // frameworks and frontend
  react: "logos:react",
  vue: "logos:vue",
  angular: "logos:angular-icon",
  svelte: "logos:svelte-icon",
  nextjs: "logos:nextjs-icon",
  spring: "logos:spring-icon",
  django: "logos:django-icon",
  flask: "logos:flask",
  fastapi: "logos:fastapi-icon",
  rails: "logos:rails",
  laravel: "logos:laravel",
  graphql: "logos:graphql",
  tailwindcss: "logos:tailwindcss-icon",
  // tooling
  git: "logos:git-icon",
  github: "logos:github-icon",
  gitlab: "logos:gitlab",
};

const USAGE =
  "usage: node fetch-icon.mjs <tech-slug> [--size 256] [--format png|svg|datauri|iconify] [--out <file>]";

function parseArgs(argv) {
  const args = { slug: null, size: 256, format: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--size") args.size = Number(argv[++i]);
    else if (a === "--format") args.format = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (a.startsWith("-")) die(`unknown option '${a}'`, USAGE);
    else if (args.slug === null) args.slug = a;
    else die(`unexpected argument '${a}'`, USAGE);
  }
  if (!args.slug) die("missing <tech-slug>", USAGE);
  if (!Number.isInteger(args.size) || args.size <= 0)
    die(`--size must be a positive integer, got '${args.size}'`);
  if (args.format === null) {
    // Infer from --out extension; default to a data URI otherwise.
    if (args.out?.endsWith(".png")) args.format = "png";
    else if (args.out?.endsWith(".svg")) args.format = "svg";
    else args.format = "datauri";
  }
  if (!FORMATS.has(args.format))
    die(`--format must be one of png|svg|datauri|iconify, got '${args.format}'`);
  return args;
}

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}

/** Fetch the first URL that returns an SVG body; null if none does. */
async function fetchFirstSvg(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const body = await res.text();
      // Iconify answers 200 with "404" text for unknown icons; require real SVG.
      if (body.includes("<svg")) return { svg: body, url };
    } catch {
      // Network error or timeout — try the next source.
    }
  }
  return null;
}

/** Rasterize an SVG file to PNG. Returns true on success, false if no tool. */
async function rasterize(svgPath, pngPath, size) {
  if (await hasTool("resvg")) {
    const r = await run("resvg", [svgPath, pngPath, "--width", String(size)]);
    if (r.code === 0) return true;
    log(`warning: resvg failed (${r.stderr.trim() || "unknown error"}); trying rsvg-convert`);
  }
  if (await hasTool("rsvg-convert")) {
    const r = await run("rsvg-convert", ["-w", String(size), "-o", pngPath, svgPath]);
    if (r.code === 0) return true;
    log(`warning: rsvg-convert failed (${r.stderr.trim() || "unknown error"})`);
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = args.slug.toLowerCase();
  const slug = ALIASES[raw] ?? raw;
  // An explicit "pack:name" slug is already an Iconify id; otherwise map it.
  const iconifyId = raw.includes(":") ? raw : (ICON_MAP[slug] ?? null);

  if (args.format === "iconify") {
    if (!iconifyId)
      die(
        `no Iconify id known for '${slug}'`,
        "search https://icones.js.org and pass the full id, e.g. 'logos:postgresql'",
      );
    console.log(iconifyId);
    return;
  }

  // Bundled set first — offline, deterministic, license-clean. Serves the
  // 240+ pre-rasterized icons under assets/icons/ without touching the network.
  const b = await bundled(slug, args.size);
  if (args.format === "png" && b.png) {
    const out = args.out ? path.resolve(args.out) : b.png;
    if (args.out) {
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, await readFile(b.png));
    }
    console.log(out);
    return;
  }
  if (args.format === "datauri" && b.png) {
    console.log(`data:image/png;base64,${(await readFile(b.png)).toString("base64")}`);
    return;
  }
  if (args.format === "svg" && b.svg) {
    const bsvg = await readFile(b.svg, "utf8");
    if (args.out) {
      await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
      await writeFile(args.out, bsvg, "utf8");
      console.log(path.resolve(args.out));
    } else {
      process.stdout.write(bsvg);
    }
    return;
  }

  // Cache fetched/rasterized icons by (slug, size) so repeated renders are free.
  const cacheDir = path.join(os.tmpdir(), "architecture-diagrams", "icon-cache");
  await mkdir(cacheDir, { recursive: true });
  const key = `${slug.replace(/[^a-z0-9_-]/g, "_")}-${args.size}`;
  const svgCache = path.join(cacheDir, `${key}.svg`);
  const pngCache = path.join(cacheDir, `${key}.png`);

  // Get the SVG: cache first, then the sources in priority order.
  let svg;
  if (await exists(svgCache)) {
    svg = await readFile(svgCache, "utf8");
  } else if (b.svg) {
    // A bundled SVG at a non-bundled size — rasterize it locally, no network.
    svg = await readFile(b.svg, "utf8");
    await writeFile(svgCache, svg, "utf8");
  } else {
    const candidates = [];
    if (iconifyId) {
      const [pack, name] = iconifyId.split(":");
      candidates.push(`https://api.iconify.design/${pack}/${name}.svg?height=${args.size}`);
    }
    candidates.push(
      `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}-original.svg`,
      `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`,
    );
    const hit = await fetchFirstSvg(candidates);
    if (!hit)
      die(
        `could not fetch an icon for '${slug}' from any source`,
        "check network access, or search https://icones.js.org and pass a full Iconify id (e.g. 'logos:postgresql')",
      );
    log(`fetched ${hit.url}`);
    svg = hit.svg;
    await writeFile(svgCache, svg, "utf8");
  }

  if (args.format === "svg") {
    if (args.out) {
      await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
      await writeFile(args.out, svg, "utf8");
      console.log(path.resolve(args.out));
    } else {
      process.stdout.write(svg);
    }
    return;
  }

  // png or datauri: rasterize (via cache) with resvg -> rsvg-convert.
  let png = null;
  if (await exists(pngCache)) {
    png = await readFile(pngCache);
  } else if (await rasterize(svgCache, pngCache, args.size)) {
    png = await readFile(pngCache);
  } else {
    log("warning: neither 'resvg' nor 'rsvg-convert' is installed; emitting SVG instead of PNG");
    log("hint: install resvg (cargo install resvg) or librsvg (apt install librsvg2-bin)");
  }

  if (args.format === "datauri") {
    // draw.io accepts both PNG and SVG data URIs in shape=image cells.
    const uri = png
      ? `data:image/png;base64,${png.toString("base64")}`
      : `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
    console.log(uri);
    return;
  }

  // format png: write a file and print its path. Without a rasterizer the best
  // we can do is the SVG, under a truthful extension.
  let outPath = args.out
    ? path.resolve(args.out)
    : png
      ? pngCache
      : svgCache;
  if (!png && outPath.endsWith(".png")) outPath = outPath.replace(/\.png$/, ".svg");
  if (args.out) {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, png ?? svg);
  }
  console.log(outPath);
}

main().catch((err) => die(err?.message ?? String(err)));
