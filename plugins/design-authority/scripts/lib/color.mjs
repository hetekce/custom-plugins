// Colour maths for the design direction: OKLCH <-> sRGB, and WCAG 2.2 contrast.
//
// Everything here is measurement, not taste. The OKLCH transform is verified against
// Vercel's published Geist tokens (vercel-brand.css) at zero channel deviation — see
// test/color.test.mjs. Contrast follows the formula in W3C Understanding SC 1.4.3.
//
// Why OKLCH and not HSL: equal HSL lightness is not equal perceived lightness. It is an
// RGB artifact, and every reference system studied (Stripe -> CIELAB, Linear -> LCH,
// Vercel Geist -> OKLCH) rejected HSL for exactly this reason.

/** Convert OKLCH to unclamped linear-to-sRGB channel values in the 0..1 range. */
export function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
}

/** True when every channel lands inside sRGB without clipping. */
export function inGamut(rgb) {
  return rgb.every((c) => c >= -0.001 && c <= 1.001);
}

export function rgbToHex(rgb) {
  const bytes = rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255));
  return "#" + bytes.map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a 6-digit hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

/** OKLCH -> { hex, inGamut }. Out-of-gamut colours are still returned, clipped, but flagged. */
export function oklch(L, C, H) {
  const rgb = oklchToRgb(L, C, H);
  return { hex: rgbToHex(rgb), inGamut: inGamut(rgb) };
}

function linearize(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.2 relative luminance. */
export function luminance(rgb) {
  const [r, g, b] = rgb.map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio, 1.00 to 21.00. Order of arguments does not matter. */
export function contrast(hexA, hexB) {
  const a = luminance(hexToRgb(hexA));
  const b = luminance(hexToRgb(hexB));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Round a ratio the way it is reported: two decimals, never rounded up into a pass. */
export function reportRatio(ratio) {
  return Math.floor(ratio * 100) / 100;
}

export const WCAG = {
  /** SC 1.4.3 — normal-size text. */
  BODY_TEXT: 4.5,
  /** SC 1.4.3 — large text: >=24px regular, or >=18.66px bold. */
  LARGE_TEXT: 3.0,
  /** SC 1.4.11 — UI component boundaries, focus rings, meaningful icons. */
  NON_TEXT: 3.0,
};
