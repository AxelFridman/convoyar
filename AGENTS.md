# AGENTS.md — Guía para agentes de IA que trabajen en Convoyar

> Leé esto entero antes de tocar código. Son 5 minutos y te ahorra romper invariantes
> que los tests no siempre atrapan. Documentos hermanos: [docs/TODO.md](docs/TODO.md)
> (**estado vivo del trabajo — empezá por ahí para retomar**), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
> (diseño en profundidad) y [docs/ROADMAP.md](docs/ROADMAP.md) (qué falta y cómo encararlo).
>
> Metodología de trabajo: una branch `feat/*` por bloque de trabajo → PR → merge.
> Toda feature a medias queda anotada en docs/TODO.md antes de cerrar la sesión.

## Qué es esto

PWA mobile-first de **logística colaborativa**: organizaciones (asados, oficinas, clubes)
coordinan "quién lleva a quién" con un motor de matching propio (CVRPTW a pequeña escala),
y además hay un **modo público tipo BlaBlaCar**: viajes descubribles donde la gente pide
lugar y el organizador acepta/rechaza mirando reputación, historial y antigüedad.

Stack: React 18 + TypeScript + Vite + Leaflet/OSM. **Cero APIs pagas** (requisito duro).
Sin backend: estado en localStorage (`convoyar:v2`), un solo dispositivo, `meId` fijo (`m0`).
Eso es deliberado (MVP local-first); el camino a multi-dispositivo está en el roadmap.

## Comandos

```bash
npm run dev          # dev server (Vite, puerto 5173)
npm test             # vitest: motor + integración + smoke + modo público
npm run test:e2e     # Playwright (levanta su propio server en :5199)
npm run typecheck    # tsc --noEmit
npm run build        # → dist/ (web/PWA/Capacitor)
npm run build:single # → dist-single/index.html autocontenido
```

**Definición de "terminado": los cuatro primeros comandos en verde.** Si agregás
pantallas, sumá smoke test; si agregás lógica de estado, sumá unit test; si agregás
flujo de usuario, sumá E2E.

## Mapa del código (dónde vive cada cosa)

```
src/
  engine/       ★ EL MOTOR. Puro, sin React/DOM/imports de UI. NO le agregues deps.
    types.ts      Contrato MatchInput → MatchResult. Leelo antes que nada.
    matching.ts   solveMatching / validateMatch / applyManualMove (warmStart = incremental)
    routing.ts    RoutingProvider: Mock (haversine) + OSRM real (swap de 1 línea en store)
    geo.ts        haversine, minutos de caminata, RNG determinístico
  state/
    model.ts      TODO el modelo de datos (AppState v2). Cambios acá = bump de versión.
    store.tsx     Context + useReducer. Acciones, runMatch, flujo público, timers demo.
    reputation.ts Helpers puros de reputación/permisos (ratingOf, canAdminEvent, …)
    seed.ts       (en src/) Demo determinística: org privada + comunidad pública
  screens/      Home · Explore (público) · MyTrip · Results · Admin · Profile
  components/   People (Avatar/Stars/MemberProfile) · RideCard · MapPicker · UI kit · Icons
  services/     storage (localStorage+fallback) · billing (apagado) · notify · export
  i18n.ts       es/en. Plural: clave con sufijo `_one` se usa sola cuando vars.n === 1.
e2e/            Playwright: flujos reales + screenshots.spec (capturas a docs/screenshots)
```

## Invariantes que NO se rompen

1. **El motor no conoce la UI.** `src/engine/` no importa React, ni state/, ni services/.
   Todo lo que necesita entra por `MatchInput` y el `RoutingProvider`.
2. **Restricciones duras vs blandas.** Capacidad, desvío máximo, ventana horaria,
   caminata y necesidades (silla de ruedas, etc.) JAMÁS se violan automáticamente;
   las preferencias blandas (subgrupo, libre de humo) solo desempatan. Un admin puede
   forzar a mano, pero la UI muestra la violación (`validateMatch`).
3. **Nadie queda asignado fuera de sus límites.** Si no hay match factible, la persona
   queda `unassigned` con un `UnassignedReason` legible. No se "estira" nada.
4. **Determinismo.** El seed y el motor (con `seed` fijo) son reproducibles; los tests
   dependen de eso. No metas `Math.random()` sin pasar por el RNG de `geo.ts`.
5. **i18n completo.** Cero strings de UI hardcodeados: toda clave nueva va en `es` Y `en`
   (el tipo `TKey` obliga; si TypeScript se queja de la clave, te faltó un idioma).
6. **Privacidad por diseño.** La casa exacta de un miembro no se muestra a otros; se
   comparte el punto de encuentro calculado. Mantené eso al agregar pantallas.
7. **$0 de operación.** Nada de Google Maps/APIs pagas. Mapas = OSM + Leaflet;
   ruteo = mock o OSRM self-hosted.

## Modelo de datos en 30 segundos (state/model.ts)

- `Org` (miembros, `adminIds`, puntos de encuentro) → `EventDoc` (**`visibility:
  "private" | "public"`**, `createdBy`) → `Leg` (respuesta de un miembro a un evento:
  conductor con desvío máx / pasajero con caminata máx + ventana horaria).
- Modo público: `JoinRequest` (pending/approved/rejected) + `Review` (1–5★) +
  `TripRecord` (historial) + `Member.joinedISO` (antigüedad).
- `Assignment` = resultado del motor por evento (`state.assignments[eventId]`).
- **Migración**: `AppState.version === 2` y clave `convoyar:v2`. Si cambiás el modelo,
  subí la versión y la clave (el estado viejo se descarta y se re-seedea: aceptable
  mientras sea demo local; cuando haya backend, escribir migración real).

## Flujo público (tipo BlaBlaCar) — cómo funciona hoy

- `Explore.tsx` lista eventos `visibility === "public"`. Pedir lugar → `store.requestJoin()`.
- **No hay backend**, así que el "organizador" de un evento ajeno es simulado:
  `scheduleSimulatedReply` (store.tsx) aprueba a los ~4s, crea el `Leg` del aceptado
  (`defaultPassengerLeg`), corre el matching y notifica. Al reabrir la app, las
  solicitudes pendientes de otra sesión se resuelven igual (efecto on-mount).
  **Cuando conectes backend real, esa simulación es lo primero que se borra.**
- Lado organizador (tus eventos): `RequestsPanel` en Admin — muestra rating, viajes,
  antigüedad y mensaje del solicitante; `decideRequest()` acepta (crea leg + recalcula
  con `warmStart` si ya había asignación) o rechaza. Notificación al afectado siempre.
- Gates: `canAdminEvent` (organizador o admin de la org) para Admin;
  `isParticipant` (miembro de la org o solicitud aprobada) para MyTrip.

## Trampas conocidas (te van a morder si no las sabés)

- **`stateRef.current` en callbacks del store**: los `dispatch` no actualizan `stateRef`
  hasta el próximo render. Si encadenás dispatch + lectura de estado en el mismo tick
  (p. ej. crear un leg y correr matching), pasá los datos por `legsOverride`, no leas
  el estado. `runMatch`, `cancelDriver`, `decideRequest` y la respuesta simulada ya
  lo hacen así — copiá ese patrón.
- **Ventanas horarias en minutos desde las 00:00 del día del evento** (750 = 12:30).
  `defaultPassengerLeg` deriva la ventana de `event.dateISO`. Si el seed define
  conductores con ventana [390,435], un pasajero con [330,420] SÍ se superpone.
- **El puerto 5173 puede estar ocupado por otra app del usuario** — por eso Playwright
  usa el 5199 con `--strictPort`. No lo "simplifiques" de vuelta a 5173.
- **`Sheet` cierra al clickear el fondo**; en E2E, cerralo con
  `page.locator(".sheetBack").click({ position: { x: 10, y: 10 } })`.
- **npm bloquea postinstall de esbuild** en esta máquina (`allowScripts` en package.json
  ya lo permite; si un install limpio falla, `npm approve-scripts esbuild`).

## Cómo extender sin romper

- **Regla de matching nueva** → tipos en `engine/types.ts`, lógica en `matching.ts`,
  test en `matching.test.ts`. La UI la expone después; el motor primero.
- **Pantalla nueva** → screens/ + tab en `App.tsx` + claves i18n (es+en) + smoke test.
- **Ruteo real** → levantar OSRM (README §OSRM) y cambiar `MockRoutingProvider` por
  `OsrmRoutingProvider` en `store.tsx` (~línea 230). Una sola llamada `matrix()` por cálculo.
- **Backend real** → el contrato es `buildMatchInput(state, eventId) → MatchInput` y
  `MatchResult` de vuelta. Ver docs/ROADMAP.md fase 2 (Supabase sugerido).
- **Monetización** → `services/billing.ts` tiene los rails (planes, gates, `AdSlot`,
  `purchase()` stub). No inventes otro sistema: encendé ese.

## Estilo

- Español rioplatense en UI y comentarios (el código en inglés). Comentarios solo para
  invariantes/porqués no obvios, no para narrar el código.
- CSS artesanal en `styles.css` con variables (`--bg`, `--accent`, …) y estética de
  "señalética vial argentina". Sin frameworks CSS; respetá los tokens y el modo oscuro
  (`data-theme` en `<html>`).
- Componentes chicos y tipados; nada de `any` (el `tsconfig` es estricto).
