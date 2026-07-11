# CLAUDE.md

Leé **[AGENTS.md](AGENTS.md)** — es la guía canónica para agentes (mapa del código,
invariantes, comandos, trampas conocidas). Diseño en profundidad en
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); pendientes en [docs/ROADMAP.md](docs/ROADMAP.md).

Reglas de oro:
- `npm test` + `npm run typecheck` + `npm run test:e2e` + `npm run build` en verde antes de dar algo por terminado.
- `src/engine/` es puro: sin React, sin imports de UI.
- Toda clave i18n nueva va en `es` **y** `en`.
- Restricciones duras (capacidad/desvío/ventana/caminata/necesidades) nunca se violan en automático.
