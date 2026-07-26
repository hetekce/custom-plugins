// The framework layer. Implementation contract only.
//
// Nothing about colour, type, space, motion or composition belongs here. Those are the same
// whichever framework renders them, and the moment a design decision leaks into this file the
// system has two places to change it.
//
// What does belong here: the constraints that decide whether a design is implementable in a
// given stack without fighting it. A design tool that emits a CDN font link, a global stylesheet
// or a component that only works with a runtime theme switcher has produced something the
// engineer will have to redraw.

const ANGULAR = {
  id: "angular",
  label: "Angular",
  status: "supported",
  contract: [
    "Standalone components. No NgModules.",
    "Signals for component state. No `zone.js`-dependent patterns — the app runs zoneless, so anything relying on automatic change detection after an async callback will not update.",
    "`ChangeDetectionStrategy.OnPush` on every component.",
    "Native control flow — `@if`, `@for`, `@switch`. Not `*ngIf`, `*ngFor`, `*ngSwitch`.",
    "`@for` always carries a `track` expression.",
    "Separate files: `.ts`, `.html`, `.css`. No inline `template:` or `styles:`.",
  ],
  styling: [
    "TailwindCSS utility classes in the template. Design tokens are exposed as CSS custom properties on `:root` and referenced from the Tailwind theme, so a token change is one edit rather than a find-and-replace across templates.",
    "Light and dark are two sets of custom-property values on the same names — never two sets of utility classes. The mode switch reassigns variables; no component knows which mode it is in.",
    "Component-scoped `.css` only for what utilities genuinely cannot express: container queries, `:focus-visible` rings that need an offset against a specific surface, and reduced-motion blocks.",
  ],
  assets: [
    "Fonts are self-hosted and served from the application's own origin. No Google Fonts link, no CDN, no `@import` from a remote host.",
    "Fonts are declared with `@font-face` and `font-display: swap`, subset to the character set the product actually ships, and preloaded for the weight used above the fold.",
    "Icons are inline SVG components, not an icon font and not a sprite fetched at runtime.",
  ],
  accessibilityMechanics: [
    "Focus is visible via `:focus-visible`, never suppressed with `outline: none` without a replacement.",
    "Reduced motion is handled in CSS with `@media (prefers-reduced-motion: reduce)`, so it applies whether or not the component has hydrated.",
    "A component's accessible name comes from its content or an `aria-label` bound in the template — never from a title attribute alone.",
  ],
  refuse: [
    "a CDN font link or remote stylesheet",
    "inline templates or inline styles in the component decorator",
    "`*ngIf` / `*ngFor` / `*ngSwitch`",
    "`::ng-deep` or global style overrides reaching into another component",
    "a design that requires a runtime JavaScript theme switcher to be legible — both modes must work from CSS alone",
    "any layout that depends on measuring the viewport in JavaScript",
  ],
};

const REACT = {
  id: "react",
  label: "React",
  status: "planned",
  note:
    "The React contract is deliberately not written yet. The design knowledge is framework-agnostic " +
    "and already complete; only this layer is missing. Writing it before the Angular layer has been " +
    "used on a real screen would mean guessing at what actually causes friction.",
};

const FRAMEWORKS = { angular: ANGULAR, react: REACT };

export function knownFrameworks() {
  return Object.keys(FRAMEWORKS);
}

export function frameworkContract(id) {
  if (!id) return null;
  const f = FRAMEWORKS[String(id).toLowerCase()];
  if (!f) {
    return {
      id,
      status: "unknown",
      note:
        `No implementation contract exists for "${id}". The design below is framework-agnostic and ` +
        `stands on its own; nothing about how it is built has been stated. Add a contract, or say ` +
        `explicitly that the implementation stack is unconstrained.`,
    };
  }
  if (f.status !== "supported") return f;
  return f;
}
