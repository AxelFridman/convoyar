# Roadmap — de MVP local a producto real

> Estado al 2026-07: **Fase 1 completa** (MVP local-first con modo público simulado).
> Cada fase deja la app funcionando; ninguna requiere reescritura.

## Fase 1 — MVP local ✅ (esto que estás viendo)

- [x] Organizaciones, miembros, vehículos, eventos privados.
- [x] Motor de matching propio (CVRPTW chico): restricciones duras, preferencias
      blandas, warmStart incremental, razones de no-asignación.
- [x] Mapa OSM + Leaflet, puntos de encuentro, hoja de ruta con ETAs.
- [x] Admin: calcular/recalcular, mover a mano con advertencias, cancelar conductor,
      métricas (asignados/autos/desvío/CO₂), export CSV/JSON.
- [x] **Modo público tipo BlaBlaCar**: eventos públicos descubribles, pedir lugar,
      aceptar/rechazar mirando rating ★, historial de viajes y antigüedad; reseñas
      1–5 con comentario; organizador simulado (demo sin backend).
- [x] PWA instalable + build de un solo archivo + Capacitor configurado.
- [x] es/en, modo oscuro, monetización cableada y apagada.
- [x] 39 tests unitarios/integración + 13 E2E Playwright.

## Fase 2 — Multi-dispositivo real

Objetivo: dos personas en dos teléfonos ven la misma org. Sugerido: **Supabase**
(Postgres + Auth + Realtime, capa free generosa) — pero cualquier backend que hable
el contrato del motor sirve.

1. **Auth**: Supabase Auth (magic link). `meId` deja de ser fijo; `AppState.meId`
   pasa a derivarse de la sesión.
2. **Esquema**: las colecciones de `model.ts` son las tablas (orgs, members, events,
   legs, join_requests, reviews, trip_history). RLS: miembros ven su org; eventos
   públicos visibles para todos; solicitudes visibles para solicitante + organizador.
3. **Sync**: reemplazar `services/storage.ts` por un repositorio remoto con cache
   local (mantener la firma load/save para no tocar el store). Realtime para
   solicitudes y asignaciones.
4. **Borrar la simulación**: `scheduleSimulatedReply` y el sweep on-mount de
   store.tsx desaparecen; `requestJoin`/`decideRequest` quedan igual pero contra el
   backend. La UI no cambia.
5. **Matching en server** (opcional): el motor es puro TS → corre en una Edge
   Function tal cual (`solveMatching(input, provider)`). Conviene cuando un evento
   supere ~100 participantes o para no recalcular en N clientes.
6. **Push real**: `@capacitor/push-notifications` + FCM/APNs, o Web Push en PWA.
   Enganchar donde hoy está `services/notify.ts`.
7. **Historial real**: al pasar la fecha del evento con asignación, materializar
   `TripRecord`s (hoy el historial es seed). Habilitar reseñas solo entre quienes
   compartieron viaje (hoy la demo permite reseñar desde cualquier perfil).

## Fase 3 — Ruteo y escala

- **OSRM self-hosted** (instrucciones en README): swap de 1 línea en store.tsx.
  Con eso los desvíos son minutos reales de calle, no haversine.
- **Nominatim** para buscar direcciones por texto (hoy: tap en el mapa).
- **Tiles propios** (TileServer GL) si el tráfico supera la política de uso de
  tiles públicos de OSM.
- Motor: si aparecen eventos de 200+, evaluar OR-Tools (WASM o server) detrás del
  mismo contrato `MatchInput → MatchResult`. El módulo ya está aislado para eso.
- Viajes recurrentes ("oficina L-V 8am"): plantilla que clona eventos + legs.

## Fase 4 — Producto

- Monetización: encender `billing.ts` (Stripe web / RevenueCat stores; AdMob/AdSense
  si se quiere ads en free). Los gates ya existen.
- Métricas históricas por org (% asignados, CO₂ acumulado).
- Accesibilidad AA completa (hoy: roles ARIA y contraste razonables, falta audit).
- Más idiomas (pt-BR primero); `translate()` ya soporta el patrón.
- Moderación del modo público: reportes, bloqueos, verificación de identidad.

## Publicación en stores (cuando quieras)

```bash
npm run build
npx cap add android && npx cap sync android
npx cap open android   # Android Studio → firmar → .aab → Play Console
# iOS igual con `ios` (requiere macOS/Xcode)
```

Checklist store: íconos/splash (usar @capacitor/assets), política de privacidad
(la app no manda datos a servidores hoy — decirlo es fácil), y para push, FCM/APNs.
