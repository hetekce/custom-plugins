// Export the direction as artifacts other tools can ingest.
//
// Two outputs, both of them formats Claude Design's documented setup accepts (a codebase, and a
// document). Nothing here bets on an unverified format.
//
//   tokens.css        CSS custom properties, both modes. This is also the exact artifact the
//                     Angular implementation contract requires, so the export does double duty:
//                     it seeds the design tool AND it is the file the engineer builds against.
//   design-system.md  the same decisions as prose, plus the rules a token file cannot carry —
//                     the accent budget, what must never move, what each component may never do.
//
// The direction file stays the single source of truth. These are generated from it, so when a
// decision changes, both regenerate rather than drifting.

const SEMANTIC_FROM_RAMP = [
  ["surface-page", "background-100"],
  ["surface-canvas", "background-200"],
  ["surface-raised", "gray-100"],
  ["surface-hover", "gray-200"],
  ["surface-active", "gray-300"],
  ["border-subtle", "gray-400"],
  ["border-hover", "gray-500"],
  ["border-strong", "gray-600"],
  ["fill-contrast", "gray-700"],
  ["text-disabled", "gray-800"],
  ["text-secondary", "gray-900"],
  ["text-primary", "gray-1000"],
];

function modeBlock(mode, direction, indent = "  ") {
  const m = direction.color.modes[mode];
  const out = [];

  out.push(`${indent}/* primitives — never applied directly to a component */`);
  for (const [token, v] of Object.entries(m.ramp)) {
    out.push(`${indent}--color-${token}: ${v.hex};`);
  }

  out.push("");
  out.push(`${indent}/* semantic — this is what components consume */`);
  for (const [name, ramp] of SEMANTIC_FROM_RAMP) {
    out.push(`${indent}--${name}: var(--color-${ramp});`);
  }
  // Text sitting on the high-contrast fill flips to the page colour.
  out.push(`${indent}--text-on-fill: var(--color-background-100);`);

  out.push("");
  for (const [role, v] of Object.entries(m.semantic)) {
    out.push(`${indent}--${role}-text: ${v.text};`);
    out.push(`${indent}--${role}-boundary: ${v.boundary};`);
    out.push(`${indent}--${role}-tint: ${v.tint};`);
  }

  out.push("");
  const elev = Object.fromEntries(direction.shape.elevation.map((e) => [e.name, e[mode]]));
  for (const [name, value] of Object.entries(elev)) {
    out.push(`${indent}--elevation-${name}: ${value};`);
  }
  return out.join("\n");
}

function staticBlock(direction) {
  const t = direction.type;
  const out = [];

  out.push("  /* type */");
  out.push(`  --font-ui: ${t.families.ui.fallback};`);
  out.push(`  --font-mono: ${t.families.mono.fallback};`);
  for (const regime of Object.values(t.regimes)) {
    for (const s of regime.steps) {
      out.push(`  --text-${s.name}: ${s.px}px;`);
      out.push(`  --leading-${s.name}: ${s.lineHeight};`);
    }
  }
  const [regular, medium, semibold] = t.weights.available;
  out.push(`  --weight-regular: ${regular};`);
  out.push(`  --weight-medium: ${medium};`);
  out.push(`  --weight-semibold: ${semibold};`);
  out.push(`  --tracking-display: ${t.tracking.display};`);
  out.push(`  --tracking-body: ${t.tracking.body};`);
  out.push(`  --measure-reading: ${t.measure.reading};`);

  out.push("");
  out.push("  /* space */");
  direction.space.scale.forEach((px, i) => out.push(`  --space-${i + 1}: ${px}px;`));
  for (const [name, px] of Object.entries(direction.space.rhythm)) {
    out.push(`  --rhythm-${name}: ${px}px;`);
  }

  out.push("");
  out.push("  /* shape */");
  for (const [name, px] of Object.entries(direction.shape.radii)) {
    out.push(`  --radius-${name}: ${px}px;`);
  }

  out.push("");
  out.push("  /* density */");
  for (const [name, v] of Object.entries(direction.density.modes)) {
    out.push(`  --control-height-${name}: ${v.controlHeight}px;`);
  }
  out.push(`  --touch-target-min: ${direction.density.minimumTouchTarget}px;`);

  out.push("");
  out.push("  /* motion */");
  for (const [name, ms] of Object.entries(direction.motion.durations)) {
    out.push(`  --duration-${name}: ${ms}ms;`);
  }
  for (const [name, curve] of Object.entries(direction.motion.easings)) {
    out.push(`  --ease-${name}: ${curve};`);
  }
  return out.join("\n");
}

/** CSS custom properties for both modes, plus the reduced-motion contract. */
export function renderTokensCss(direction) {
  const primary = direction.color.primaryMode;
  const secondary = primary === "light" ? "dark" : "light";

  return `/* Generated from design/direction.json — do not edit by hand.
 *
 * Regenerate with:  direction.mjs export
 *
 * Primitives carry no intent and are never applied to a component directly; components consume
 * the semantic names, which is what makes ${secondary} mode a remap rather than a repaint.
 *
 * ${direction.color.measured.length} colour pairings were measured against WCAG 2.2 when this was
 * built, and all of them passed. Changing a value here without re-running the build silently
 * discards that guarantee.
 */

:root {
${staticBlock(direction)}

  /* ${primary} — the primary designed mode */
${modeBlock(primary, direction)}
}

@media (prefers-color-scheme: ${secondary}) {
  :root {
${modeBlock(secondary, direction, "    ")}
  }
}

:root[data-theme="${secondary}"] {
${modeBlock(secondary, direction)}
}

:root[data-theme="${primary}"] {
${modeBlock(primary, direction)}
}

/* Reduced motion is a designed state, not a fallback.
 * ${direction.motion.reducedMotion.behaviour} */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-property: opacity, color, background-color, border-color !important;
    transition-duration: ${Math.min(...Object.values(direction.motion.durations))}ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}

/** The decisions a token file cannot carry, as a document. */
export function renderDesignSystemDoc(direction) {
  const p = direction.product;
  const c = direction.color;
  const t = direction.type;
  const L = [];

  L.push(`# ${p.name} — design system`);
  L.push("");
  L.push(`${p.domain}. For: ${p.audience}`);
  L.push("");
  L.push(
    `Generated from \`design/direction.json\`. That file is the source of truth; this document and ` +
      `\`tokens.css\` are rendered from it. Edit the direction, not these.`
  );
  L.push("");

  L.push("## How to read the colour system");
  L.push("");
  L.push(c.why);
  L.push("");
  L.push(
    `The primary designed mode is **${c.primaryMode}**. The other mode is designed, not inverted — ` +
      `its ramp is tuned separately and its accents carry different chroma.`
  );
  L.push("");
  L.push("Each step has a job. It is not a generic palette:");
  L.push("");
  L.push("| token | role |");
  L.push("| --- | --- |");
  for (const [token, role] of Object.entries(c.rampRoles)) L.push(`| \`${token}\` | ${role} |`);
  L.push("");

  for (const mode of [c.primaryMode, c.primaryMode === "light" ? "dark" : "light"]) {
    const m = c.modes[mode];
    L.push(`### ${mode}`);
    L.push("");
    L.push("| token | value | role |");
    L.push("| --- | --- | --- |");
    for (const [token, v] of Object.entries(m.ramp)) L.push(`| \`${token}\` | \`${v.hex}\` | ${v.role} |`);
    L.push("");
    L.push("| role | text | border / icon | tint |");
    L.push("| --- | --- | --- | --- |");
    for (const [role, v] of Object.entries(m.semantic)) {
      L.push(`| ${role} | \`${v.text}\` | \`${v.boundary}\` | \`${v.tint}\` |`);
    }
    L.push("");
  }

  L.push("### Measured contrast");
  L.push("");
  L.push(
    `Every pairing below was measured with the WCAG 2.2 formula, not estimated. ` +
      `${c.measured.length} pairings, ${c.measured.filter((m) => !m.pass).length} failing.`
  );
  L.push("");
  L.push("| mode | pairing | ratio | needs | rule |");
  L.push("| --- | --- | --- | --- | --- |");
  for (const r of c.measured) {
    L.push(`| ${r.mode} | ${r.pair} | ${r.ratio}:1 | ${r.required} | ${r.rule} |`);
  }
  L.push("");

  L.push("### The accent budget");
  L.push("");
  L.push(`**${c.accentBudget.rule}**`);
  L.push("");
  L.push(`- Accent is for: ${c.accentBudget.accentIsFor.join(", ")}`);
  L.push(`- Accent is never for: ${c.accentBudget.accentIsNeverFor.join(", ")}`);
  L.push("");
  L.push(c.accentBudget.why);
  L.push("");
  L.push(`**${c.colorIsNeverTheOnlySignal}**`);
  L.push("");

  L.push("## Typography");
  L.push("");
  L.push(`- UI face: ${t.families.ui.requirement}`);
  L.push(`- Mono: ${t.families.mono.role}. Never for ${t.families.mono.never}.`);
  L.push(`- Weights ${t.weights.available.join(", ")}; ceiling **${t.weights.ceiling}**. ${t.weights.why}`);
  L.push(`- Tracking ${t.tracking.display} at display, ${t.tracking.body} at body. ${t.tracking.rule}`);
  L.push(`- Reading measure ${t.measure.reading}; headline max ${t.measure.headline}.`);
  L.push("");
  for (const [name, regime] of Object.entries(t.regimes)) {
    L.push(`**${name} regime** — ratio ${regime.ratio}, for ${regime.use}`);
    L.push("");
    L.push("| step | size | line-height |");
    L.push("| --- | --- | --- |");
    for (const s of regime.steps) L.push(`| ${s.name} | ${s.px}px | ${s.lineHeight} |`);
    L.push("");
  }

  L.push("## Space, shape, density");
  L.push("");
  L.push(`- Base ${direction.space.base}px. Scale ${direction.space.scale.join(", ")}. ${direction.space.rule}`);
  L.push(`- Radii: ${Object.entries(direction.shape.radii).map(([k, v]) => `${k} ${v}px`).join(", ")}.`);
  L.push(`- ${direction.shape.pillRule}`);
  L.push(`- ${direction.shape.bordersVsShadows}`);
  L.push(`- ${direction.density.rule}`);
  L.push("");

  L.push("## Motion");
  L.push("");
  L.push("| what | duration | easing | properties |");
  L.push("| --- | --- | --- | --- |");
  for (const r of direction.motion.animates) {
    L.push(`| ${r.what} | ${r.duration}ms | \`${r.easing}\` | ${r.properties.join(", ")} |`);
  }
  L.push("");
  L.push("**Never animates:**");
  L.push("");
  for (const n of direction.motion.neverAnimates) L.push(`- ${n}`);
  L.push("");
  L.push(`**Reduced motion.** ${direction.motion.reducedMotion.behaviour} ${direction.motion.reducedMotion.rule}`);
  L.push("");
  L.push(`**The deletion test.** ${direction.motion.deletionTest}`);
  L.push("");

  L.push("## Responsive");
  L.push("");
  L.push(`Reference widths ${direction.responsive.referenceWidths.join(", ")}. ${direction.responsive.approach}.`);
  L.push("");
  L.push(direction.responsive.containerQueries);
  L.push("");
  for (const r of direction.responsive.rules) L.push(`- ${r}`);
  L.push("");

  const loc = direction.locale;
  if (loc) {
    L.push("## Language and locale");
    L.push("");
    L.push(loc.label ? `Content language: ${loc.label} (${loc.code}).` : `Locale: ${loc.code}.`);
    if (loc.note) L.push(`\n${loc.note}`);
    L.push("");
    if (loc.universal?.neverTruncate) {
      L.push(`Never truncate: ${loc.universal.neverTruncate.join("; ")}.`);
      L.push("");
    }
    if (loc.formats) {
      L.push(`- Currency: ${loc.formats.currency}`);
      L.push(`- Date: ${loc.formats.date}`);
      L.push(`- Numbers: ${loc.formats.numbers}`);
      L.push("");
    } else if (loc.formatsUndeclared) {
      L.push(`> **Formats undeclared.** ${loc.formatsUndeclared}`);
      L.push("");
    }
    if (loc.testCorpus?.length) {
      L.push(`Layout must survive at 360px: ${loc.testCorpus.join(", ")}.`);
      L.push("");
    }
  }

  L.push("## Accessibility");
  L.push("");
  for (const [k, v] of Object.entries(direction.accessibility)) {
    L.push(`- **${k}** — ${v}`);
  }
  L.push("");

  if (direction.decisions?.length) {
    L.push("## Why these decisions");
    L.push("");
    L.push("A design system whose choices cannot be explained six months later is a stylesheet.");
    L.push("");
    for (const d of direction.decisions) {
      L.push(`### ${d.what}`);
      L.push("");
      L.push(`${d.why}`);
      L.push("");
      L.push(`*(\`${d.id}\`, recorded ${d.date})*`);
      L.push("");
    }
  }

  return L.join("\n");
}
