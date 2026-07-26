#!/usr/bin/env node
// Render image-model prompts for brand assets, from the direction file.
//
//   identity.mjs mark    --identity <identity.json> [--direction design/direction.json]
//   identity.mjs imagery --identity <identity.json> [--direction design/direction.json]
//
// Colour and refusals come from the direction, so a brand asset cannot drift away from the
// interface it belongs to.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderMarkPrompt, renderImageryPrompt, HUMAN_REVIEW } from "./lib/identity.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    args[argv[i].slice(2)] = next === undefined || next.startsWith("--") ? true : argv[++i];
  }
  return args;
}

function die(message, code = 2) {
  process.stderr.write(message.endsWith("\n") ? message : message + "\n");
  process.exit(code);
}

function readJson(path) {
  if (!existsSync(path)) die(`not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    die(`cannot parse ${path}: ${e.message}`);
  }
}

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (!["mark", "imagery"].includes(command)) {
  die(
    `usage:\n` +
      `  identity.mjs mark    --identity <identity.json> [--direction design/direction.json]\n` +
      `  identity.mjs imagery --identity <identity.json> [--direction design/direction.json]\n`
  );
}
if (!args.identity) die("--identity <identity.json> is required.");

const directionPath = resolve(args.direction ?? "design/direction.json");
if (!existsSync(directionPath)) {
  die(
    `no direction file at ${directionPath}.\n\n` +
      `Brand assets are rendered from the same colours as the interface. Without the direction\n` +
      `they would be generated against a palette nobody agreed to.\n` +
      `Create it first: direction.mjs init --spec <spec.json>`
  );
}

const direction = readJson(directionPath);
const identity = readJson(resolve(args.identity));

if (!identity.feeling) {
  die(`identity.feeling is required — a mark drawn without knowing what the product should feel like is decoration.`);
}

let text;
if (command === "mark") {
  const m = identity.mark;
  if (!m) die(`identity.mark is missing.`);
  const kinds = ["wordmark", "lettermark", "abstract"];
  if (!kinds.includes(m.kind)) die(`identity.mark.kind must be one of: ${kinds.join(", ")}`);
  if (!m.idea) die(`identity.mark.idea is required — one sentence saying what the mark has to communicate.`);
  if ((m.kind === "wordmark" || m.kind === "lettermark") && !m.text) {
    die(`identity.mark.text is required for a ${m.kind} — the exact string to set.`);
  }
  text = renderMarkPrompt(direction, identity);
} else {
  const im = identity.imagery;
  if (!im) die(`identity.imagery is missing.`);
  for (const field of ["placement", "moment", "says"]) {
    if (!im[field]) die(`identity.imagery.${field} is required.`);
  }
  text = renderImageryPrompt(direction, identity);
}

if (args.out) {
  writeFileSync(resolve(args.out), text);
  process.stderr.write(`wrote ${args.out}\n`);
} else {
  process.stdout.write(text);
}

// Always on stderr, so it survives being piped to a file and cannot be lost silently.
process.stderr.write(
  `\nBefore this becomes the mark, a person has to:\n` +
    HUMAN_REVIEW.map((r, i) => `  ${i + 1}. ${r}`).join("\n") +
    `\n`
);
