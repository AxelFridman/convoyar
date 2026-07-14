# Roadmap — de MVP local a producto real

> Estado al 2026-07: **Fase 1 completa** y **Fase 2 conectada** — Supabase real (auth email +
> contraseña, orgs, realtime, RLS; migraciones corridas en dev y prod). **Producción live en
> `convoyar.com`** (PWA instalable). Falta: push nativo y la prueba cerrada de Google Play (12
> testers × 14 días, ver `docs/lanzamiento/12-testers-cerrada.md`). Cada fase deja la app
> funcionando; ninguna requiere reescritura.

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
- [x] 6 idiomas (es/en/pt/de/it/fr), modo oscuro, monetización cableada y apagada.
- [x] Suite unit/integración + E2E Playwright (ver `package.json`).

## Fase 2 — Multi-dispositivo real ✅ conectada (Supabase)

Dos personas en dos teléfonos ven la misma org. Backend: **Supabase** (Postgres + Auth +
Realtime, capa free). Estado ítem por ítem:

1. [x] **Auth**: Supabase Auth con **email + contraseña** (alta, login, reset; `services/auth.ts`
   + `screens/Auth.tsx`). `meId` ya no es fijo: se deriva de la sesión (`onAuthStateChange`).
2. [x] **Esquema + RLS**: tablas en `server/schema.sql` (derivadas de `model.ts`) con RLS en
   `server/rls.sql`; miembros ven su org, eventos públicos visibles para todos, solicitudes
   para solicitante + organizador. Migraciones corridas: v3→v4 (garage + realtime), org
   personal, orgs (invitaciones), moderación.
3. [x] **Sync**: `services/repo.ts` (`loadRemote` + `writeAction`) habla con Supabase;
   `services/storage.ts` quedó como **cache local** (offline). Realtime para solicitudes,
   asignaciones y chat (`subscribeRealtime`).
4. [x] **Org personal**: cada usuario nuevo arranca con su org "Mis viajes" (RPC
   `ensure_personal_org`, `security definer`).
5. [x] **Simulación apagada con backend**: `scheduleSimulatedReply` y el sweep on-mount siguen
   en el código pero **gateados con `if (hasSupabase) return`** — sólo corren en modo local/demo.
   Con backend, `requestJoin`/`decideRequest` van contra la base y Realtime avisa. La UI no cambia.
6. [ ] **Push real**: `@capacitor/push-notifications` + FCM/APNs, o Web Push en PWA. Credenciales
   de Firebase ya listas; falta el código. Enganchar donde hoy está `services/notify.ts`.
7. [ ] **Matching en server** (opcional): el motor es puro TS → corre en una Edge Function tal
   cual (`solveMatching(input, provider)`). Conviene para eventos de 100+, para no recalcular en
   N clientes, y para no filtrar domicilios en el modo público (nota de privacidad del doc 01).
8. [x] **Reseñas solo entre co-viajeros** (`migrate-review-gate.sql`): `share_trip()` + RLS
   endurecida; `canReview` en el cliente (`reputation.ts`) gatea el form. Un extraño ya no puede
   bombardear ★. **Historial real** (`migrate-trip-history.sql`): `materialize_my_trips()` (RPC
   idempotente, se llama al hidratar) materializa `TripRecord`s de eventos pasados con asignación,
   para que el perfil real muestre viajes (antes el historial era solo seed).
9. [x] **Invitaciones y moderación cableadas end-to-end**: link self-serve con toggle
   (`set_org_link` → `Home.tsx`), invitar por email (`add_member_by_email`), unirse por código y
   deep-link `?join=`, reportar (pausa server-side) y bloquear/desbloquear (`People.tsx`), en los
   6 idiomas. (El ROADMAP viejo las daba por pendientes; ya están.)

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
  si se quiere ads en free). Los gates ya existen. Todo gratis por ahora.
- Métricas históricas por org (% asignados, CO₂ acumulado).
- Accesibilidad AA completa (hoy: roles ARIA y contraste razonables, falta audit).
- Más idiomas: ya hay 6 (es/en/pt/de/it/fr); sumar según mercado (`translate()` escala).
- Moderación del modo público: **reportar (pausa) y bloquear ya modelados en el backend**
  (`server/migrate-moderation.sql`) — falta cablear la UI. Verificación de identidad: más adelante.

## Publicación en stores

**Android ya está scaffoldeado** (plataforma `android/` agregada y sincronizada con el build de
prod, íconos/splash generados, firma preconfigurada). Para actualizar y firmar:

```bash
npm run build && npx cap sync android   # recompila la web de prod y la copia al proyecto nativo
npx cap open android                     # Android Studio → firmar → .aab → Play Console
# iOS: pendiente. `npx cap add ios` (requiere macOS/Xcode).
```

Falta (parte del dueño): keystore + `.aab` firmado + cuenta Play + los 14 días de testing.
Checklist en [docs/lanzamiento/05](lanzamiento/05-google-play.md). ⚠️ **La política de privacidad
ya NO puede decir "la app no manda datos a servidores"**: desde que se conectó Supabase se
recolectan email, ubicaciones y contenido — declararlo con la verdad. Push: FCM/APNs →
[doc 07](lanzamiento/07-push-notifications.md).
