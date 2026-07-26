// Solving for accessible colour, rather than picking one and hoping.
//
// The two modes need different solvers, and the reason is not symmetry-for-its-own-sake:
//
//   Light: contrast is the binding constraint. sRGB cannot deliver maximum chroma and AA
//   text contrast at once — at OKLCH hue 245, blue tops out at chroma 0.172 and only at
//   lightness 0.69, far too light to clear 4.5:1 on white. Chroma yields to contrast, and
//   we take the most saturated value that still clears the threshold.
//
//   Dark: on a near-black page almost anything clears 4.5:1, so "most saturated that
//   passes" returns neon. The binding constraint is glare, not contrast. We aim at a
//   target ratio band instead, under a chroma ceiling carried over from light — which is
//   the same move Geist makes when it drops blue chroma 7% and red 11% for dark.

import { oklch, contrast } from "./color.mjs";

const STEP = 0.002;

// A chroma that cannot be expressed in 8-bit sRGB at a given lightness does not exist there.
// Near black or white the gamut test alone is not enough: every channel collapses to the same
// value, so a nominally saturated colour renders as ink. Asking for chroma 0.098 at lightness
// 0.02 returns #000002 — a channel spread of 2, which is black wearing a hue's name.
const MEANINGFUL_CHROMA = 0.03;
const MIN_CHANNEL_SPREAD = 8; // out of 255

function expressesChroma(hex, C) {
  if (C < MEANINGFUL_CHROMA) return true; // genuinely near-neutral; nothing to express
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) >= MIN_CHANNEL_SPREAD;
}

/** Highest in-gamut chroma at a given lightness and hue that the display can actually show. */
export function maxChroma(L, H, ceiling = 0.4) {
  let best = 0;
  for (let c = 0; c <= ceiling + 1e-9; c += 0.001) {
    const { hex, inGamut } = oklch(L, c, H);
    if (!inGamut) break;
    if (expressesChroma(hex, c)) best = c;
  }
  return Math.round(best * 1000) / 1000;
}

/**
 * Light mode: the most saturated colour of this hue that still clears `target` against
 * `bg`, under `chromaCeiling`. Ties break toward the background — overshooting contrast
 * is its own design smell.
 */
export function solveForContrast(bg, hue, target, chromaCeiling = 0.4) {
  let best = null;
  for (let L = 0; L <= 1 + 1e-9; L += STEP) {
    const C = maxChroma(L, hue, chromaCeiling);
    if (!C) continue;
    const { hex } = oklch(L, C, hue);
    const ratio = contrast(hex, bg);
    if (ratio < target) continue;
    if (!best || C > best.C + 1e-9 || (Math.abs(C - best.C) < 1e-9 && L > best.L)) {
      best = { L: round(L), C, hex, ratio };
    }
  }
  return best;
}

/**
 * Dark mode: the colour of this hue landing nearest `targetRatio` against `bg`, under
 * `chromaCeiling`. Never returns something below `floor` — the aim is a band, not a
 * bullseye at the cost of legibility.
 */
export function solveForBand(bg, hue, targetRatio, chromaCeiling = 0.4, floor = 4.5) {
  let best = null;
  for (let L = 0; L <= 1 + 1e-9; L += STEP) {
    const C = maxChroma(L, hue, chromaCeiling);
    if (!C) continue;
    const { hex } = oklch(L, C, hue);
    const ratio = contrast(hex, bg);
    if (ratio < floor) continue;
    const err = Math.abs(ratio - targetRatio);
    if (!best || err < best.err) best = { L: round(L), C, hex, ratio, err };
  }
  return best ? { L: best.L, C: best.C, hex: best.hex, ratio: best.ratio } : null;
}

/**
 * Solve against every surface the colour will actually sit on, and return the value that
 * satisfies the worst of them.
 *
 * This exists because of a real failure: status colours solved against the page all
 * passed, then failed at 4.04:1, 4.00:1 and 3.96:1 once they were placed on tinted badge
 * backgrounds. Nothing was wrong with the palette — the pairing had simply never been
 * enumerated. A colour that passes on the page proves nothing about the same colour on a
 * raised card, a tinted badge, or a hover state.
 */
export function solveAcrossSurfaces(surfaces, hue, target, chromaCeiling = 0.4) {
  let best = null;
  for (let L = 0; L <= 1 + 1e-9; L += STEP) {
    const C = maxChroma(L, hue, chromaCeiling);
    if (!C) continue;
    const { hex } = oklch(L, C, hue);
    const ratios = surfaces.map((bg) => contrast(hex, bg));
    if (Math.min(...ratios) < target) continue;
    if (!best || C > best.C + 1e-9 || (Math.abs(C - best.C) < 1e-9 && L > best.L)) {
      best = { L: round(L), C, hex, ratios, worst: Math.min(...ratios) };
    }
  }
  return best;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
