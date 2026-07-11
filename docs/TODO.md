# TODO — estado vivo del proyecto Convoyar

> **Este archivo es la fuente de verdad del progreso.** Cualquier agente (humano o IA)
> que retome el proyecto empieza acá: qué está hecho, qué está a medias, qué sigue.
> Regla: si una feature no está terminada, TIENE que figurar acá antes de cerrar la sesión.
> Metodología: una branch `feat/*` por bloque → PR → merge a `main`. Rollback = revertir el PR.

## Convenciones de marca (decididas en PR1)

| Concepto | Nombre en producto |
|---|---|
| La app / el verbo | **Convoyar** ("convoyamos a la oficina") |
| El auto armado con su gente | **convoy** |
| Acción del organizador de correr el matching | **Armar convoys / Rearmar convoys** |
| Evento/salida | salida (event) — sin cambio |
| Pedir unirse a una salida pública | Pedir lugar |
| Id de app (stores) | `app.convoyar` |
| Clave localStorage | `convoyar:v2` |

## Plan de PRs (sesión 2026-07-11)

- [x] **PR1 `feat/brand-convoyar`** — rebrand completo: manifest, capacitor, index.html,
      package.json, storage key, sw.js, vocabulario i18n (convoy/armar convoys), seed
      (Comunidad Convoyar), docs, tests actualizados. Este archivo (TODO.md) nace acá.
- [ ] **PR2 `feat/i18n-multilang`** — 6 idiomas: es, en, pt, de, it, fr.
      Reestructurar `src/i18n.ts` → `src/i18n/` (index + un archivo por idioma,
      `TKey` sigue siendo `keyof typeof es`). Selector de idioma con banderas en Perfil
      (y luego en onboarding). Formatos de fecha por locale (hoy hay ternarios es/en
      hardcodeados en pantallas — reemplazar por `localeOf(lang)`).
- [ ] **PR3 `feat/visual-delight`** — capa de deleite tipo Duolingo:
      confetti al conseguir convoy, radio de caminata dibujado en el mapa al mover el
      slider, transiciones entre tabs, animaciones de tarjetas (stagger), press-effect
      en botones, empty states ilustrados, celebración al armar convoys (admin),
      contador animado en métricas. Regenerar screenshots del README acá.
- [ ] **PR4 `feat/onboarding`** — wizard primera vez: bienvenida → idioma → nombre →
      email (opcional) → tu casa en el mapa → ¿tenés auto? → notificaciones → ¡listo!
      (con confetti). Flag `settings.onboarded`; `resetDemo` lo vuelve a mostrar.
- [ ] **PR5 `feat/account-comms`** — email + verificación (código simulado localmente,
      interfaz `services/auth.ts` lista para backend real), chat por convoy
      (mensajes entre participantes de una salida, respuestas simuladas de la demo),
      preferencias de notificación por canal.
- [ ] **PR6 `feat/temporal-search`** — claridad temporal: filtros en Explorar
      (fecha desde/hasta, chips "hoy / este finde / próxima semana"), franja horaria
      preferida como filtro, visual timeline de tu ventana en Mi viaje.
- [ ] **PR7 `feat/server-skeleton`** — paquete `server/` separado (Node + Fastify +
      Postgres): schema SQL completo, API REST que replica el contrato del motor,
      docker-compose, `docs/DATABASE.md` (schema + cómo desplegar en la nube).
      El cliente sigue local-first; el adaptador remoto queda documentado como pendiente.
- [ ] **PR8 `docs/growth`** — `docs/GROWTH.md`: análisis "nivel Silicon Valley" de qué
      falta (auth real, loops de crecimiento, push, analytics, moderación, seguridad,
      verificación de identidad, unit economics). Actualizar README/AGENTS/este TODO.
- [ ] **Cierre** — revisión adversarial por workflow de todo lo nuevo + fixes +
      screenshots finales + verificación completa (unit + e2e + builds).

## Pendientes conocidos (deuda consciente, NO bloqueante)

- Los `detail` de `Violation` que emite el motor están en español (matching.ts).
  La UI ya antepone el código traducido. Fix real: motor emite `code + params`,
  la UI arma el texto. Hacerlo cuando se toque el motor por otra razón.
- Las capturas de `docs/screenshots/` muestran la marca vieja hasta PR3.
- `Intl.PluralRules` no se usa todavía (los 6 idiomas iniciales funcionan con `_one`),
  pero ruso/árabe/etc. lo van a necesitar — el punto único de cambio es `translate()`.
- El historial de viajes es seed: cuando exista backend, materializar `TripRecord`s
  al pasar la fecha del evento y habilitar reseñas solo entre co-viajeros.
- Rename del repo GitHub `caravana` → `convoyar` (redirect automático de GitHub).

## Cómo retomar en una semana (checklist de arranque)

1. `git log --oneline -10` + este archivo → ver en qué PR quedó la cosa.
2. `npm install && npm test && npm run test:e2e` → confirmar base verde.
3. Leer AGENTS.md si sos nuevo; docs/ARCHITECTURE.md si vas a tocar diseño.
4. Seguir con el primer `[ ]` de la lista de PRs. Una branch por PR, merge propio.
