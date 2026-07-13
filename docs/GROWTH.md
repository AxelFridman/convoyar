# GROWTH.md — qué le falta a Convoyar para ser una app estupenda (nivel Silicon Valley)

> Pedido directo del dueño: *"decime qué más le falta para que sea una aplicación
> estupenda, nivel Silicon Valley, muchas descargas."* Este documento es esa respuesta,
> honesta y priorizada. No es marketing: es el mapa de lo que separa "demo muy pulida"
> de "producto que la gente baja, usa y recomienda".

## Dónde estamos hoy (para no engañarnos)

Convoyar ya pasó de demo a app real: motor de matching propio, modo público tipo BlaBlaCar,
6 idiomas, onboarding, chat, reputación, UI con deleite tipo Duolingo — y **backend real
conectado (Supabase)**: alta/login con **email + contraseña**, orgs, org personal por usuario,
sync por Realtime, RLS activo, migraciones corridas en dev y prod. Dos personas en dos
teléfonos ya ven la misma salida. Sigue funcionando 100 % local (interruptor `hasSupabase`)
para tests, `build:single` y demos offline.

Lo que **todavía falta** para "producto lanzable a escala" ya no es la infraestructura de datos
(está hecha), sino: el **flip de producción** a `convoyar.com`, **push nativo**, **cablear en la
UI** la moderación y las invitaciones (RPC ya escritas en `server/`), **confianza** (verificación
de identidad) y las capas de crecimiento/negocio. La arquitectura banca todo esto sin reescritura.

## Lo que separa "demo" de "producto" — por prioridad

### 🔴 P0 — Sin esto no hay producto real

1. ✅ **Backend real y multi-dispositivo — HECHO.** Supabase conectado: `services/supabaseClient.ts`,
   `services/repo.ts` (load/write + realtime), `server/schema.sql` + `rls.sql` + migraciones
   corridas en dev y prod. Dejó de ser el bloqueante.
2. ✅ **Auth real — HECHO.** Alta/login con **email + contraseña** (`services/auth.ts`,
   `screens/Auth.tsx`) + sesión persistida por Supabase; `meId` deriva de la sesión.
3. **Confianza y seguridad de las personas.** Una app donde te subís al auto de un
   desconocido vive o muere por esto:
   - Verificación de identidad (documento/selfie) para conductores, al menos opcional con badge. **(pendiente)**
   - Reportar/bloquear usuarios: **modelo ya en el backend** (`server/migrate-moderation.sql`:
     reportar pausa hasta revisión humana, bloquear es personal) — **falta cablear la UI.**
     Moderación de reseñas y del chat: pendiente.
   - Contacto de emergencia y "compartir mi viaje en vivo" con alguien de confianza. **(pendiente)**
   - Historial inmutable server-side: ahora **posible** (reputación en Postgres + RLS); hoy sigue
     derivándose en el cliente → materializarla server-side.
4. **Notificaciones push reales.** Hoy son in-app + Web Notifications. Sin push nativo,
   una app de coordinación de viajes no retiene. Credenciales de Firebase listas; falta el
   código. Guía en `docs/lanzamiento/07`.

### 🟠 P1 — Sin esto no crece

5. **Loops de crecimiento / viralidad.** Es carpooling: la invitación ES el producto.
   - Deep links: "sumate a mi salida" abre la app en el evento (o al store si no la tiene).
   - Compartir por WhatsApp con preview lindo (el spec original lo pedía).
   - Referidos, y que crear una org traiga a todo un grupo de una.
6. **Ruteo real (OSRM).** Hoy el desvío es haversine. Para confianza en los ETAs y
   puntos de encuentro reales, hace falta OSRM. Adaptador ya escrito; guía en `docs/lanzamiento/09`.
7. **Geocoding / buscar direcciones por texto.** Hoy se toca el mapa. La gente espera
   escribir "Av. Corrientes 1234". Nominatim self-hosted (OSM, gratis).
8. **Onboarding de la organización, no solo del usuario.** El momento "aha" es cuando un
   admin arma su primer evento y ve los convoys. Guiar ESE flujo.
9. **Analytics de producto.** Hoy: cero visibilidad. Sin métricas de activación/retención
   (D1/D7/D30), funnel de onboarding, % de gente que consigue viaje, no se puede iterar.
   Guía en `docs/lanzamiento/10`.

### 🟡 P2 — Lo que lo hace "estupendo"

10. **Viajes recurrentes** ("oficina L–V 8am") — estaba en el spec original, alto valor
    para el caso de uso diario. Se modela como plantilla que clona eventos + legs.
11. ✅ **Recálculo en vivo / realtime** cuando alguien cambia su viaje — **hecho** (Supabase
    Realtime vía `subscribeRealtime` en `services/repo.ts`).
12. **Métricas de impacto** por org y por usuario: km/CO₂ ahorrados acumulados, ranking
    amable, "insignias" (gamification tipo Duolingo — encaja con el tono ya elegido).
13. **Accesibilidad AA auditada** (hoy hay roles ARIA y contraste razonable, falta audit
    formal con lector de pantalla).
14. **Modo sin conexión más profundo** (ya hay PWA + cache de tiles; falta cola de acciones
    offline que sincroniza al volver).
15. **Más idiomas** (los 6 actuales cubren mucho; agregar según mercado — el sistema ya escala).

### 🟢 P3 — Negocio y madurez

16. **Monetización encendida.** Rails ya cableados (`services/billing.ts`): planes,
    gates, ads apagados. Falta conectar Stripe/RevenueCat y decidir el modelo (freemium
    por org / features Pro / ads en free). Guía en `docs/lanzamiento/08`.
17. **Compliance:** política de privacidad, términos, GDPR/derecho al olvido, manejo de
    datos de ubicación (sensibles). Imprescindible para las stores.
18. **Soporte y feedback in-app** (reportar bug, contactar). Barato, gran señal de calidad.
19. **CI/CD**: hoy los tests corren local. Falta GitHub Actions que corra unit+E2E en cada
    PR y bloquee merge si algo falla (el `playwright.config` ya tiene `retries` para CI).
20. **Observabilidad:** Sentry (errores), uptime, alertas. Guía en `docs/lanzamiento/10`.

## Si tuviera que elegir los próximos 5 movimientos

1. ✅ **Conectar Supabase** (P0-1, P0-2) — **hecho.** Falta el *flip* de producción a `convoyar.com`.
2. **Push nativo** (P0-4): sin esto no hay retención en una app de coordinación.
3. **Cablear moderación + invitaciones en la UI** (P0-3): las RPC ya existen en `server/`; que el
   usuario pueda reportar/bloquear e invitar por email/link desde la app (hoy sólo el código).
4. **Deep links + compartir por WhatsApp** (P1-5): el motor de crecimiento barato y natural.
5. **Analytics** (P1-9): para saber qué arreglar después, en vez de adivinar.

## Lo que YA está bien resuelto (no rehacer)

- Motor de matching (real, testeado, aislado, escala a ~100).
- **Backend conectado (Supabase):** auth email+contraseña, orgs, org personal, realtime, RLS,
  migraciones corridas en dev+prod.
- Modelo de datos y schema (coherentes, v4, con SQL ejecutable y migraciones corridas).
- i18n (6 idiomas, arquitectura que escala a más).
- UX/UI (mobile-first, deleite, modo oscuro, onboarding, empty states).
- Privacidad por diseño (domicilio separado, self-only en el schema).
- Documentación (AGENTS, ARCHITECTURE, ROADMAP, TODO, lanzamiento/, este archivo).

> **En una frase:** el producto está diseñado como para ser estupendo; lo que falta es
> mayormente *ejecución de infraestructura y de confianza*, no rediseño. El orden de
> arriba es la ruta más corta de "demo hermosa" a "app que la gente baja y recomienda".
