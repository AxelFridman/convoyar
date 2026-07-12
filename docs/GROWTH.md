# GROWTH.md — qué le falta a Convoyar para ser una app estupenda (nivel Silicon Valley)

> Pedido directo del dueño: *"decime qué más le falta para que sea una aplicación
> estupenda, nivel Silicon Valley, muchas descargas."* Este documento es esa respuesta,
> honesta y priorizada. No es marketing: es el mapa de lo que separa "demo muy pulida"
> de "producto que la gente baja, usa y recomienda".

## Dónde estamos hoy (para no engañarnos)

Convoyar hoy es un **MVP local-first excepcionalmente pulido**: motor de matching real,
modo público tipo BlaBlaCar, 6 idiomas, onboarding, chat, reputación, verificación de
email simulada, UI con deleite tipo Duolingo. Todo corre en el navegador, un dispositivo,
sin backend. Es una base sólida y demo-able, pero **todavía no es un producto lanzable a
escala**: falta la infraestructura que hace que dos personas reales se conecten, y las
capas de confianza/crecimiento/negocio que hacen que una app de movilidad funcione.

La buena noticia: la arquitectura está lista para todo esto (motor aislado, contrato
`MatchInput→MatchResult`, `services/` reemplazables, schema ya escrito en `server/`).

## Lo que separa "demo" de "producto" — por prioridad

### 🔴 P0 — Sin esto no hay producto real

1. **Backend real y multi-dispositivo.** Hoy cada teléfono es una isla. Es EL bloqueante.
   Ya está todo preparado: `server/schema.sql`, RLS, y la guía `docs/lanzamiento/`. Es
   ejecución (crear el Supabase, conectar `services/storage.ts`), no diseño.
2. **Auth real.** Verificación de email hoy es simulada (`services/auth.ts`). Falta OTP/
   magic-link de verdad + sesión persistida. Guía en `docs/lanzamiento/02`.
3. **Confianza y seguridad de las personas.** Una app donde te subís al auto de un
   desconocido vive o muere por esto:
   - Verificación de identidad (documento/selfie) para conductores, al menos opcional con badge.
   - Reportar/bloquear usuarios; moderación de reseñas y del chat.
   - Contacto de emergencia y "compartir mi viaje en vivo" con alguien de confianza.
   - Historial inmutable server-side (hoy la reputación es cliente-side, manipulable).
4. **Notificaciones push reales.** Hoy son in-app + Web Notifications. Sin push nativo,
   una app de coordinación de viajes no retiene. Guía en `docs/lanzamiento/07`.

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
11. **Recálculo en vivo / realtime** cuando alguien cambia su viaje (Supabase Realtime).
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

1. **Conectar Supabase** (P0-1, P0-2): pasa de demo a app real. Todo lo demás depende de esto.
2. **Push nativo** (P0-4): sin esto no hay retención en una app de coordinación.
3. **Deep links + compartir por WhatsApp** (P1-5): el motor de crecimiento barato y natural.
4. **Verificación de identidad + reportar/bloquear** (P0-3): sin confianza, el modo público no escala.
5. **Analytics** (P1-9): para saber qué arreglar después, en vez de adivinar.

## Lo que YA está bien resuelto (no rehacer)

- Motor de matching (real, testeado, aislado, escala a ~100).
- Modelo de datos y schema (coherentes, v3, con schema SQL listo).
- i18n (6 idiomas, arquitectura que escala a más).
- UX/UI (mobile-first, deleite, modo oscuro, onboarding, empty states).
- Privacidad por diseño (domicilio separado, self-only en el schema).
- Documentación (AGENTS, ARCHITECTURE, ROADMAP, TODO, lanzamiento/, este archivo).

> **En una frase:** el producto está diseñado como para ser estupendo; lo que falta es
> mayormente *ejecución de infraestructura y de confianza*, no rediseño. El orden de
> arriba es la ruta más corta de "demo hermosa" a "app que la gente baja y recomienda".
