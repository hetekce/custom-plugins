# Bundled tech-stack icons

Brand icons (SVG + transparent PNG at 128/256 px) for technologies commonly
shown in architecture diagrams: data engineering, databases, data science/ML,
infra/DevOps, CI/CD, cloud, languages, web frameworks, messaging, and BI.

Everything under `svg/` and `png/` is **generated** — do not edit by hand.
`catalog.json` is the source of truth (slug, display name, category, and
candidate refs per source); `manifest.json` maps each bundled slug to its
resolved source, license, and file paths; `GAPS.md` lists slugs that no source
could provide.

## Sources and licensing

Icons come exclusively from permissively licensed sets, probed in this order:

1. Iconify `logos` collection (gilbarbara/logos) — CC0-1.0
2. Devicon — MIT
3. Simple Icons — CC0-1.0

The proprietary AWS/Azure/GCP architecture icon sets are deliberately not
used; where no permissive service-specific mark exists, a cloud service maps
to its parent cloud logo (noted per entry in `catalog.json`/`manifest.json`).
Logos remain trademarks of their owners and are used nominatively only — see
[../../NOTICE](../../NOTICE).

## Regenerating

```sh
cd plugins/architecture-diagrams/scripts
npm install
npm run build:icons            # or: node build-icons.mjs --sizes 128,256 --only kafka,spark
```

The build is idempotent (already-bundled icons are skipped; use `--refetch`
to force re-probing all sources).
