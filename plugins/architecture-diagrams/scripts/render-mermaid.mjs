#!/usr/bin/env node
// Render a Mermaid .mmd file to a high-resolution JPEG.
//
// Usage: node render-mermaid.mjs <input.mmd> <output.jpeg> [--theme light|dark]
//
// Pipeline: mmdc renders the .mmd to PNG at scale 3 (with the logos and devicon
// icon packs and the plugin's theme config), then ImageMagick or sharp converts
// PNG to JPEG. If no converter is available the PNG is kept next to the
// requested output and a warning is printed.

import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { die, hasTool, log, run } from "./lib/tools.mjs";

const USAGE =
  "usage: node render-mermaid.mjs <input.mmd> <output.jpeg> [--theme light|dark]";

const BACKGROUNDS = { light: "#ffffff", dark: "#0f172a" };
const ICON_PACK_ARGS = [
  "--iconPacks", "@iconify-json/logos",
  "--iconPacks", "@iconify-json/devicon",
  "--iconPacks", "@iconify-json/lucide",
];

function parseArgs(argv) {
  const positional = [];
  let theme = "light";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--theme") {
      theme = argv[++i];
      if (theme === undefined) die("--theme needs a value", USAGE);
    } else if (arg.startsWith("--theme=")) {
      theme = arg.slice("--theme=".length);
    } else if (arg === "--help" || arg === "-h") {
      log(USAGE);
      process.exit(0);
    } else if (arg.startsWith("-")) {
      die(`unknown option ${arg}`, USAGE);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) die("expected exactly two file arguments", USAGE);
  if (!(theme in BACKGROUNDS)) die(`theme must be light or dark, got '${theme}'`, USAGE);
  return { input: positional[0], output: positional[1], theme };
}

function pluginRoot() {
  const fromEnv = process.env.CLAUDE_PLUGIN_ROOT;
  if (fromEnv) return fromEnv;
  // Fall back to this script's location: <root>/scripts/render-mermaid.mjs
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function pngToJpeg(png, jpeg, background) {
  if (await hasTool("magick")) {
    const res = await run("magick", [png, "-quality", "92", jpeg]);
    if (res.code === 0) return "magick";
    log(`warning: magick failed (${res.stderr.trim() || "no output"})`);
  } else if (await hasTool("convert")) {
    const res = await run("convert", [png, "-quality", "92", jpeg]);
    if (res.code === 0) return "convert";
    log(`warning: convert failed (${res.stderr.trim() || "no output"})`);
  }
  // Optional peer: sharp. Not vendored — used only when already installed.
  try {
    const { default: sharp } = await import("sharp");
    await sharp(png).flatten({ background }).jpeg({ quality: 92 }).toFile(jpeg);
    return "sharp";
  } catch {
    return null;
  }
}

async function main() {
  const { input, output, theme } = parseArgs(process.argv.slice(2));

  try {
    await access(input);
  } catch {
    die(`input file not found: ${input}`);
  }
  if (!input.endsWith(".mmd")) log(`warning: input '${input}' does not end in .mmd`);

  if (!(await hasTool("mmdc"))) {
    die("mmdc (mermaid-cli) not found on PATH", "npm i -g @mermaid-js/mermaid-cli");
  }

  const configPath = path.join(pluginRoot(), "assets", "mermaid", `config.${theme}.json`);
  try {
    await access(configPath);
  } catch {
    die(`mermaid config not found: ${configPath}`);
  }

  const background = BACKGROUNDS[theme];
  const tempDir = await mkdtemp(path.join(tmpdir(), "render-mermaid-"));
  try {
    // Chromium refuses to sandbox as root / in CI; mmdc takes this via -p.
    const puppeteerConfig = path.join(tempDir, "puppeteer.json");
    await writeFile(
      puppeteerConfig,
      JSON.stringify({ args: ["--no-sandbox", "--disable-setuid-sandbox"] }),
    );

    const tempPng = path.join(tempDir, "render.png");
    log(`rendering ${input} (theme ${theme}, scale 3)`);
    const render = await run("mmdc", [
      "-i", input,
      "-o", tempPng,
      "-s", "3",
      "-b", background,
      "-c", configPath,
      "-p", puppeteerConfig,
      ...ICON_PACK_ARGS,
    ]);
    if (render.code !== 0) {
      die(`mmdc failed:\n${(render.stderr || render.stdout).trim()}`);
    }

    const converter = await pngToJpeg(tempPng, output, background);
    if (converter) {
      log(`wrote ${output} (via ${converter})`);
    } else {
      const pngOutput = output.replace(/\.jpe?g$/i, "") + ".png";
      await copyFile(tempPng, pngOutput);
      log(`warning: no PNG-to-JPEG converter found; kept PNG at ${pngOutput}`);
      log("hint: install ImageMagick (magick) or `npm i sharp` to get JPEG output");
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => die(err?.message ?? String(err)));
