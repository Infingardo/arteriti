# Arteriti (GCA temporal artery biopsy): instructions for Claude and Codex

Checklist for temporal artery biopsy, aligned to the SCVP 2023 consensus (Nair et al., Cardiovasc Pathol 2023;67:107574). It is a qualitative classification (A-E) driven only by histological findings: no score, no composite number, and clinical data are context that never change the category or the diagnosis line. Classifying a case as giant cell arteritis stays a clinical decision. Never present the tool otherwise. Each finding has three states (not evaluated / absent / present): an empty field is not "absent". `index.html` is the calculator (logic in `engine.js`, no libraries, tests in `tests/run.mjs`, run with `npm test`). The other HTML/PDF files are separate material; do not couple them to the calculator.

## Rules
- Diagnostic content (categories, criteria, adequacy criteria, wording) is curated by Filippo. Change it only on his instruction or from a cited source, never from memory. If code and source disagree, report it; do not choose.
- Before changing anything that can alter an output: plan first, state which outputs change, add or update tests with at least one input per affected class, and run `npm test` before closing.
- After such a change, get an independent review against the agreed spec: `/verify-agent` in Claude Code, or a separate review pass against the cited source.
- Keep `readme.md` and `CHANGELOG.md` aligned with any change in behavior or version.
- Keep logic in `engine.js` separate from the UI. No fake precision: show uncertainty and equivocal results.
- Offline-first: the calculator uses no external URLs and currently no libraries; if one is ever needed it goes in `vendor/`. A few ancillary pages already load IBM Plex from Google Fonts; do not add other external references. On the Mac a local pre-commit hook enforces this; elsewhere check by hand. Never bypass hooks with `--no-verify`.
- No patient data in code, tests, fixtures, docs or commit messages.
- `AGENTS.md` is a copy of this file for Codex: keep the two aligned when you edit either.

## Note for Codex
- `/verify-agent` exists only in Claude Code. For the independent review, do a separate review pass against the cited source and report the result and any open items.
