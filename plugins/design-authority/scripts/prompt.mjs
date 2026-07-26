#!/usr/bin/env node
// Render the Claude Design prompt from the direction file and a screen spec.
//
//   prompt.mjs --screen <screen.json> [--direction design/direction.json] [--out <file>]
//
// Exits 2 and prints the gaps if anything is underspecified. It does not fill a gap with an
// adjective, and it does not render a partial prompt — a prompt that is 90% decided still
// lets the design tool invent the other 10%, which is the failure this plugin exists to stop.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { runGate, formatGaps } from "./lib/gate.mjs";
import { renderPrompt } from "./lib/render.mjs";

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

const args = parseArgs(process.argv.slice(2));
if (!args.screen) {
  die(`usage: prompt.mjs --screen <screen.json> [--direction design/direction.json] [--out <file>]`);
}

const directionPath = resolve(args.direction ?? "design/direction.json");
if (!existsSync(directionPath)) {
  die(
    `no direction file at ${directionPath}.\n\n` +
      `Screen five is consistent with screen one only because both read the same file.\n` +
      `Create it first: direction.mjs init --spec <spec.json>`
  );
}

const direction = readJson(directionPath);
const screen = readJson(resolve(args.screen));

// Required screen fields. These are the ones a design tool would otherwise invent.
const REQUIRED = {
  title: "what this screen is called",
  firstThing: "what the person must know first",
  feeling: "what the screen should make them feel in the first two seconds",
  reassurance: "what it is reassuring them about",
  anxiety: "what anxiety it removes",
  composition: "what leads, what supports, what is one click away, what was cut",
  states: "the empty, loading and error compositions",
  components: "the components used, with all their states",
};
const missing = Object.entries(REQUIRED).filter(([k]) => !screen[k]);
if (missing.length) {
  die(
    `Refusing to emit a prompt: the screen spec is missing ${missing.length} required field${missing.length === 1 ? "" : "s"}.\n\n` +
      missing.map(([k, why]) => `  ${k}\n    ${why}`).join("\n") +
      `\n\nEach of these is a decision. If you cannot decide one, say so and it will be asked about — it will not be filled in for you.`
  );
}
for (const key of ["leads", "supports", "oneClickAway", "cut"]) {
  if (!screen.composition[key]) {
    die(`Refusing to emit a prompt: composition.${key} is undefined.\n\nA screen whose hierarchy is unstated becomes noise.`);
  }
}

const gate = runGate(direction, screen);
if (!gate.ok) die(formatGaps(gate.items));

const text = renderPrompt(direction, screen);

if (args.out) {
  writeFileSync(resolve(args.out), text);
  process.stderr.write(`wrote ${args.out} (${text.split("\n").length} lines)\n`);
} else {
  process.stdout.write(text);
}
