// Builds the whole token system from a small set of brand decisions, then measures it.
//
// The ramp is role-mapped, following Geist: each step has a job rather than a position on
// a generic palette. It is hand-tuned per mode and deliberately NOT mirrored — in the
// published Geist tokens the mid-greys are shared pivots while the border and text steps
// move independently, which is the structural proof that a designed dark mode is not an
// inverted light one.
//
// Note on a shortcut that does NOT work here: Stripe guarantees contrast by scale distance
// (five steps apart clears 4.5:1). That holds on an evenly-spaced scale. On a role-mapped
// ramp the surface steps are bunched within a few percent of each other and the range is
// spent on the text end — measured on this ladder, the worst pair five steps apart came to
// 1.36:1. There is no shortcut. Every pairing gets measured.

import { oklch, contrast, reportRatio, WCAG } from "./color.mjs";
import { solveForContrast, solveForBand, solveAcrossSurfaces } from "./solve.mjs";

/** Role names in ramp order. Index is meaningful only as an ordering, never as a contrast promise. */
export const RAMP_ROLES = [
  ["background-100", "page"],
  ["background-200", "canvas behind the page"],
  ["gray-100", "raised surface"],
  ["gray-200", "hover surface"],
  ["gray-300", "active surface"],
  ["gray-400", "border, resting"],
  ["gray-500", "border, hover"],
  ["gray-600", "border carrying state"],
  ["gray-700", "high-contrast fill"],
  ["gray-800", "text, disabled"],
  ["gray-900", "text, secondary"],
  ["gray-1000", "text, primary"],
];

// Lightness/chroma curves, tuned so that every required pairing clears its threshold.
// Chroma stays under 0.013 throughout: this is a neutral that was chosen, not a pure grey
// that was inherited, but it must never read as a colour.
const CURVE = {
  light: [
    [1.0, 0], [0.985, 0.002], [0.968, 0.003], [0.945, 0.004],
    [0.922, 0.004], [0.898, 0.005], [0.845, 0.006], [0.668, 0.01],
    [0.6, 0.011], [0.56, 0.012], [0.512, 0.012], [0.245, 0.01],
  ],
  dark: [
    [0.145, 0.002], [0.115, 0.002], [0.218, 0.004], [0.245, 0.004],
    [0.285, 0.005], [0.318, 0.005], [0.4, 0.006], [0.52, 0.008],
    [0.62, 0.009], [0.68, 0.009], [0.74, 0.01], [0.948, 0.004],
  ],
};

// Chroma scaling from light into dark, per role. Saturated accents vibrate on black, so
// blue, amber and red lose chroma; green reads dull on black and gains it. These
// multipliers mirror the deltas in Geist's published tokens (blue -7%, red -11%, green +14%).
const DARK_CHROMA_SCALE = { accent: 0.93, info: 0.93, success: 1.14, warning: 0.93, danger: 0.89 };

// Restraint ceilings. Money UI does not use pure alarm red — a saturated #ff0000 on an
// overdue invoice reads as a system failure rather than a due date.
const CHROMA_CEILING = { accent: 0.15, info: 0.15, success: 0.15, warning: 0.14, danger: 0.165 };

// Status hues. Fixed, because these are conventions a person already reads fluently.
export const STATUS_HUES = { success: 150, warning: 70, danger: 27 };

/** Dark-mode accent aims at this ratio band rather than at maximum saturation. */
const DARK_TARGET_RATIO = 7.0;

function buildRamp(mode, neutralHue) {
  const out = {};
  CURVE[mode].forEach(([L, C], i) => {
    const [token, role] = RAMP_ROLES[i];
    const { hex, inGamut } = oklch(L, C, neutralHue);
    out[token] = { hex, role, oklch: { L, C, H: neutralHue }, inGamut };
  });
  return out;
}

/** Tint background for a status badge: the hue at very high lightness, barely coloured. */
function tintFor(mode, hue) {
  return mode === "light" ? oklch(0.965, 0.022, hue).hex : oklch(0.23, 0.035, hue).hex;
}

function buildSemantic(mode, ramp, accentHue) {
  const page = ramp["background-100"].hex;
  const raised = ramp["gray-100"].hex;
  const hover = ramp["gray-200"].hex;

  const roles = { accent: accentHue, info: accentHue, ...STATUS_HUES };
  const out = {};

  for (const [role, hue] of Object.entries(roles)) {
    const tint = tintFor(mode, hue);
    // Every surface this role's text can land on. Solving against the worst is the whole
    // point — see solveAcrossSurfaces for the failure that made this necessary.
    const textSurfaces = [page, raised, hover, tint];

    let text, boundary;
    if (mode === "light") {
      const ceiling = CHROMA_CEILING[role];
      text = solveAcrossSurfaces(textSurfaces, hue, WCAG.BODY_TEXT, ceiling);
      boundary = solveAcrossSurfaces([page, raised], hue, WCAG.NON_TEXT, ceiling);
    } else {
      const ceiling = round3(CHROMA_CEILING[role] * DARK_CHROMA_SCALE[role]);
      text = solveForBand(page, hue, DARK_TARGET_RATIO, ceiling, WCAG.BODY_TEXT);
      // Re-check the banded value against every surface; fall back to a solved value if
      // any surface fails. Dark tints are dark, so this normally holds.
      if (text && Math.min(...textSurfaces.map((s) => contrast(text.hex, s))) < WCAG.BODY_TEXT) {
        text = solveAcrossSurfaces(textSurfaces, hue, WCAG.BODY_TEXT, ceiling);
      }
      boundary = solveForBand(page, hue, 4.5, ceiling, WCAG.NON_TEXT);
    }

    if (!text || !boundary) {
      throw new Error(
        `cannot solve an accessible "${role}" at hue ${hue} in ${mode} mode. ` +
          `sRGB has no colour at this hue that clears the threshold on every surface it must sit on. ` +
          `Pick a different hue, or accept this role as boundary-only (no text grade).`
      );
    }

    out[role] = {
      hue,
      text: text.hex,
      boundary: boundary.hex,
      tint,
      chroma: text.C,
    };
  }
  return out;
}

/** Every pairing that must hold, measured. This list is what the gate reads. */
function measure(mode, ramp, semantic) {
  const page = ramp["background-100"].hex;
  const raised = ramp["gray-100"].hex;
  const rows = [];

  const add = (what, fg, bg, required, rule) =>
    rows.push({
      mode,
      pair: what,
      fg,
      bg,
      ratio: reportRatio(contrast(fg, bg)),
      required,
      rule,
      pass: contrast(fg, bg) >= required,
    });

  add("text primary on page", ramp["gray-1000"].hex, page, WCAG.BODY_TEXT, "SC 1.4.3");
  add("text primary on raised", ramp["gray-1000"].hex, raised, WCAG.BODY_TEXT, "SC 1.4.3");
  add("text secondary on page", ramp["gray-900"].hex, page, WCAG.BODY_TEXT, "SC 1.4.3");
  add("text secondary on raised", ramp["gray-900"].hex, raised, WCAG.BODY_TEXT, "SC 1.4.3");
  // Disabled text is exempt from SC 1.4.3, but an unreadable disabled state is still a
  // usability defect, so it is held to the non-text bar rather than to nothing.
  add("text disabled on page", ramp["gray-800"].hex, page, WCAG.NON_TEXT, "usability floor (1.4.3 exempts disabled)");
  add("border carrying state on page", ramp["gray-600"].hex, page, WCAG.NON_TEXT, "SC 1.4.11");

  for (const [role, v] of Object.entries(semantic)) {
    add(`${role} text on page`, v.text, page, WCAG.BODY_TEXT, "SC 1.4.3");
    add(`${role} text on raised`, v.text, raised, WCAG.BODY_TEXT, "SC 1.4.3");
    add(`${role} text on its own tint`, v.text, v.tint, WCAG.BODY_TEXT, "SC 1.4.3");
    add(`${role} boundary on page`, v.boundary, page, WCAG.NON_TEXT, "SC 1.4.11");
  }
  return rows;
}

/**
 * Build both modes and measure everything.
 * Returns { modes: { light, dark }, measured, failures }.
 */
export function buildTokens({ accentHue, neutralHue = 85 }) {
  const modes = {};
  let measured = [];

  for (const mode of ["light", "dark"]) {
    const ramp = buildRamp(mode, neutralHue);
    const semantic = buildSemantic(mode, ramp, accentHue);
    modes[mode] = { ramp, semantic };
    measured = measured.concat(measure(mode, ramp, semantic));
  }

  return { modes, measured, failures: measured.filter((r) => !r.pass) };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}
