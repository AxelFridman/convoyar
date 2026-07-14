# CLAUDE.md

Read **[AGENTS.md](AGENTS.md)** — it is the canonical guide for agents (code map,
invariants, commands, known gotchas). Deep design in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); backlog and per-role plans in
[docs/ROADMAP.md](docs/ROADMAP.md); owner-only actions in [docs/HUMAN-TODOS.md](docs/HUMAN-TODOS.md).

Golden rules:
- `npm test` + `npm run typecheck` + `npm run test:e2e` + `npm run build` all green before calling anything done.
- `src/engine/` is pure: no React, no UI imports.
- Every new i18n key goes in **all 6 languages** (es/en/pt/de/it/fr).
- Hard constraints (capacity/detour/window/walk/needs) are never auto-violated.
- Docs are written in **English**; the app's user-facing content (i18n strings, legal pages) stays multilingual.
