# AI tells — avoid / prefer

The full checklist behind step 5 of the diagram-copywriter skill. Grep every text field in the
diagram model (title, summary, group/node/edge labels) against the lists below and rewrite hits.

Sources: Strunk & White, *The Elements of Style* ("omit needless words"); William Zinsser, *On
Writing Well* (most first drafts can be cut ~50%); Paul Graham, "Write like you talk" (read it
aloud); the GOV.UK style guide (plain English, banned buzzwords); Google's Material Design writing
guidelines (sentence case for labels and titles); Nielsen Norman Group (short microcopy, label
every icon).

## Banned words

Rewrite any occurrence with the plain alternative, or delete the word.

| Avoid | Prefer |
|---|---|
| delve | look at, examine — or just say the thing |
| leverage | use |
| utilize | use |
| seamless | (delete, or say what actually connects) |
| robust | (delete, or give the concrete property: "retries on failure") |
| pivotal | key, main — or delete |
| comprehensive | full, complete — or delete |
| tapestry | (delete) |
| underscore | show, stress |
| realm | area — usually delete |
| elevate | raise, improve |
| streamline | simplify, shorten |
| foster | help, support |
| harness | use |
| unlock | (delete; say what the reader can now do) |
| navigate | (delete unless literal navigation) |
| landscape | (delete; name the actual set of things) |
| testament | proof, sign — usually delete |
| meticulous | careful — usually delete |
| showcase | show |
| empower | let, allow |
| embark | start |
| game-changer, cutting-edge, best-in-class, world-class | (delete; give a number or a name instead) |

## Banned phrases

Delete these outright; they carry no information.

- "in today's fast-paced world"
- "it is important to note" / "it's worth noting that"
- "plays a crucial role"
- "in conclusion"
- "unlock the power of"
- "at the end of the day"
- "when it comes to"
- "as we can see"

## Banned structures

- **"Not just X, but Y"** and its cousins ("not only… but also", "it's not about X, it's about Y").
  Overused to the point of parody. State the point directly.
- **Em-dash overuse.** One well-placed dash is fine; three per paragraph is a tell. Prefer a period.
- **Reflexive rule-of-three.** "Fast, reliable, and scalable" strung onto everything. Keep a list
  only when each item earns its place; one specific claim beats three vague ones.
- **Empty transitions.** "Moreover", "Furthermore", "Additionally", "In conclusion" as sentence
  openers. Start with the content.
- **Throat-clearing.** "Let's dive in", "This diagram illustrates…", "In this overview we will…".
  Cut the wind-up; the first sentence does work.

## Positive rules

- **Plain words.** `use`, not `utilize`; `so`, not `in order to`; `about`, not `in relation to`.
  (Zinsser; GOV.UK.)
- **Active voice, concrete subjects.** "The gateway validates the token", not "the token is
  validated". (Strunk & White.)
- **Concrete nouns and numbers.** "Handles 2k requests/sec on one node" beats "highly scalable".
  Names and numbers over adjectives.
- **Varied sentence length.** A long sentence, then a short one. Uniform sentence length is a
  machine tell. (Paul Graham: read it aloud.)
- **Sentence case** for titles, labels, and headings. Capitalize the first word and proper nouns;
  stop there. (Material.)
- **Parallel grammar across sibling labels.** Nodes in the same group share a shape: "Order
  service / Billing service / Shipping service", not "Order service / Handles billing / The
  shipper". (NN/g.)
- **Titles carry the message.** The title names the system and the view; the summary carries
  context. "Checkout flow — container view", never "Architecture Diagram".

## Before / after

**Node label**

- Before: `Service A (Robust Microservice)`
- After: `Payments API`

**Edge label**

- Before: `seamlessly leverages for data persistence`
- After: `writes to`

**Title**

- Before: `Comprehensive System Architecture Overview Diagram`
- After: `Ticketing platform — deployment view`

**Summary / caption**

- Before: "This diagram illustrates the seamless integration of robust microservices, leveraging
  cutting-edge messaging to foster a scalable and reliable event-driven landscape."
- After: "Orders flow from the storefront through the order API into Kafka. Three consumers —
  billing, shipping, and analytics — each read their own topic. Billing is the only synchronous
  dependency."

## Quick self-check

Reread the model's text once, aloud if possible. Would you write this to a colleague? Is every
word carrying weight? If a line could open a generic blog post, rewrite it.
