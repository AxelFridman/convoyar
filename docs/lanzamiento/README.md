# 🚀 Lanzamiento de Convoyar — guía operativa paso a paso

> **Qué es esta carpeta.** El backend real de Convoyar **ya está conectado** (Supabase: auth
> **email + contraseña**, orgs, realtime, RLS; migraciones corridas en dev y prod). Dos personas
> en dos teléfonos ya ven la misma salida en el **preview** live. Lo que falta para lanzar del
> todo —apuntar `convoyar.com` al deploy, publicar en Google Play y App Store, push nativo— es en
> su mayoría cosas que **hacés vos con el mouse y a veces con la tarjeta** (dashboards, fees de
> tiendas, subir archivos, firmar). Esta carpeta es tu checklist maestro: un documento por pieza,
> en orden, pensado para el **free tier** y fácil de escalar. (La app sigue corriendo 100 % local
> en tests y `build:single` vía el interruptor `hasSupabase`, ver [AGENTS.md](../../AGENTS.md).)

> **Stack elegido:** Supabase (Postgres + Auth + Realtime) como backend, deploy web en
> Cloudflare Pages / Netlify, y las apps nativas con Capacitor a **Google Play** y **App Store**.

---

## 📍 Estado actual (2026-07-13)

Lo que **realmente** está hecho a hoy:

| Pieza | Estado | Detalle |
|---|---|---|
| Proyectos Supabase (prod + dev) | ✅ **hecho** | `convoyar-prod` (`qlcwluvhrbkwjkjigsog`) y `convoyar-dev`; claves en `.env` |
| Schema + migraciones (prod **y** dev) | ✅ **hecho** | `schema.sql` + `migrate-v3-to-v4` / `-personal-org` / `-orgs` / `-moderation` corridas |
| RLS (seguridad) | ✅ **activo** | prendido en todas las tablas (`server/rls.sql` + migraciones) → [01](01-supabase-base-de-datos.md) |
| Realtime | ✅ **habilitado** | tablas compartidas en la publicación `supabase_realtime` (viene en la migración v4) |
| Auth | ✅ **real: email + contraseña** | `services/auth.ts` + `screens/Auth.tsx` (alta, login, reset). **No es OTP** → [02](02-auth-real.md) |
| **App conectada a Supabase** | ✅ **hecho** | `@supabase/supabase-js`, `supabaseClient.ts`, `repo.ts`; multiusuario real → [03](03-conectar-la-app.md) |
| Deploy web (Cloudflare Pages) | ✅ **preview LIVE** | `https://supabase-preview.convoyar-web.pages.dev` (proyecto `convoyar-web`, deploy por CLI) → [04](04-deploy-web-pwa.md) |
| Dominio `convoyar.com` | ✅ comprado · ⏳ **flip** | es del dueño; **producción todavía sirve la versión vieja** — falta apuntarlo al deploy nuevo → [04](04-deploy-web-pwa.md) |
| Android (Capacitor) | 🏗️ **scaffoldeado** | `android/` sincronizado; falta keystore + `.aab` + cuenta Play (dueño) → [05](05-google-play.md) |
| Push nativo | ⏳ **pendiente** | credenciales Firebase listas; falta el código → [07](07-push-notifications.md) |
| iOS | ⏳ **pendiente** | requiere macOS → [06](06-app-store-ios.md) |
| Sentry / analytics | 🟡 **a medias** | DSN en `.env`; falta cablear (opcional, Fase 3) → [10](10-analytics-y-monitoreo.md) |

> **En una frase:** la app **ya es multiusuario de verdad** (Supabase conectado, RLS, realtime,
> auth email + contraseña) y corre en un preview live. El próximo hito es el **flip de producción**:
> apuntar `convoyar.com` (ya comprado) al deploy de `convoyar-web`. Después: push, Play Store, iOS.

**Tu ruta más corta a producción:** flip de `convoyar.com` al deploy de `convoyar-web`
([doc 04](04-deploy-web-pwa.md), 🧑 vos) → push nativo ([doc 07](07-push-notifications.md), 🤖) →
Play Store ([doc 05](05-google-play.md), 🧑 vos).

---

## 🧭 Cómo leer esta guía

Cada paso está etiquetado para que sepas al toque de quién es la pelota:

| Ícono | Significa |
|---|---|
| 🧑 **VOS** | Lo hacés vos, a mano: crear una cuenta, tocar un dashboard, pagar, subir un archivo, firmar. **Claude no puede hacer esto por vos.** |
| 🤖 **CÓDIGO** | Cambio en el repo. Algunos ya están (marcados ✅); otros los hace Claude en una PR. Vos solo revisás y mergeás. |
| 💰 | Cuesta plata (o puede costar si escalás). |
| ⏱️ | Tiempo estimado de la tarea. |
| ⚠️ | Trampa / algo que si lo hacés mal duele. Leelo dos veces. |

**Regla de oro de esta guía:** nunca pegues una clave secreta (`service_role`, claves de
firma, tokens) en el código ni en git. Van en variables de entorno y en gestores de
secretos. Cada doc te dice exactamente dónde.

---

## 🗺️ Estado: qué es real y qué está mockeado hoy

| Pieza | Hoy | Después de esta guía |
|---|---|---|
| Motor de matching | ✅ **Real** (puro TS, `src/engine/`) | Igual (se muda tal cual al server si hace falta) |
| Mapas | ✅ **Real** (Leaflet + OpenStreetMap) | Igual |
| Base de datos | ✅ **Postgres en Supabase, multiusuario** (localStorage queda como cache) | Igual → **[01](01-supabase-base-de-datos.md)** |
| Login / auth | ✅ **Real: email + contraseña** (`services/auth.ts`) | Igual → **[02](02-auth-real.md)** |
| Sync entre personas reales | ✅ **Realtime de Supabase** (`subscribeRealtime`); la simulación quedó gateada en modo local | Igual → **[03](03-conectar-la-app.md)** |
| Web en internet | ✅ **Preview live** (`supabase-preview.convoyar-web.pages.dev`) · ⏳ falta flip a `convoyar.com` | Producción en el dominio → **[04](04-deploy-web-pwa.md)** |
| App en Google Play | 🏗️ **Android scaffoldeado** (falta keystore + `.aab` + cuenta) | Publicada → **[05](05-google-play.md)** |
| App en App Store | ❌ (requiere macOS) | Publicada → **[06](06-app-store-ios.md)** |
| Push notifications | ❌ Solo Notification API del navegador (credenciales Firebase listas) | ✅ FCM / APNs / Web Push → **[07](07-push-notifications.md)** |
| Moderación (reportar / bloquear) | 🟡 **Modelo en backend** (`migrate-moderation.sql`); falta UI | UI cableada → nota en [03](03-conectar-la-app.md) |
| Monetización | ⚪ Cableada y **apagada** (`billing.ts`) | ⚪ Encendida cuando quieras → **[08](08-monetizacion.md)** |
| Ruteo por calle real | ⚪ Mock (haversine); adaptador OSRM escrito | ⚪ OSRM self-hosted (opcional) → **[09](09-ruteo-osrm.md)** |
| Errores / métricas de producto | 🟡 DSN de Sentry en `.env`; falta cablear | ✅ Sentry + PostHog free → **[10](10-analytics-y-monitoreo.md)** |

✅ hecho · 🏗️ scaffoldeado · 🟡 a medias · ❌ falta · ⚪ opcional o para más adelante

---

## 📋 Orden recomendado (y por qué)

Hacelo en fases. Cada fase deja algo **usable y demostrable**; no necesitás hacer todo
de una. Si mañana te aburrís después de la Fase 1, ya tenés la app en internet con
usuarios reales.

### Fase 0 — Antes de empezar (30 min) 🧑
- Creá las cuentas gratis que vas a necesitar (todas free tier): [GitHub](https://github.com)
  (ya lo tenés), [Supabase](https://supabase.com), [Cloudflare](https://cloudflare.com).
- Instalá lo básico local: Node 20+, Git, y (para más adelante) Android Studio.

### Fase 1 — La app es real y está en internet ✅ (hecha, salvo el flip de dominio) 💰 ~USD 0
1. ✅ **[01 · Supabase / base de datos](01-supabase-base-de-datos.md)** — proyecto, DB, migraciones y RLS.
2. ✅ **[02 · Auth real](02-auth-real.md)** — login con **email + contraseña**.
3. ✅ **[03 · Conectar la app](03-conectar-la-app.md)** — front enchufado al backend; la simulación quedó gateada.
4. 🏗️ **[04 · Deploy web / PWA](04-deploy-web-pwa.md)** — preview live; **falta el flip de `convoyar.com`**.
> 🎉 Ya podés mandarle el link del preview a un amigo y ambos ven la misma salida.

### Fase 2 — Está en las tiendas (2–4 días de laburo + días de review) 💰 USD 25 + USD 99/año
5. **[05 · Google Play](05-google-play.md)** — Android. 💰 USD 25 (pago único).
6. **[07 · Push notifications](07-push-notifications.md)** — avisos reales (hacelo con o antes que Play).
7. **[06 · App Store iOS](06-app-store-ios.md)** — ⚠️ **necesitás una Mac**. 💰 USD 99/año.

### Fase 3 — Cuando tengas tracción (después) 💰 según escala
8. **[10 · Analytics y monitoreo](10-analytics-y-monitoreo.md)** — enterate qué pasa (mejor hacerlo YA, es gratis).
9. **[08 · Monetización](08-monetizacion.md)** — cobrar / ads, cuando tenga sentido.
10. **[09 · Ruteo OSRM](09-ruteo-osrm.md)** — desvíos por calle real, cuando el mock no alcance.

---

## 💰 Cuánto cuesta (realista)

**Para lanzar en las tres plataformas, primer año:**

| Concepto | Costo | ¿Obligatorio? |
|---|---|---|
| Supabase (Free) | USD 0 | Sí (backend) |
| Cloudflare Pages / Netlify (web) | USD 0 | Sí (web) |
| Firebase / FCM (push) | USD 0 | Recomendado |
| Google Play Console | **USD 25** (pago único, de por vida) | Solo si querés Android |
| Apple Developer Program | **USD 99 / año** | Solo si querés iOS |
| Dominio propio `convoyar.com` | ✅ ya comprado | Sí (ya lo tenés; falta apuntarlo al deploy) |
| Sentry + PostHog | USD 0 (free tier) | Recomendado |
| **Total mínimo para lanzar en las 3** | **≈ USD 124 primer año** | (USD 25 son de una sola vez) |

**Cuándo empezás a pagar de verdad** (recién con usuarios): Supabase Free aguanta unos
~50.000 usuarios activos/mes de auth y 500 MB de base. El salto es **Supabase Pro USD 25/mes**.
El resto (Cloudflare, FCM) escala gratis muchísimo. Detalle en cada doc.

> ⚠️ **Supabase Free pausa el proyecto tras 7 días sin actividad.** Para una demo está
> perfecto; para producción real querés que alguien lo use seguido o pasar a Pro. No es
> un problema hasta que tengas tráfico.

---

## ✅ Checklist maestro de lanzamiento

Copiá esto y andá tildando. El detalle de cada ítem está en el doc que se linkea.

**Fase 1 — Backend + web**
- [x] 🧑 Cuenta de Supabase creada y proyectos `convoyar-prod` + `convoyar-dev` levantados → [01](01-supabase-base-de-datos.md)
- [x] 🧑 Schema SQL + migraciones (`v3-to-v4`, `personal-org`, `orgs`, `moderation`) corridas en prod **y** dev → [01](01-supabase-base-de-datos.md)
- [x] 🧑 **RLS activado** en todas las tablas + Realtime habilitado → [01](01-supabase-base-de-datos.md)
- [x] 🤖 Auth **email + contraseña** cableado (`services/auth.ts`, `screens/Auth.tsx`) → [02](02-auth-real.md)
- [ ] 🧑 SMTP propio (Resend) para volumen/producción — opcional para arrancar (Supabase manda con su SMTP default) → [02](02-auth-real.md)
- [x] 🤖 **App conectada a Supabase** (`@supabase/supabase-js`, `supabaseClient.ts`, `repo.ts`, realtime; simulación gateada) → [03](03-conectar-la-app.md)
- [x] 🧑 Web deployada (**preview live** con las env vars `VITE_SUPABASE_*` horneadas) → [04](04-deploy-web-pwa.md)
- [ ] 🧑 **Flip de producción**: apuntar `convoyar.com` (ya comprado) al deploy de `convoyar-web` → [04](04-deploy-web-pwa.md)
- [ ] 🧑 **Probado con dos dispositivos distintos** que ven la misma salida

**Fase 2 — Tiendas**
- [ ] 🧑 Página de **política de privacidad** publicada (obligatoria en ambas tiendas) → [05](05-google-play.md)
- [ ] 🧑 Cuenta Google Play Console (USD 25) → [05](05-google-play.md)
- [ ] 🧑 **Keystore de firma generado y respaldado en 2 lugares** ⚠️ → [05](05-google-play.md)
- [ ] 🤖 Push integrado en el código (`services/notify.ts` → FCM) → [07](07-push-notifications.md)
- [ ] 🧑 `.aab` firmado subido a testing interno → producción → [05](05-google-play.md)
- [ ] 🧑 (iOS) Mac + Apple Developer (USD 99) + build a TestFlight → [06](06-app-store-ios.md)

**Fase 3 — Operación**
- [ ] 🧑 Sentry (errores) y PostHog (analytics) conectados → [10](10-analytics-y-monitoreo.md)
- [ ] 🧑 Backups de la DB verificados (Supabase los hace, confirmá) → [01](01-supabase-base-de-datos.md)

---

## 🧩 Cómo se relaciona con las PRs del código (TODO.md)

Esta guía es **complementaria** al [docs/TODO.md](../TODO.md). Ese archivo trackea el
**código** (las PRs que hace Claude); esta carpeta trackea la **infraestructura** (lo que
hacés vos). Se tocan en dos lugares:

- **`feat/supabase-connect`** conectó el backend: `services/auth.ts` (**email + contraseña**),
  `services/supabaseClient.ts`, `services/repo.ts` (AppState ⇄ tablas + realtime) → ver
  **[02](02-auth-real.md)** y **[03](03-conectar-la-app.md)**.
- **PR7 `feat/server-skeleton`** planeaba un servidor propio con Postgres. Con Supabase **no
  hizo falta** para lanzar (Supabase da la DB y la API vía RLS). El server propio queda como
  plan B para lógica de servidor pesada; lo aclaramos en [03](03-conectar-la-app.md).

Cuando una PR toque algo de acá, el doc correspondiente dice qué archivo cambia.

---

## 📚 Índice de documentos

| # | Documento | Qué resolvés | Fase |
|---|---|---|---|
| 01 | [Supabase / base de datos](01-supabase-base-de-datos.md) | DB real, multi-dispositivo | 1 |
| 02 | [Auth real](02-auth-real.md) | Login por email de verdad | 1 |
| 03 | [Conectar la app](03-conectar-la-app.md) | Enchufar front ↔ backend, borrar mocks | 1 |
| 04 | [Deploy web / PWA](04-deploy-web-pwa.md) | App en internet, instalable | 1 |
| 05 | [Google Play](05-google-play.md) | Publicar en Android | 2 |
| 06 | [App Store iOS](06-app-store-ios.md) | Publicar en iPhone | 2 |
| 07 | [Push notifications](07-push-notifications.md) | Avisos reales | 2 |
| 08 | [Monetización](08-monetizacion.md) | Cobrar / ads | 3 |
| 09 | [Ruteo OSRM](09-ruteo-osrm.md) | Desvíos por calle real | 3 |
| 10 | [Analytics y monitoreo](10-analytics-y-monitoreo.md) | Errores + métricas | 3 |

---

## 🆘 Glosario mínimo (para no perderte)

- **BaaS** (Backend as a Service): te dan base de datos + auth + API sin que administres
  servidores. Supabase es eso.
- **RLS** (Row Level Security): reglas en la base que deciden qué fila puede leer/escribir
  cada usuario. Es tu muro de seguridad; sin esto cualquiera lee todo.
- **PWA**: la web instalable como app. Ya está en internet (preview live); falta el flip a `convoyar.com`.
- **Capacitor**: envuelve tu web en una app nativa Android/iOS. Ya está configurado (`app.convoyar`).
- **`.aab`**: Android App Bundle, el formato que subís a Google Play (no `.apk`).
- **Keystore**: el archivo con tu clave de firma de Android. ⚠️ Si lo perdés, es un dolor de cabeza.
- **FCM / APNs**: los servicios de push de Google (Android) y Apple (iOS).
- **Env var** (variable de entorno): config que NO va en el código (claves, URLs). Vive en
  el hosting y en un archivo `.env` local que git ignora.
