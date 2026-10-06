# Arteriti (GCA temporal artery biopsy): instructions for Claude and Codex

Morphological-clinical checklist for giant cell arteritis. It is a heuristic grid, not a validated score: weights and thresholds are not prospectively validated, the composite number is an orienting index and not a probability. Never present it otherwise. `index.html` is the calculator (logic in `engine.js`, libraries in `vendor/`, tests in `tests/run.mjs`, run with `npm test`). The other HTML/PDF files are separate material; do not couple them to the calculator.

## Rules
- Diagnostic content (categories, weights, thresholds such as the adequacy cutoff, wording) is curated by Filippo. Change it only on his instruction or from a cited source, never from memory. If code and source disagree, report it; do not choose.
- Before changing anything that can alter an output: plan first, state which outputs change, add or update tests with at least one input per affected class, and run `npm test` before closing.
- After such a change, get an independent review against the agreed spec: `/verify-agent` in Claude Code, or a separate review pass against the cited source.
- Keep `readme.md` and `CHANGELOG.md` aligned with any change in behavior or version.
- Keep logic in `engine.js` separate from the UI. No fake precision: show uncertainty and equivocal results.
- Offline-first: the calculator uses no external URLs, and libraries live in `vendor/`. A few ancillary pages already load IBM Plex from Google Fonts; do not add other external references. On the Mac a local pre-commit hook enforces this; elsewhere check by hand. Never bypass hooks with `--no-verify`.
- No patient data in code, tests, fixtures, docs or commit messages.
