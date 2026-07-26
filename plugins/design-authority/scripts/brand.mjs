#!/usr/bin/env node
// Interrogate a hue before committing to it.
//
//   brand.mjs probe --hue 245 [--neutral 85]
//   brand.mjs scan  [--step 15] [--status-dense]
//
// The accent hue is the only genuinely arbitrary value in a direction. This makes the
// mechanical part of the choice mechanical: whether a hue can carry text at all, how much
// gamut headroom it has, and whether it will be mistaken for a status signal. What is left
// after that is taste, and taste is what the rationale sentence is for.

import { oklch, contrast, reportRatio, WCAG } from "./lib/color.mjs";
import { maxChroma, solveForContrast, solveForBand } from "./lib/solve.mjs";
import { STATUS_HUES } from "./lib/tokens.mjs";

const LIGHT_PAGE = "#ffffff";
const DARK_PAGE = "#0a0a09";
const COLLISION_DEGREES = 25;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    args[argv[i].slice(2)] = next === undefined || next.startsWith("--") ? true : argv[++i];
  }
  return args;
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Which status role, if any, this hue will be mistaken for. */
function collisions(hue) {
  return Object.entries(STATUS_HUES)
    .map(([role, h]) => ({ role, hue: h, distance: hueDistance(hue, h) }))
    .filter((c) => c.distance <= COLLISION_DEGREES)
    .sort((a, b) => a.distance - b.distance);
}

function analyse(hue) {
  const peak = Math.max(...Array.from({ length: 101 }, (_, i) => maxChroma(i / 100, hue)));

  // Can it carry text? Solved under a restraint ceiling, the way the real system does.
  const lightText = solveForContrast(LIGHT_PAGE, hue, WCAG.BODY_TEXT, 0.15);
  const lightBoundary = solveForContrast(LIGHT_PAGE, hue, WCAG.NON_TEXT, 0.15);
  const darkText = solveForBand(DARK_PAGE, hue, 7.0, 0.15, WCAG.BODY_TEXT);
  const darkBoundary = solveForBand(DARK_PAGE, hue, 4.5, 0.15, WCAG.NON_TEXT);

  return {
    hue,
    peakChroma: +peak.toFixed(3),
    lightText,
    lightBoundary,
    darkText,
    darkBoundary,
    carriesText: Boolean(lightText && darkText),
    carriesBoundary: Boolean(lightBoundary && darkBoundary),
    collisions: collisions(hue),
  };
}

function verdict(a, statusDense) {
  if (!a.carriesBoundary) return "unusable — cannot even hold a border or icon";
  if (!a.carriesText) return "boundary-only — cannot hold text; decide that deliberately";
  if (a.collisions.length) {
    const c = a.collisions[0];
    const severity = statusDense || c.distance <= 12 ? "avoid" : "caution";
    return `${severity} — ${c.distance}° from ${c.role} (${c.hue}°), will read as a status signal`;
  }
  if (a.peakChroma < 0.11) return "usable but muted — this hue cannot get vivid in sRGB";
  return "clear";
}

const args = parseArgs(process.argv.slice(2));
const command = process.argv[2];

if (command === "probe") {
  const hue = Number(args.hue);
  if (!Number.isFinite(hue)) {
    process.stderr.write("usage: brand.mjs probe --hue <0-360>\n");
    process.exit(2);
  }
  const a = analyse(hue);
  const out = [];
  out.push(`hue ${hue}  —  ${verdict(a, args["status-dense"] === true)}`);
  out.push("");
  out.push(`  peak chroma in sRGB      ${a.peakChroma}${a.peakChroma < 0.11 ? "  (muted; this hue has little room)" : ""}`);
  out.push("");
  out.push("  light page:");
  out.push(a.lightText
    ? `    text      ${a.lightText.hex}  L${a.lightText.L.toFixed(2)} C${a.lightText.C.toFixed(3)}  ${reportRatio(a.lightText.ratio)}:1`
    : `    text      IMPOSSIBLE — no lightness at this hue clears ${WCAG.BODY_TEXT}:1 on white`);
  out.push(a.lightBoundary
    ? `    boundary  ${a.lightBoundary.hex}  ${reportRatio(a.lightBoundary.ratio)}:1`
    : `    boundary  IMPOSSIBLE`);
  out.push("");
  out.push("  dark page:");
  out.push(a.darkText
    ? `    text      ${a.darkText.hex}  L${a.darkText.L.toFixed(2)} C${a.darkText.C.toFixed(3)}  ${reportRatio(a.darkText.ratio)}:1`
    : `    text      IMPOSSIBLE`);
  out.push(a.darkBoundary
    ? `    boundary  ${a.darkBoundary.hex}  ${reportRatio(a.darkBoundary.ratio)}:1`
    : `    boundary  IMPOSSIBLE`);
  out.push("");
  if (a.collisions.length) {
    out.push("  status collisions:");
    for (const c of a.collisions) out.push(`    ${c.distance}° from ${c.role} (hue ${c.hue})`);
  } else {
    out.push(`  status collisions: none within ${COLLISION_DEGREES}° of success, warning or danger`);
  }
  process.stdout.write(out.join("\n") + "\n");
  process.exit(a.carriesBoundary ? 0 : 1);
}

if (command === "scan") {
  const step = Number(args.step ?? 15);
  const statusDense = args["status-dense"] === true;
  const rows = [];
  for (let hue = 0; hue < 360; hue += step) rows.push(analyse(hue));

  process.stdout.write(
    `Every hue at ${step}° steps.${statusDense ? " Status-dense product: collisions treated as blocking." : ""}\n\n` +
      `hue   peak    light text   dark text    verdict\n`
  );
  for (const a of rows) {
    process.stdout.write(
      `${String(a.hue).padStart(3)}   ${a.peakChroma.toFixed(3)}   ` +
        `${(a.lightText?.hex ?? "  —    ").padEnd(11)}  ${(a.darkText?.hex ?? "  —    ").padEnd(11)}  ` +
        `${verdict(a, statusDense)}\n`
    );
  }
  const clear = rows.filter((a) => verdict(a, statusDense) === "clear").map((a) => a.hue);
  process.stdout.write(`\n${clear.length} hues clear on every mechanical constraint: ${clear.join(", ")}\n`);
  process.stdout.write(`Pick from these on the reasoning in references/brand-colour.md, and write down why.\n`);
  process.exit(0);
}

process.stderr.write(
  `usage:\n` +
    `  brand.mjs probe --hue <0-360>          interrogate one hue\n` +
    `  brand.mjs scan [--step 15] [--status-dense]   verdict for every hue\n`
);
process.exit(2);
