# Arquitectura de Caravana

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
│  model.ts   AppState v2 (orgs, members, events, legs, assignments,        │
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
- **Persistencia**: debounce de 250 ms a localStorage con fallback en memoria
  (iframes/incógnito). Clave versionada `caravana:v2`; el hydrate exige
  `version === 2` y si no, re-seedea. Versionar clave + campo juntos hace la
  migración trivial mientras no haya datos reales de usuarios.
- **`stateRef`**: los callbacks del store leen `stateRef.current` para no capturar
  estado viejo, pero un `dispatch` no se refleja hasta el próximo render. Por eso
  toda secuencia "modifico legs y calculo" pasa los legs explícitos vía
  `legsOverride` (ver `cancelDriver`, `decideRequest`, `scheduleSimulatedReply`).
- **Notificaciones por diff**: `diffNotifs(prev, next)` compara asignaciones y genera
  avisos "te asignamos / tu viaje cambió / quedaste sin lugar (motivo)". No hay push
  real; `services/notify.ts` usa la Notification API del navegador si hay permiso.

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
- **Simulación del organizador ajeno** (`scheduleSimulatedReply`): sin backend no hay
  otro humano, así que pedidos a eventos de la comunidad se aprueban solos a los ~4 s,
  con leg + matching + notificación, y un sweep on-mount resuelve pendientes de
  sesiones anteriores. Está marcado en el código como lo primero que muere cuando
  haya backend. La UI lo declara ("Demo local: el organizador responde solo").

## i18n

Diccionarios planos `es`/`en` con el tipo `TKey = keyof typeof es` — una clave que
falte en `en` es error de compilación. Interpolación `{var}` por split/join (sin
dependencias). Plurales: si `vars.n === 1` y existe `clave_one`, `translate` la usa
automáticamente. Suficiente para es/en; si algún día hay idiomas con plurales
complejos, reemplazar por `Intl.PluralRules` en `translate` (un solo punto de cambio).

## Monetización (apagada, cableada)

`services/billing.ts`: planes `free/pro/org` con límites y `can(plan, feature)`;
`AdSlot` renderiza null salvo `ADS_ENABLED=true`; `purchase()` es stub con los puntos
de integración documentados (Stripe web / RevenueCat en stores). El único gate activo
hoy es `metricsExport` (export CSV/JSON en Admin) para que el rail se pueda probar.

## Distribución

- **Web/PWA**: `dist/` estático con manifest + service worker (cache de shell y de
  tiles, límite 250) → instalable, tolera mala señal.
- **Un archivo**: `dist-single/index.html` (~400 KB) vía vite-plugin-singlefile.
- **Stores**: Capacitor ya configurado (`ar.caravana.app`); `npx cap add android|ios`
  sobre `dist/`. Push nativo: enganchar `@capacitor/push-notifications` donde hoy
  está `services/notify.ts`.

## Testing

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Motor | vitest (`engine/matching.test.ts`) | restricciones duras, warmStart, escala 90+20, determinismo |
| Estado/dominio | vitest (`state/public.test.ts`) | reputación, permisos, consistencia del seed v2 |
| Integración | vitest (`state/integration.test.ts`) | seed → buildMatchInput → motor sin violaciones |
| Render | vitest (`state/smoke.test.tsx`) | cada pantalla renderiza con el seed |
| Flujos reales | Playwright (`e2e/app.spec.ts`) | matching, explorar→pedir→aceptado, solicitudes admin, ratings, tema/idioma |
| Visual | Playwright (`e2e/screenshots.spec.ts`) | capturas dark/light a docs/screenshots |
