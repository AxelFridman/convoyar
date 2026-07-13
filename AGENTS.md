# AGENTS.md — Guía para agentes de IA que trabajen en Convoyar

> Leé esto entero antes de tocar código. Son 5 minutos y te ahorra romper invariantes
> que los tests no siempre atrapan. Documentos hermanos: [docs/TODO.md](docs/TODO.md)
> (**estado vivo del trabajo — empezá por ahí para retomar**), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
> (diseño en profundidad), [docs/ROADMAP.md](docs/ROADMAP.md) (qué falta) y
> [docs/lanzamiento/](docs/lanzamiento/) (**guía operativa paso a paso para lanzar de
> verdad**: Supabase, auth, deploy web, Play Store, App Store, push, monetización, OSRM,
> analytics). El schema Postgres ejecutable y sus migraciones (ya corridas en dev+prod) viven en [server/](server/).
>
> Metodología de trabajo: una branch `feat/*` por bloque de trabajo → PR → merge.
> Toda feature a medias queda anotada en docs/TODO.md antes de cerrar la sesión.
>
> **Secretos:** `.env` y `server/.env` están gitignoreados. NUNCA commitees claves reales
> (Supabase `service_role`, passwords). GitHub push protection está activo y rechaza el push.

## Qué es esto

PWA mobile-first de **logística colaborativa**: organizaciones (asados, oficinas, clubes)
coordinan "quién lleva a quién" con un motor de matching propio (CVRPTW a pequeña escala),
y además hay un **modo público tipo BlaBlaCar**: viajes descubribles donde la gente pide
lugar y el organizador acepta/rechaza mirando reputación, historial y antigüedad.

Stack: React 18 + TypeScript + Vite + Leaflet/OSM + **Supabase** (Postgres + Auth + Realtime).
**Cero APIs pagas de mapas/ruteo** (requisito duro): mapas OSM, ruteo mock u OSRM self-hosted.

**Backend real conectado.** El interruptor `hasSupabase` (`services/supabaseClient.ts`) elige el modo:
- **Con backend** (dev/prod, hay env vars `VITE_SUPABASE_*`): auth **email + contraseña**,
  datos en Supabase, sync por **Realtime**, `meId` derivado de la sesión, y cada usuario
  arranca con su **org personal** ("Mis viajes", RPC `ensure_personal_org`).
- **Local/demo** (`npm test`, E2E, `build:single`, o sin env vars): estado en localStorage
  (`convoyar:v4`) con fallback en memoria, un dispositivo, `meId` fijo (`m0`), sin login, con
  la simulación del organizador ajeno. Este modo se mantiene a propósito (tests y demos offline).

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
    model.ts      TODO el modelo de datos (AppState v4). Cambios acá = bump de versión + migración.
    store.tsx     Context + useReducer. Acciones, runMatch, flujo público; con backend: bootstrap
                  de sesión (onAuthStateChange), loadRemote, suscripción realtime; timers demo (sólo local).
    reputation.ts Helpers puros de reputación/permisos (ratingOf, canAdminEvent, …)
    seed.ts       (en src/) Demo determinística: org privada + comunidad pública
  screens/      Home · Explore (público) · MyTrip · Results · Admin · Profile · Auth (login)
  components/   People (Avatar/Stars/MemberProfile) · RideCard · Chat · MapPicker · UI kit · Icons
  services/     supabaseClient (hasSupabase + cliente) · repo (AppState ⇄ Supabase + realtime) ·
                auth (email+contraseña) · storage (cache local + fallback) · billing (apagado) · notify · export
  i18n/         es/en/pt/de/it/fr. Plural: clave con sufijo `_one` se usa sola cuando vars.n === 1.
server/         schema.sql · rls.sql · migraciones (v3→v4, org personal, orgs, moderación) · edge-functions
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

- `Org` (miembros, `adminIds`, `joinCode`, puntos de encuentro) → `EventDoc` (**`visibility:
  "private" | "public"`**, `createdBy`) → `Leg` (respuesta de un miembro a un evento:
  conductor con desvío máx / pasajero con caminata máx + ventana horaria; `vehicleId?` = qué
  vehículo del garage lleva). `Member.home?` es **opcional**; el origen real va por viaje (`Leg`).
- Garage: `Member.vehicles: Vehicle[]` (cada uno con `id`, `alias?`, `capacity`, `features[]`, `smokeFree`).
- Modo público: `JoinRequest` (pending/approved/rejected) + `Review` (1–5★) +
  `TripRecord` (historial) + `Member.joinedISO` (antigüedad).
- `Assignment` = resultado del motor por evento (`state.assignments[eventId]`).
- **Migración**: `AppState.version === 4` y clave `convoyar:v4`. En modo local, si cambiás el
  modelo subís versión+clave (el estado viejo se descarta y se re-seedea). **Con el backend ya
  conectado**, todo cambio de modelo ADEMÁS necesita su migración Postgres en `server/` (ver
  `migrate-v3-to-v4.sql`, `migrate-personal-org.sql`, `migrate-orgs.sql`, `migrate-moderation.sql`),
  corrida en dev **y** prod. Las tablas compartidas van a la publicación `supabase_realtime`.

## Flujo público (tipo BlaBlaCar) — cómo funciona hoy

- `Explore.tsx` lista eventos `visibility === "public"`. Pedir lugar → `store.requestJoin()`.
- **Con backend (Supabase):** solicitud, decisión del organizador y aprobación son **reales**
  entre personas distintas y sincronizan por **Realtime** (`services/repo.ts` `subscribeRealtime`);
  el store recarga con `loadRemote` al recibir el cambio. La UX es idéntica a la de la demo.
- **En modo local/demo (`!hasSupabase`):** no hay otro humano, así que el "organizador" de un
  evento ajeno es simulado: `scheduleSimulatedReply` (store.tsx, **gateado con
  `if (hasSupabase) return`**) aprueba a los ~4s, crea el `Leg` del aceptado
  (`defaultPassengerLeg`), corre el matching y notifica. Un sweep on-mount resuelve pendientes
  de otra sesión. Esta simulación sólo corre sin backend (no se borró: se apaga por el gate).
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
- **Backend real** → **ya conectado (Supabase).** Las escrituras viven en `services/repo.ts`
  (`writeAction`) y la carga en `loadRemote`; auth en `services/auth.ts`. Si agregás una acción
  que muta `AppState`, además del `dispatch` sumá su escritura en `repo.ts` y, si es una tabla
  nueva, su migración en `server/` + policy RLS + (si se comparte) la publicación realtime.
- **Monetización** → `services/billing.ts` tiene los rails (planes, gates, `AdSlot`,
  `purchase()` stub). No inventes otro sistema: encendé ese.

## Estilo

- Español rioplatense en UI y comentarios (el código en inglés). Comentarios solo para
  invariantes/porqués no obvios, no para narrar el código.
- CSS artesanal en `styles.css` con variables (`--bg`, `--accent`, …) y estética de
  "señalética vial argentina". Sin frameworks CSS; respetá los tokens y el modo oscuro
  (`data-theme` en `<html>`).
- Componentes chicos y tipados; nada de `any` (el `tsconfig` es estricto).
