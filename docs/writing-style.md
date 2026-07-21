# Writing style

Applies to everything a reader sees: READMEs, skill/agent/command text, commit messages, and — just as
importantly — the text a plugin *generates* (diagram titles, node labels, captions, narrative docs). The
goal is prose that reads like a competent engineer wrote it on a good day: plain, specific, and free of
the tells that mark machine-written text.

## Principles

- **Plain words over inflated ones.** Use `use`, not `utilize`; `so`, not `in order to`; `about`, not
  `in relation to`. If a simpler word carries the meaning, it wins. (Zinsser, *On Writing Well*; GOV.UK
  style guide.)
- **Active voice, concrete subjects.** "The gateway validates the token," not "the token is validated."
- **Cut what carries no information.** Delete "in today's fast-paced world", "it's worth noting that",
  "at the end of the day", "when it comes to". Say the thing.
- **Vary sentence length.** Real writing has rhythm — a long sentence, then a short one. Uniform,
  same-length sentences are a machine tell.
- **Be specific.** "Handles 2k requests/sec on one node" beats "highly scalable". Numbers, names, and
  nouns over adjectives.
- **Sentence case for labels, titles, headings, and UI.** Not Title Case On Every Word. Capitalize the
  first word and proper nouns; stop there.

## Avoid (the AI tells)

- **Buzzword filler:** `leverage`, `utilize`, `seamless`, `robust`, `delve`, `foster`, `unlock`,
  `elevate`, `streamline`, `harness`, `realm`, `landscape`, `tapestry`, `game-changer`,
  `cutting-edge`, `best-in-class`, `world-class`. Prefer the plain verb or drop the word.
- **The "not just X, but Y" construction** and its cousin "it's not about X, it's about Y". Overused to
  the point of parody. State the point directly.
- **Rule-of-three padding:** "fast, reliable, and scalable" strung onto everything. Keep a list only
  when each item earns its place.
- **Empty transitions:** "Moreover", "Furthermore", "In conclusion", "It's important to note that",
  "As we can see". Start with the content.
- **Reflexive hedging:** "it depends", "there are many factors", "generally speaking" used to avoid
  committing. Take a position; note the real caveat if one exists.
- **Em-dash overuse.** One well-placed dash is fine; three per paragraph is a tell. Prefer a period.
- **Title Case Everywhere** and emoji sprinkled as decoration.

## For diagram output specifically

- **Node/service labels:** name the real thing — `Payments API`, `Postgres (orders)`, `Redis cache` —
  not generic placeholders like `Service A` or `Component 1`. Sentence case, no trailing punctuation.
- **Edge labels:** a verb or a protocol/noun — `writes to`, `gRPC`, `publishes order.created`. Keep them
  to a few words so routing stays clean and aligned.
- **Titles:** describe the system and the view — "Checkout flow — container view", not "Architecture
  Diagram" or "System Overview Diagram (AI-Generated)".
- **Narrative/captions:** two or three plain sentences that a reviewer would actually write. No
  "This diagram illustrates the seamless integration of…".

## Quick self-check

Before shipping any text, reread it and ask: would I write this to a colleague? Is every sentence
carrying weight? Did I use a real noun where an adjective was tempting? If a line could open a
generic blog post, rewrite it.
