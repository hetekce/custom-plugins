#!/usr/bin/env node
// Create or extend design/direction.json — the product's design system as a file.
//
//   direction.mjs init  --spec <spec.json> [--out design/direction.json]
//   direction.mjs check [--file design/direction.json]
//   direction.mjs show  [--file design/direction.json]
//
// `init` refuses to overwrite an existing direction. Consistency is inherited from disk:
// later screens read this file and may only EXTEND it, never silently contradict it.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildDirection } from "./lib/direction.mjs";
import { runGate, formatGaps } from "./lib/gate.mjs";

const DEFAULT_OUT = "design/direction.json";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) continue;
    const next = rest[i + 1];
    args[rest[i].slice(2)] = next === undefined || next.startsWith("--") ? true : rest[++i];
  }
  return args;
}

function die(message, code = 2) {
  process.stderr.write(message.endsWith("\n") ? message : message + "\n");
  process.exit(code);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    die(`cannot read ${path}: ${e.message}`);
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.command === "init") {
  const out = resolve(args.out ?? DEFAULT_OUT);
  if (existsSync(out) && !args.force) {
    die(
      `${out} already exists.\n\n` +
        `A product has one direction, and later screens extend it rather than replacing it.\n` +
        `To add a rule the direction does not have, edit the file and record why in its "decisions" array.\n` +
        `Pass --force only if you intend to discard the existing system.`
    );
  }
  if (!args.spec) die("--spec <spec.json> is required. It carries the product and brand decisions.");

  const spec = readJson(resolve(args.spec));
  for (const field of ["product", "brand"]) {
    if (!spec[field]) die(`the spec is missing "${field}". Nothing can be decided without it.`);
  }
  if (typeof spec.brand.accentHue !== "number") {
    die(`brand.accentHue must be a number (OKLCH hue, 0-360). It is the one value the system cannot derive alone.`);
  }

  let direction;
  try {
    direction = buildDirection({ ...spec, createdAt: spec.createdAt ?? new Date().toISOString() });
  } catch (e) {
    die(`refusing to write a direction that does not hold:\n\n${e.message}`);
  }

  const gate = runGate(direction);
  if (!gate.ok) die(formatGaps(gate.items));

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(direction, null, 2) + "\n");

  const measured = direction.color.measured.length;
  process.stdout.write(
    `wrote ${out}\n` +
      `  ${measured} colour pairings measured, all passing\n` +
      `  primary mode: ${direction.color.primaryMode}\n` +
      `  accent hue:   ${direction.brand.accentHue} (${direction.brand.source})\n` +
      `\nRecord the reasoning next to it in ${dirname(out)}/direction.md.\n`
  );
  process.exit(0);
}

if (args.command === "check") {
  const file = resolve(args.file ?? DEFAULT_OUT);
  if (!existsSync(file)) die(`no direction at ${file}. Run "direction.mjs init --spec <spec.json>" first.`);
  const direction = readJson(file);
  const gate = runGate(direction);
  if (!gate.ok) die(formatGaps(gate.items));
  process.stdout.write(`${file} holds. ${direction.color.measured.length} pairings measured, all passing.\n`);
  process.exit(0);
}

if (args.command === "show") {
  const file = resolve(args.file ?? DEFAULT_OUT);
  if (!existsSync(file)) die(`no direction at ${file}.`);
  const d = readJson(file);
  const lines = [`${d.product.name} — ${d.product.domain}`, ""];
  for (const mode of ["light", "dark"]) {
    lines.push(`${mode}:`);
    for (const [t, v] of Object.entries(d.color.modes[mode].ramp)) lines.push(`  ${t.padEnd(15)} ${v.hex}  ${v.role}`);
    for (const [r, v] of Object.entries(d.color.modes[mode].semantic)) lines.push(`  ${r.padEnd(15)} ${v.text}  text / ${v.boundary} boundary`);
    lines.push("");
  }
  const failing = d.color.measured.filter((m) => !m.pass);
  lines.push(`${d.color.measured.length} pairings measured, ${failing.length} failing.`);
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}

die(
  `usage:\n` +
    `  direction.mjs init  --spec <spec.json> [--out design/direction.json]\n` +
    `  direction.mjs check [--file design/direction.json]\n` +
    `  direction.mjs show  [--file design/direction.json]\n`
);
