# Contributing

Thanks for considering a contribution. This repo aims for a few sharp, well-documented plugins rather
than a large shallow catalog, so the bar for what gets added is deliberately high — but the process is
simple.

## Ground rules

- All shipped content is in **English**: code, docs, labels, commit messages.
- Plugins are **MIT-licensed** and self-contained — no paid services, accounts, or telemetry.
- Read [`docs/plugin-authoring.md`](docs/plugin-authoring.md) for the structure and
  [`docs/writing-style.md`](docs/writing-style.md) for the prose bar. The prose bar applies to text your
  plugin *generates*, too.

## Reporting bugs / requesting features

Open an issue using the templates in `.github/ISSUE_TEMPLATE/`. For bugs, include your OS, the plugin
and version, the exact command, and what you expected vs. what happened.

## Adding or changing a plugin

1. Fork and branch off `main`.
2. Follow the layout and manifest rules in `docs/plugin-authoring.md`. Every plugin needs its own
   `README.md` and `LICENSE`.
3. Register new plugins in `.claude-plugin/marketplace.json`.
4. Before you commit, run the full gate locally:
   ```bash
   make check
   ```
5. Bump the plugin's `version` (semver) if behavior changed.
6. Open a PR using the template. Keep the change focused; explain what and why.

## Development

The `Makefile` at the repo root wraps the day-to-day commands (`make help` lists them):

- `make check` — validation plus tests; the same gate CI runs. Run it before every commit.
- `make validate` — structural checks on `marketplace.json` and every plugin manifest (needs `jq`).
- `make test` — runs every `plugins/*/test/*.test.mjs` with Node's built-in test runner
  (Node 20+, no extra dependencies). New plugins are picked up automatically.
- `make build-icons` — regenerates the bundled icon set for `architecture-diagrams`
  (maintainers only; needs network access).

## Review

Every PR runs the validation workflow. Green CI plus a clean, focused diff is what gets a change
merged. Maintainers may ask for edits to keep the collection consistent — that's normal, not a
rejection.
