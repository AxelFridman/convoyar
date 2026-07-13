# TODO — estado vivo del proyecto Convoyar

> **Este archivo es la fuente de verdad del progreso.** Cualquier agente (humano o IA)
> que retome el proyecto empieza acá: qué está hecho, qué está a medias, qué sigue.
> Regla: si una feature no está terminada, TIENE que figurar acá antes de cerrar la sesión.
> Metodología: una branch `feat/*` por bloque → PR → merge a `main`. Rollback = revertir el PR.

## 📍 Estado actual (branch `feat/supabase-connect`, 2026-07-13)

**El backend real está conectado.** La app dejó de ser sólo local: en dev/prod habla con
Supabase; en tests, E2E y `build:single` sigue 100 % local (interruptor `hasSupabase` en
`services/supabaseClient.ts`). Si sos nuevo y querés entender dónde está el proyecto, empezá acá.

**Hecho ✅**
- [x] Cliente Supabase (`services/supabaseClient.ts`, `@supabase/supabase-js`) + adaptador
      `services/repo.ts` (`loadRemote` / `writeAction` / `subscribeRealtime`). Store cablea sesión + realtime.
- [x] Auth **email + contraseña** (`services/auth.ts`: signUp/signIn/reset/updatePassword;
      `screens/Auth.tsx`). `meId` deriva de la sesión (`onAuthStateChange`). **NO es OTP.**
- [x] Org personal por usuario ("Mis viajes") vía RPC `ensure_personal_org` al primer login.
      `Member.home` es opcional; la ubicación va por viaje (`Leg`).
- [x] Migraciones corridas en **dev y prod** (idempotentes, en `server/`): `migrate-v3-to-v4.sql`
      (garage v4 + publicación realtime), `migrate-personal-org.sql`, `migrate-orgs.sql`
      (invitaciones), `migrate-moderation.sql`.
- [x] **RLS activo** en todas las tablas; **Realtime habilitado** (tablas compartidas en la
      publicación `supabase_realtime`, agregadas por la migración v4).
- [x] Android **scaffoldeado** (Capacitor 8, `android/` sincronizado con el build de prod,
      íconos/splash, firma preconfigurada por `keystore.properties`).
- [x] Deploy web en Cloudflare Pages (proyecto `convoyar-web`) por CLI; **preview live** en
      `https://supabase-preview.convoyar-web.pages.dev`.
- [x] Dominio `convoyar.com` **comprado** (del dueño).
- [x] Modelo/backend de **moderación** (reportar pausa hasta revisión, bloquear personal) y de
      **grupos privados/invitaciones** (código / email / link con toggle) escritos en `server/`.
- [x] Rename del repo GitHub a `AxelFridman/convoyar` (el remoto ya apunta ahí).

**Pendiente ⏳**
- [ ] **Flip de producción**: `convoyar.com` todavía sirve la versión vieja; apuntar el dominio
      (ya comprado) al deploy de `convoyar-web`.
- [ ] **Cablear la UI** de moderación (reportar/bloquear) y de invitaciones por email/link con
      toggle: las RPC existen en `server/` pero el cliente hoy sólo usa el código de invitación.
- [ ] **Push nativo** (credenciales Firebase listas; falta el código) → `docs/lanzamiento/07`.
- [ ] **Play Store**: keystore + `.aab` firmado + cuenta Play + 14 días de testing (parte del dueño).
- [ ] **iOS**: sin empezar (requiere macOS).
- [ ] **Borrar mi cuenta** (obligatorio Apple/Google): Edge Function + acción en Perfil (PR-B3).

## CAMBIOS DE MODELO — historial de migraciones (ya aplicadas en dev + prod)

> Cada cambio del modelo (`src/state/model.ts`) sube la clave de localStorage y necesita una
> migración Postgres. Todas las de abajo ya están **corridas** y viven como archivos ejecutables
> e idempotentes en `server/`. Clave localStorage actual: **`convoyar:v4`** (el cliente re-seedea
> en modo local si la versión no coincide).

- ✅ **v3 → v4 (garage), `server/migrate-v3-to-v4.sql`:** `members.vehicle jsonb` (uno) pasó a
  `members.vehicles jsonb default '[]'` (**Vehicle[]**; cada uno con `id`, `alias?`, `capacity`,
  `features[]`, `smokeFree`, `plate?`); `legs` suma `vehicle_id text` (qué vehículo del garage se
  ofrece por viaje; null = el primero). Además agrega las tablas compartidas a la publicación
  `supabase_realtime`.
- ✅ **Org personal, `server/migrate-personal-org.sql`:** RPC `ensure_personal_org` (security
  definer) que crea la org "Mis viajes" del usuario nuevo al primer login.
- ✅ **Orgs / invitaciones, `server/migrate-orgs.sql`:** RPC `create_org`, `join_org_by_code`
  (con toggle `link_enabled`, apagado por defecto), `add_member_by_email`, `set_org_link`, `leave_org`.
- ✅ **Moderación, `server/migrate-moderation.sql`:** `members.status` (active/paused), tablas
  `reports` y `member_blocks`, RPC `report_member` (pausa hasta revisión humana) / `block_member` (personal).

## Convenciones de marca (decididas en PR1)

| Concepto | Nombre en producto |
|---|---|
| La app / el verbo | **Convoyar** ("convoyamos a la oficina") |
| El auto armado con su gente | **convoy** |
| Acción del organizador de correr el matching | **Armar convoys / Rearmar convoys** |
| Evento/salida | salida (event) — sin cambio |
| Pedir unirse a una salida pública | Pedir lugar |
| Id de app (stores) | `app.convoyar` |
| Clave localStorage | `convoyar:v4` |

## Tanda "más lindo / más features / más config" (sesión 2026-07-12, parte 2)

> Trabajo SOLO frontend local-first, en paralelo a la conexión de Supabase (otra persona).
> Nunca toqué `services/auth.ts` como selector de provider, `.env`, ni `docs/lanzamiento/`.
> Directiva transversal: **core simple y siempre visible; lo avanzado en sub-pantallas/tabs.**

- [x] **PR-A1 `feat/garage`** (PR#10) — múltiples vehículos por persona. `Member.vehicle` →
      `Member.vehicles: Vehicle[]` (con `id` + `alias`). Sección "Mi garage" en Perfil.
      `state/vehicles.ts` (helpers puros). **Modelo v4** (clave `convoyar:v4`). ⚠️ ver delta SQL arriba.
- [x] **PR-A2 `feat/vehicle-per-trip`** (PR#11) — elegir qué vehículo del garage llevás por
      salida (`Leg.vehicleId`, selector en Mi viaje; el motor toma la capacidad del elegido).
- [x] **PR-B1 `feat/settings-tab`** — pantalla **Ajustes** separada (cuenta, prefs, idioma,
      tema, **formato de hora 12h/24h nuevo**, plan, intro, reset). Perfil queda con lo core
      (identidad + reputación + historial + garage). `Settings.hour12?` opcional (sin bump).
- [x] **PR-B2 `feat/personal-defaults`** (PR#13) — `Member.defaults?: TripDefaults`
      (rol/ventana/needs/smokeFree) precargan viajes nuevos. Editor en Ajustes.
- [x] **PR-E1 `feat/badges`** (PR#14) — `state/achievements.ts`: 6 insignias + barra
      "completá tu perfil". `<Badges>` en Perfil y perfil público.
- [x] **PR-C2 `feat/fuel-split`** (PR#15) — `state/fare.ts`: aporte de nafta sugerido
      (informativo, sin cobro). `Settings.fuelPricePerL?`. Línea en RideCard.
- [x] **PR-F1 `feat/route-map`** (PR#16) — ruta ámbar con casing + paradas numeradas en el mapa.
- [ ] **PR-A3** multi-auto por salida (2 choferes en una familia) — evaluar impacto en motor. Pendiente.
- [ ] **PR-B3** "borrar mi cuenta" (limpia estado local + hook para backend).
- [ ] **PR-C1** viajes recurrentes · **PR-C3** estados del convoy (confirmado/en camino/llegué).
- [ ] **PR-D1/D2** modo público mejor (mapa en Explorar, favoritos).
- [ ] **PR-F2/F3** belleza (rediseño tarjeta, tipografía) · ruta de calle real = OSRM (backend).
- [ ] **PR-G1/G2** accesibilidad AA · idiomas extra.

- [x] **`fix/tanda2-review`** — revisión adversarial (workflow, 11 agentes) de la tanda 2:
      5 hallazgos confirmados, todos arreglados:
      1. Borrar un vehículo dejaba la asignación/legs colgados (auto equivocado, asientos
         negativos, ride fantasma con '?') → `removeVehicle` repunta legs al vehículo que
         queda e **invalida las asignaciones** de esas salidas (acción `invalidateAssignments`);
         + clamp de asientos libres a ≥0 en RideCard.
      2. Rol default "driver" sin auto → conductor fantasma → `seedRole` sanea la precarga
         y `save()` no persiste un leg de conductor sin vehículo.
      3. Formato 12h no se aplicaba en avisos, hint de MyTrip ni TimeWindowBar → wireado
         (`diffNotifs` usa hour12, MyTrip usa `useHhmm`, TimeWindowBar recibe prop `hour12`).
      4. Pill "✓ verificado" quedaba verde al editar el email → usa `alreadyVerified`.
      E2E de regresión: borrar vehículo invalida la asignación sin dejar convoy corrupto.

**Deferidos con razón:**
- **Unidades km/mi** (era parte de PR-B1): no hay superficie de km visible al usuario hoy
  (distancias se muestran como CO₂ en kg y desvíos/caminata en minutos). Agregar el toggle
  sería un control muerto. Reactivar cuando haya distancias en km en la UI.

## Plan de PRs (sesión 2026-07-11)

- [x] **PR1 `feat/brand-convoyar`** — rebrand completo: manifest, capacitor, index.html,
      package.json, storage key, sw.js, vocabulario i18n (convoy/armar convoys), seed
      (Comunidad Convoyar), docs, tests actualizados. Este archivo (TODO.md) nace acá.
- [x] **PR2 `feat/i18n-multilang`** — 6 idiomas: es, en, pt, de, it, fr. ✅
      `src/i18n.ts` → `src/i18n/` (index + un archivo por idioma; `TKey = keyof typeof es`).
      Selector con banderas en Perfil. `localeOf(lang)` reemplaza los ternarios es/en.
      Test de paridad `i18n.test.ts` (mismas claves + placeholders + marca intacta, 20 tests).
      Traducciones generadas con workflow de subagentes (uno por idioma) + verificación.
- [x] **PR3 `feat/visual-delight`** — capa de deleite tipo Duolingo: ✅
      confetti (`Celebration.tsx`, puro CSS/JS) al conseguir convoy en Resultados y al
      armar convoys en Admin; radio de caminata dibujado en vivo en el mapa
      (`walkRadiusMeters` + círculo Leaflet que late); stagger de entrada de pantalla,
      press-effect en botones/chips/tarjetas, sheen en el botón primario, pop de chips,
      empty states ilustrados (Explorar, Resultados), barra de "armando", banner de
      celebración, ícono de tab activo con bounce. Todo respeta prefers-reduced-motion.
      Screenshots regeneradas.
- [x] **PR4 `feat/onboarding`** — wizard primera vez (`screens/Onboarding.tsx`): ✅
      bienvenida → idioma → nombre → email (opcional, validado) → casa en el mapa →
      ¿tenés auto? (+capacidad) → notificaciones → confetti. Barra de progreso,
      pasos como array {id, body, canNext} (agregar/quitar = trivial). Flag
      `settings.onboarded` (seed=true; se rejuega desde Perfil "Ver la introducción").
      App muestra el wizard a pantalla completa si `!onboarded`. 26 claves ob.* × 6 idiomas.
- [x] **PR5 `feat/account-comms`** — cuentas, comunicaciones y preferencias. ✅
      Verificación de email con código simulado (`services/auth.ts`: `AuthProvider` +
      `LocalAuthProvider`). **⚠️ Superado:** en `feat/supabase-connect` se reemplazó por auth
      real **email + contraseña** contra Supabase (ver "Estado actual" arriba); ya no hay
      `AuthProvider`/`LocalAuthProvider`. Chat por convoy
      (`components/Chat.tsx`, mensajes entre participantes con respuesta simulada;
      `participantsOf` en reputation.ts). Preferencias de aviso por tipo (toggles):
      asignaciones/solicitudes/chat/email; `diffNotifs` y el chat respetan `notifPrefs`.
      Modelo v3 (`messages`, `NotifPrefs`, `Member.email/emailVerified`); clave
      `convoyar:v3`. 30 claves i18n × 6 idiomas. auth.test.ts + participantsOf test.
- [x] **PR6 `feat/temporal-search`** — claridad temporal (el análogo temporal del ✅
      radio de caminata). `components/TimeWindowBar.tsx`: timeline de tu ventana
      horaria en Mi viaje (franja naranja + ticks + pin 📍 del evento, en vivo).
      Chips de fecha en Explorar (Todas / Hoy / Este finde / Próx. 7 días) con
      `inRange()` puro. Claves `search.*` + `trip.windowHint` × 6 idiomas.
- [x] **PR7 `feat/server-skeleton`** — base de datos + backend documentado. ✅
      `server/`: `schema.sql` (14 tablas, derivado 1:1 de model.ts v3), `rls.sql`
      (25 policies + 3 helpers de seguridad), `seed.sql` (humo), `docker-compose.yml`
      (Postgres local), `edge-functions/match/` (ejemplo: motor server-side para
      privacidad del modo público), `README.md`. Además la guía completa de lanzamiento
      **`docs/lanzamiento/`** (11 docs: Supabase/DB, auth, conectar la app, deploy web,
      Play Store, App Store, push, monetización, OSRM, analytics) — la escribió un
      subagente y quedó revisada. **Nota:** el schema no se validó contra un Postgres
      vivo (Docker daemon estaba apagado); validación estructural OK (parens/$$ balanceados).
      Correr `docker compose -f server/docker-compose.yml up` + `psql -f` para validar en vivo.
- [x] **PR8 `docs/growth`** — `docs/GROWTH.md`: análisis "nivel Silicon Valley" ✅
      priorizado P0→P3 (backend, auth, confianza/identidad, push, loops de crecimiento,
      OSRM, geocoding, analytics, recurrentes, monetización, compliance, CI/CD…) + los
      "próximos 5 movimientos". README actualizado con todas las features (6 idiomas,
      onboarding, chat, verificación, búsqueda temporal, deleite) + tabla de screenshots
      ampliada + links a GROWTH/lanzamiento/server. Test counts a 69 unit / 19 E2E.
- [x] **Cierre** — revisión adversarial por workflow (10 agentes, 4 lentes) de PR3–PR7. ✅
      5 hallazgos confirmados, todos arreglados en `fix/review-findings`:
      1. `isParticipant`/`participantsOf` metían a TODA la org en eventos públicos
         (chat expuesto + reply de quien no viaja) → ahora gate por `visibility`. **[media]**
      2. Filtro "Finde" ocultaba el domingo cuando hoy es domingo → fix + 6 tests. **[media]**
      3. Verificación de email case-sensitive (badge vs botón contradictorios) → normaliza a minúsculas. **[media]**
      4. `startVerify` persistía el email sin confirmar y borraba el verificado previo → solo persiste en confirmCode. **[baja]**
      5. Onboarding: navegación durante el confetti expulsaba mid-nav + timer sin limpiar → gate `!done` + ref/cleanup. **[baja]**
      6. Placeholder de email hardcodeado en Perfil → `T("ob.emailPlaceholder")`. **[baja]**
      Verificación final: 76 unit + 19 E2E + typecheck + build + build:single, todo verde.

## Pendientes conocidos (deuda consciente, NO bloqueante)

- Los `detail` de `Violation` que emite el motor están en español (matching.ts).
  La UI ya antepone el código traducido. Fix real: motor emite `code + params`,
  la UI arma el texto. Hacerlo cuando se toque el motor por otra razón.
- Las capturas de `docs/screenshots/` muestran la marca vieja hasta PR3.
- `Intl.PluralRules` no se usa todavía (los 6 idiomas iniciales funcionan con `_one`),
  pero ruso/árabe/etc. lo van a necesitar — el punto único de cambio es `translate()`.
- El historial de viajes sigue siendo seed: aunque el backend ya existe, falta materializar
  `TripRecord`s al pasar la fecha del evento y habilitar reseñas solo entre co-viajeros.
- Reputación aún derivada en el cliente: con RLS activo conviene materializarla server-side
  (hoy es manipulable). Ver `docs/GROWTH.md` P0-3.

## Cómo retomar en una semana (checklist de arranque)

1. `git log --oneline -10` + este archivo → ver en qué PR quedó la cosa.
2. `npm install && npm test && npm run test:e2e` → confirmar base verde.
3. Leer AGENTS.md si sos nuevo; docs/ARCHITECTURE.md si vas a tocar diseño.
4. Seguir con el primer `[ ]` de la lista de PRs. Una branch por PR, merge propio.
