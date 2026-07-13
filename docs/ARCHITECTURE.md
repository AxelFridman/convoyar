# Arquitectura de Convoyar

> Para la guía operativa (comandos, invariantes, trampas) ver [../AGENTS.md](../AGENTS.md).
> Este documento explica el **diseño**: por qué las piezas son como son y cómo se hablan.

## Vista de 10.000 metros

```
┌─────────────────────────────── UI (React) ───────────────────────────────┐
│  screens/  Home · Explore · MyTrip · Results · Admin · Profile           │
│  components/  People · RideCard · MapPicker(Leaflet) · UI kit            │
└──────────────┬────────────────────────────────────────────────────────────┘
               │ useStore() — context + useReducer
┌──────────────▼────────────────── state/ ──────────────────────────────────┐
│  model.ts   AppState v4 (orgs, members, events, legs, assignments,        │
│             joinRequests, reviews, tripHistory, notifications, settings)  │
│  store.tsx  reducer + acciones + runMatch/manualMove/cancelDriver         │
│             + flujo público: requestJoin/decideRequest/rateMember         │
│  reputation.ts  helpers puros (rating, historial, permisos)               │
└──────┬──────────────────────────────┬─────────────────────────────────────┘
       │ persist (debounce 250ms)     │ buildMatchInput(state, eventId)
┌──────▼──────┐              ┌────────▼──────────── engine/ ────────────────┐
│ services/   │              │  types.ts     MatchInput → MatchResult       │
│ storage     │              │  matching.ts  greedy + mejora local + warm   │
│ notify      │              │  routing.ts   RoutingProvider (Mock | OSRM)  │
│ billing     │              │  geo.ts       haversine, caminata, RNG       │
│ export      │              └──────────────────────────────────────────────┘
└─────────────┘
```

Tres capas con dependencias en un solo sentido: **UI → state → engine**.
El motor no sabe que existe React; la UI no sabe cómo se resuelve el matching.

## El motor (src/engine)

**Contrato** — lo único que un backend futuro debe respetar:

```ts
solveMatching(
  { drivers: DriverLeg[], passengers: PassengerLeg[], meetingPoints?, options? },
  provider: RoutingProvider
) → { rides: Ride[], unassigned: Unassigned[], stats: MatchStats }
```

- Es un **CVRPTW a pequeña escala** (vehículos con capacidad + ventanas de tiempo).
  Para el tamaño objetivo (≤ ~100 personas por evento) alcanza con greedy por costo de
  inserción + pasadas de mejora local; 90 pax + 20 autos < 1 s con el provider mock.
- `options.warmStart` recibe el resultado anterior y el solver intenta conservar
  asignaciones válidas → **recálculo incremental** (cancela un conductor, entra un
  pasajero: se mueve lo mínimo). Lo usan `cancelDriver` y `decideRequest`.
- `validateMatch` re-verifica todas las restricciones duras sobre un resultado; la UI
  lo corre siempre y muestra `Violation[]` (solo pueden aparecer tras un override manual).
- `applyManualMove` implementa el "mover a mano" del admin sin recomputar todo.
- **RoutingProvider** aísla el ruteo: `MockRoutingProvider` (haversine ×1.3 a 26 km/h)
  para desarrollo/demo, `OsrmRoutingProvider` (servicio `table` de OSRM) para
  producción. El motor pide **una sola matriz** de distancias por cálculo, así que el
  costo de red no explota con el tamaño del evento.

### Razones de no-asignación

`UnassignedReason` es un enum cerrado (`sin_conductores | necesidades | capacidad |
desvio | ventana | caminata | manual`) y cada valor tiene traducción. La regla de
producto "si no hay match, se dice claramente por qué" está cableada en el tipo.

## El estado (src/state)

- **Una sola fuente de verdad** (`AppState`) en un `useReducer`; las pantallas no
  tienen estado de dominio propio, solo estado de UI efímero (sheets abiertos, forms).
- **Persistencia**: dos modos según `hasSupabase` (`services/supabaseClient.ts`).
  - **Con backend:** la verdad vive en Postgres (Supabase). `services/repo.ts` hace `loadRemote`
    (arma el `AppState` desde las tablas) y `writeAction` (escribe por acción); localStorage
    queda como **cache** para abrir rápido y offline. Sync por Realtime.
  - **Local/demo:** debounce de 250 ms a localStorage con fallback en memoria (iframes/incógnito),
    clave versionada `convoyar:v4`; el hydrate exige `version === 4` y si no, re-seedea.
  Un cambio de modelo sube clave+versión **y** requiere su migración Postgres en `server/`.
- **`stateRef`**: los callbacks del store leen `stateRef.current` para no capturar
  estado viejo, pero un `dispatch` no se refleja hasta el próximo render. Por eso
  toda secuencia "modifico legs y calculo" pasa los legs explícitos vía
  `legsOverride` (ver `cancelDriver`, `decideRequest`, `scheduleSimulatedReply`).
- **Notificaciones por diff**: `diffNotifs(prev, next)` compara asignaciones y genera
  avisos "te asignamos / tu viaje cambió / quedaste sin lugar (motivo)". No hay push
  real; `services/notify.ts` usa la Notification API del navegador si hay permiso.

## Backend (Supabase) — cómo se conecta

El backend está **conectado**. `services/supabaseClient.ts` expone `supabase` (el cliente) y
`hasSupabase` (true con env vars en dev/prod; false en tests, E2E y `build:single`). Ese único
interruptor decide todo: con él prendido, `store.tsx` arranca la sesión (`onAuthStateChange`),
crea la org personal del usuario nuevo (RPC `ensure_personal_org`), carga con `loadRemote` y se
suscribe a Realtime (`subscribeRealtime`); con él apagado, corre la demo local de siempre.

- **Auth**: email + contraseña (`services/auth.ts`). `meId` = member ligado a `auth.uid()`.
- **Datos**: `services/repo.ts` mapea `AppState` ⇄ tablas (snake_case ⇄ camelCase) y escribe por
  acción (`writeAction`). Schema y policies en `server/` (`schema.sql`, `rls.sql`); las migraciones
  (`migrate-v3-to-v4`, `-personal-org`, `-orgs`, `-moderation`) ya se corrieron en dev y prod.
  RLS activo en todas las tablas.
- **Realtime**: las tablas compartidas están en la publicación `supabase_realtime`; un cambio en
  la base recarga el estado del cliente sin recargar la página.
- **Privacidad del motor**: los domicilios (`member_home`) son self-only por RLS. Para el modo
  público con desconocidos conviene correr el matching en una Edge Function (motor TS puro) y
  devolver sólo puntos de encuentro + ETAs, nunca las casas (pendiente; ver lanzamiento 01/03).

## Modo público (tipo BlaBlaCar)

Decisiones de diseño:

- **`visibility` vive en el evento, no en la org.** Una org privada puede publicar
  una salida puntual (ej. "Escapada al Delta") sin exponer nada más.
- **`JoinRequest` es append-only** con `status`; la "última solicitud gana"
  (`myRequestFor` ordena por `at`). Eso permite re-pedir tras un rechazo sin borrar
  historia.
- **Reputación derivada, nunca almacenada**: `ratingOf`/`tripCountOf` recorren
  `reviews`/`tripHistory` en el momento. No hay contadores cacheados que se
  desincronicen. A escala real esto se materializa en el backend, no en el cliente.
- **Al aceptar** una solicitud: se crea un `Leg` pasajero razonable
  (`defaultPassengerLeg`: origen = su casa, caminata 10', ventana [hora evento − 90',
  hora evento]) y, si ya había asignación calculada, se recalcula con `warmStart`
  para moverse lo mínimo. El aceptado puede después editar su leg desde MyTrip
  (ya es participante).
- **Permisos**: `canAdminEvent` = creador del evento ∨ admin de la org (los eventos
  públicos de otros no te muestran Admin). `isParticipant` = miembro de la org ∨
  solicitud aprobada (gate de MyTrip).
- **Organizador ajeno — real con backend, simulado sin él.** Con Supabase, la solicitud, la
  decisión y la aprobación son reales entre personas distintas y llegan por Realtime. En modo
  local/demo (`!hasSupabase`), `scheduleSimulatedReply` aprueba solo a los ~4 s (leg + matching
  + notificación) y un sweep on-mount resuelve pendientes de sesiones anteriores. La simulación
  no se borró: está **gateada con `if (hasSupabase) return`**, y la UI lo declara en modo demo
  ("el organizador responde solo").

## i18n

Diccionarios planos en `src/i18n/` — **6 idiomas** (es/en/pt/de/it/fr) con el tipo
`TKey = keyof typeof es`: una clave que falte en cualquier idioma es error de compilación.
Interpolación `{var}` por split/join (sin dependencias). Plurales: si `vars.n === 1` y existe
`clave_one`, `translate` la usa automáticamente. Suficiente para los 6 actuales; si algún día
hay idiomas con plurales complejos, reemplazar por `Intl.PluralRules` en `translate` (un solo
punto de cambio).

## Monetización (apagada, cableada)

`services/billing.ts`: planes `free/pro/org` con límites y `can(plan, feature)`;
`AdSlot` renderiza null salvo `ADS_ENABLED=true`; `purchase()` es stub con los puntos
de integración documentados (Stripe web / RevenueCat en stores). El único gate activo
hoy es `metricsExport` (export CSV/JSON en Admin) para que el rail se pueda probar.

## Distribución

- **Web/PWA**: `dist/` estático con manifest + service worker (cache de shell y de
  tiles, límite 250) → instalable, tolera mala señal. Deploy en Cloudflare Pages
  (proyecto `convoyar-web`); hoy corre un preview live, el flip de `convoyar.com` está pendiente.
- **Un archivo**: `dist-single/index.html` (~400 KB) vía vite-plugin-singlefile (siempre local).
- **Stores**: Capacitor 8 (`app.convoyar`). **Android ya scaffoldeado** (`android/` agregado y
  sincronizado con el build de prod); falta keystore + `.aab` + cuenta Play. iOS pendiente.
  Push nativo: enganchar `@capacitor/push-notifications` donde hoy está `services/notify.ts`.

## Testing

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Motor | vitest (`engine/matching.test.ts`) | restricciones duras, warmStart, escala 90+20, determinismo |
| Estado/dominio | vitest (`state/public.test.ts`) | reputación, permisos, consistencia del seed v4 |
| Integración | vitest (`state/integration.test.ts`) | seed → buildMatchInput → motor sin violaciones |
| Render | vitest (`state/smoke.test.tsx`) | cada pantalla renderiza con el seed |
| Flujos reales | Playwright (`e2e/app.spec.ts`) | matching, explorar→pedir→aceptado, solicitudes admin, ratings, tema/idioma |
| Visual | Playwright (`e2e/screenshots.spec.ts`) | capturas dark/light a docs/screenshots |
