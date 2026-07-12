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
      Verificación de email con código (`services/auth.ts`: `AuthProvider` +
      `LocalAuthProvider` simulado, contrato listo para Supabase/Auth0/propio; el
      código se muestra en la demo, en prod nunca vuelve al cliente). Chat por convoy
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
