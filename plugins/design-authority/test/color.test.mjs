import { test } from "node:test";
import assert from "node:assert/strict";
import { oklch, contrast, hexToRgb, reportRatio, WCAG } from "../scripts/lib/color.mjs";
import { maxChroma, solveForContrast, solveForBand, solveAcrossSurfaces } from "../scripts/lib/solve.mjs";

// Ground truth: Vercel's published Geist tokens (vercel.com/geist/vercel-brand.css).
// If the OKLCH transform drifts, every colour this plugin emits is wrong, so this is the
// test that matters most.
const GEIST_DARK = [
  ["gray-1000", 0.946, "#ededed"],
  ["gray-900", 0.706, "#a0a0a0"],
  ["gray-800", 0.59, "#7d7d7d"],
  ["gray-700", 0.65, "#8f8f8f"],
  ["gray-600", 0.623, "#878787"],
  ["gray-500", 0.39, "#454545"],
  ["gray-400", 0.301, "#2e2e2e"],
  ["gray-300", 0.281, "#292929"],
  ["gray-100", 0.218, "#1a1a1a"],
];

test("OKLCH to sRGB matches Geist's published tokens exactly", () => {
  for (const [name, L, expected] of GEIST_DARK) {
    assert.equal(oklch(L, 0, 0).hex, expected, `${name} at L=${L}`);
  }
});

test("contrast formula reproduces known reference ratios", () => {
  assert.equal(reportRatio(contrast("#ffffff", "#000000")), 21);
  // The classic AA boundary pair.
  assert.ok(contrast("#767676", "#ffffff") >= 4.5);
  assert.ok(contrast("#777777", "#ffffff") < 4.5);
  // Geist's own dark text on its dashboard page.
  assert.equal(reportRatio(contrast("#ededed", "#0a0a0a")), 16.91);
});

test("contrast is symmetric in its arguments", () => {
  assert.equal(contrast("#123456", "#abcdef"), contrast("#abcdef", "#123456"));
});

test("reported ratios never round up into a pass", () => {
  // 4.499 must not be reported as 4.5.
  assert.equal(reportRatio(4.4999), 4.49);
});

test("hexToRgb rejects anything that is not a 6-digit hex", () => {
  assert.throws(() => hexToRgb("#fff"), /6-digit hex/);
  assert.throws(() => hexToRgb("rebeccapurple"), /6-digit hex/);
});

test("sRGB cannot deliver both maximum chroma and AA text contrast", () => {
  // The finding that forced chroma to yield to contrast: at hue 245 blue peaks at chroma
  // ~0.172, and only at a lightness far too light to clear 4.5:1 on white.
  const peak = Math.max(...Array.from({ length: 100 }, (_, i) => maxChroma(i / 100, 245)));
  assert.ok(peak < 0.18, `expected blue to peak below 0.18 chroma, got ${peak}`);

  const solved = solveForContrast("#ffffff", 245, WCAG.BODY_TEXT, 0.4);
  assert.ok(solved.C < peak, "the accessible value must be less saturated than the peak");
  assert.ok(solved.ratio >= WCAG.BODY_TEXT);
});

test("the light solver returns the most restrained value that still passes", () => {
  const solved = solveForContrast("#ffffff", 150, WCAG.BODY_TEXT, 0.15);
  assert.ok(solved.ratio >= WCAG.BODY_TEXT);
  // Restraint: it should sit near the threshold, not overshoot into near-black.
  assert.ok(solved.ratio < 6, `expected a value near the threshold, got ${solved.ratio}`);
});

test("the dark solver aims at a band instead of maximum saturation", () => {
  // Maximum-saturation-that-passes returns neon on a dark page; the band solver must not.
  const neon = solveForContrast("#0a0a09", 150, WCAG.BODY_TEXT, 0.4);
  const banded = solveForBand("#0a0a09", 150, 7.0, 0.171, WCAG.BODY_TEXT);
  assert.ok(neon.ratio > 12, "sanity: the naive solver really does overshoot on dark");
  assert.ok(Math.abs(banded.ratio - 7.0) < 0.5, `expected ~7:1, got ${banded.ratio}`);
  assert.ok(banded.ratio >= WCAG.BODY_TEXT, "the band must never dip below the AA floor");
});

test("solving against the page alone is not enough — tinted surfaces must be included", () => {
  // The regression this guards: status text solved against white passed at 4.5:1 on the
  // page, then failed at ~4.0:1 on its own badge tint.
  const page = "#ffffff";
  const tint = "#eaf5ee";
  const pageOnly = solveForContrast(page, 150, WCAG.BODY_TEXT, 0.15);
  assert.ok(contrast(pageOnly.hex, tint) < WCAG.BODY_TEXT, "sanity: the page-only value does fail on tint");

  const across = solveAcrossSurfaces([page, tint], 150, WCAG.BODY_TEXT, 0.15);
  assert.ok(contrast(across.hex, page) >= WCAG.BODY_TEXT);
  assert.ok(contrast(across.hex, tint) >= WCAG.BODY_TEXT);
});

test("a chroma that cannot be expressed at a lightness is not reported as available", () => {
  // Regression: near black, every channel collapses to the same value, so the gamut test alone
  // passed a nominally saturated colour that renders as ink. maxChroma(0.02, 200) claimed 0.098
  // while oklch(0.02, 0.098, 200) rendered #000002 — black wearing a hue's name.
  const C = maxChroma(0.02, 200);
  const { hex } = oklch(0.02, C, 200);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  assert.ok(C < 0.05, `expected a near-neutral chroma at lightness 0.02, got ${C}`);
  assert.ok(spread < 8, "sanity: this lightness genuinely cannot express chroma");
});

test("a solved accent is a colour, never ink in disguise", () => {
  // Every hue that can carry text must produce a text grade with visible chroma.
  for (const hue of [0, 100, 180, 200, 240, 300]) {
    const solved = solveForContrast("#ffffff", hue, WCAG.BODY_TEXT, 0.15);
    assert.ok(solved, `hue ${hue} produced no text grade`);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(solved.hex.slice(i, i + 2), 16));
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    assert.ok(spread >= 8, `hue ${hue} solved to ${solved.hex}, which is achromatic`);
  }
});

test("solvers report failure rather than returning something that does not pass", () => {
  // Nothing at any lightness clears 21:1 against mid-grey.
  assert.equal(solveForContrast("#808080", 245, 21, 0.4), null);
});
