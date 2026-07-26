// Locale rules, as packs.
//
// The design knowledge in this plugin is market-agnostic. What changes between markets is a
// thin layer: how text expands when translated, where a long string is allowed to break, and
// how money and dates are written. That layer is a pack. Nothing here is the default because
// nothing here is universal — a product shipping in one language still gets the universal
// rules, and picks up a pack only if one exists for its market.
//
// Adding a market means adding a PACKS entry. It does not mean touching anything else.

/** Rules that hold regardless of language. Every product gets these. */
const UNIVERSAL = {
  containment: {
    rule: "A long string never widens the page. Grid and flex children carry min-width: 0, and wide content scrolls inside its own overflow-x container.",
    why: "Without min-width: 0 a flex child defaults to min-content, so one unbroken string forces the whole layout wider.",
  },
  neverTruncate: [
    "form labels",
    "table headers — a truncated header destroys the meaning of the whole column",
    "identifiers a person may transcribe (account numbers, tax IDs, reference codes)",
  ],
  truncation: {
    rule: "Where vertical space is genuinely fixed, a value may truncate — and then the full string is recoverable on hover AND keyboard focus.",
    default: "Wrapping is the default. Truncation is the exception that must be argued for.",
  },
  expansion: {
    rule: "If the product is or will be translated, reserve room: 200-300% for UI strings under 10 characters, 180-200% for 11-20, 140-160% for 31-50.",
    why: "Short strings are the worst case — a one-word button label is where translation breaks layouts first.",
    source: "W3C, Text size in translation",
  },
  identifiers: {
    rule: "Identifiers wrap with overflow-wrap: anywhere and never hyphenate — a hyphen inserted into an account number reads as part of the number.",
  },
  lang: {
    rule: "The html element carries a lang attribute matching the content language.",
    why: "Hyphenation, quotation marks and screen-reader pronunciation all key off it. Without it, hyphens: auto silently does nothing.",
  },
  tracking: {
    display: "-0.03em",
    body: "0",
    rule: "Never letterspace lowercase body text. Never negative tracking on a string over 20 characters, at any size.",
    why: "Every reference system pulls negative tracking at display and none at body. The 20-character guard exists because long unbroken words are where tight tracking hurts most.",
  },
  bodyLineHeight: 1.45,
};

/**
 * Market packs. Each one states only what differs from UNIVERSAL.
 * `formats` is required in a pack — a market whose money and date conventions are unstated
 * is a market the design has not actually been adapted to.
 */
const PACKS = {
  de: {
    label: "German",
    note: "German compounds break layouts tuned on English. These rules are not optional in this market.",
    text: {
      css: "hyphens: auto; overflow-wrap: break-word; word-break: normal;",
      hyphenateLimitChars: "6 3 3",
      never: "word-break: break-all — it breaks at linguistically wrong points and disables hyphenation in some browsers",
      softHyphens: "For strings over ~15 characters, the translator inserts &shy; at morpheme boundaries. Compounds break between their components, not inside one.",
    },
    tracking: {
      display: "-0.02em",
      body: "0",
      rule: "Never negative on any string over 20 characters, at any size.",
      why: "Reference systems pull about -5% at display. DIN 1450 requires adequate character spacing and compounds already produce long unbroken letter runs, so the tracking is halved rather than dropped.",
    },
    bodyLineHeight: 1.5,
    typography: {
      rule: "The typeface must carry ß and capital ẞ (U+1E9E) and well-drawn umlauts. All-caps headings need vertical headroom so Ä Ö Ü are not clipped.",
      why: "DIN 1450 measures legibility by x-height and requires open, distinguishable letterforms.",
    },
    forms: {
      labels: "top-aligned — a left-aligned label column forces a width some German label will always break",
      required: "asterisk on the label",
      errors: "text below the field, with the field border in the error state",
    },
    formats: {
      currency: "1.234,56 € — symbol after the amount, separated by a non-breaking space so they never split at a line break",
      date: "TT.MM.JJJJ — two-digit day and month, four-digit year, a fixed 10 characters",
      numbers: "Dot-grouped for money; space-grouped in threes for counts. Four-digit numbers are not grouped.",
      source: "DIN 5008",
    },
    density: {
      why: "SAP Fiori is the German enterprise baseline: compact 32px, cozy 44px. B2B accounting products ship compact-first.",
    },
    testCorpus: [
      "Umsatzsteuer-Identifikationsnummer",
      "Benachrichtigungseinstellungen",
      "Gewährleistungsansprüche",
      "Rechnungsempfänger",
      "Leistungszeitraum",
    ],
  },

  en: {
    label: "English",
    text: {
      css: "overflow-wrap: break-word; word-break: normal;",
      never: "word-break: break-all",
    },
    formats: {
      currency: "State the convention explicitly — $1,234.56 (US) and £1,234.56 (UK) differ from €1.234,56.",
      date: "Unambiguous only. 12 Mar 2026, or ISO 2026-03-12. Never a bare numeric form that reads differently in another market.",
      numbers: "Comma-grouped in threes, period as the decimal separator.",
    },
    testCorpus: ["internationalization", "responsibilities", "acknowledgement"],
  },

  fr: {
    label: "French",
    note: "French runs roughly 15-20% longer than English and uses narrow no-break spaces before some punctuation.",
    text: { css: "hyphens: auto; overflow-wrap: break-word;" },
    formats: {
      currency: "1 234,56 € — narrow no-break space as the thousands separator, symbol after the amount",
      date: "JJ/MM/AAAA",
      numbers: "Narrow no-break space groups thousands; comma is the decimal separator.",
    },
    typography: {
      rule: "A narrow no-break space precedes : ; ! ? and sits inside « ». These must not fall to a line end.",
    },
    testCorpus: ["renseignements", "téléchargement", "immatriculation"],
  },

  tr: {
    label: "Turkish",
    note: "Turkish is agglutinative — suffix chains produce long single words, and the dotted/dotless i pair is a real casing hazard.",
    text: { css: "hyphens: auto; overflow-wrap: break-word;" },
    typography: {
      rule: "The typeface must carry ı İ ş Ş ğ Ğ ç Ç ö Ö ü Ü. Casing uses the tr locale so i maps to İ and I maps to ı.",
      why: "A locale-unaware toUpperCase turns 'iptal' into 'IPTAL' instead of 'İPTAL'.",
    },
    formats: {
      currency: "1.234,56 ₺ — dot groups thousands, comma is the decimal separator",
      date: "GG.AA.YYYY",
      numbers: "Dot-grouped thousands, comma decimal separator.",
    },
    testCorpus: ["Cumhurbaşkanlığı", "değerlendirmelerimiz", "sorumluluklarınız"],
  },
};

/** Two-letter market key from a locale code such as "de-DE", "de", "en-GB". */
function packKey(code) {
  return String(code || "").toLowerCase().split(/[-_]/)[0];
}

export function knownMarkets() {
  return Object.keys(PACKS);
}

/**
 * Merge the universal rules with the market pack, if one exists.
 * An unknown market is not an error — it gets the universal rules plus an explicit note that
 * its formats are undeclared, which the gate will surface rather than inventing conventions.
 */
export function localeRules(code) {
  const key = packKey(code);
  const pack = PACKS[key];

  if (!pack) {
    return {
      code,
      market: key || "unspecified",
      label: null,
      universal: UNIVERSAL,
      tracking: UNIVERSAL.tracking,
      bodyLineHeight: UNIVERSAL.bodyLineHeight,
      formats: null,
      formatsUndeclared:
        `No pack exists for "${code}". The universal rules apply, but this market's currency, date and number ` +
        `conventions have not been stated. Declare them in the spec, or add a pack — do not let the design tool guess.`,
      testCorpus: [],
    };
  }

  return {
    code,
    market: key,
    label: pack.label,
    note: pack.note ?? null,
    universal: UNIVERSAL,
    text: { ...(pack.text ?? {}) },
    typography: pack.typography ?? null,
    forms: pack.forms ?? null,
    tracking: pack.tracking ?? UNIVERSAL.tracking,
    bodyLineHeight: pack.bodyLineHeight ?? UNIVERSAL.bodyLineHeight,
    formats: pack.formats,
    density: pack.density ?? null,
    testCorpus: pack.testCorpus ?? [],
  };
}
