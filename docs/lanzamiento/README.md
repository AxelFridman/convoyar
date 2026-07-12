# 🚀 Lanzamiento de Convoyar — guía operativa paso a paso

> **Qué es esta carpeta.** Convoyar hoy funciona 100 % en el navegador, en un solo
> dispositivo, sin backend (todo vive en `localStorage`, ver [AGENTS.md](../../AGENTS.md)).
> Para lanzarlo **de verdad** —que dos personas en dos teléfonos vean la misma salida,
> que el login mande un email real, que esté en Google Play y App Store— hay que
> levantar infraestructura. Casi todo eso son cosas que **tenés que hacer vos con el
> mouse y a veces con la tarjeta** (crear cuentas, apretar botones en dashboards, pagar
> fees de las tiendas, subir archivos). Esta carpeta es tu checklist maestro: un
> documento detallado por cada pieza, en orden, pensado para el **free tier** pero
> **fácil de escalar** cuando tengas plata y usuarios.

> **Stack elegido:** Supabase (Postgres + Auth + Realtime) como backend, deploy web en
> Cloudflare Pages / Netlify, y las apps nativas con Capacitor a **Google Play** y **App Store**.

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
| Base de datos | ❌ `localStorage`, un dispositivo | ✅ Postgres en Supabase, multi-dispositivo → **[01](01-supabase-base-de-datos.md)** |
| Login / verificación de email | ❌ Código simulado (`LocalAuthProvider`) | ✅ OTP real por email → **[02](02-auth-real.md)** |
| Sync entre personas reales | ❌ Simulado (`scheduleSimulatedReply`) | ✅ Realtime de Supabase → **[03](03-conectar-la-app.md)** |
| Web en internet | ❌ Solo `localhost` | ✅ URL pública + PWA instalable → **[04](04-deploy-web-pwa.md)** |
| App en Google Play | ❌ Solo Capacitor configurado | ✅ Publicada → **[05](05-google-play.md)** |
| App en App Store | ❌ | ✅ Publicada → **[06](06-app-store-ios.md)** |
| Push notifications | ❌ Solo Notification API del navegador | ✅ FCM / APNs / Web Push → **[07](07-push-notifications.md)** |
| Monetización | ⚪ Cableada y **apagada** (`billing.ts`) | ⚪ Encendida cuando quieras → **[08](08-monetizacion.md)** |
| Ruteo por calle real | ⚪ Mock (haversine); adaptador OSRM escrito | ⚪ OSRM self-hosted (opcional) → **[09](09-ruteo-osrm.md)** |
| Errores / métricas de producto | ❌ Nada | ✅ Sentry + PostHog free → **[10](10-analytics-y-monitoreo.md)** |

✅ real · ❌ falta / mock · ⚪ opcional o para más adelante

---

## 📋 Orden recomendado (y por qué)

Hacelo en fases. Cada fase deja algo **usable y demostrable**; no necesitás hacer todo
de una. Si mañana te aburrís después de la Fase 1, ya tenés la app en internet con
usuarios reales.

### Fase 0 — Antes de empezar (30 min) 🧑
- Creá las cuentas gratis que vas a necesitar (todas free tier): [GitHub](https://github.com)
  (ya lo tenés), [Supabase](https://supabase.com), [Cloudflare](https://cloudflare.com).
- Instalá lo básico local: Node 20+, Git, y (para más adelante) Android Studio.

### Fase 1 — La app es real y está en internet (1 día) 💰 ~USD 0
1. **[01 · Supabase / base de datos](01-supabase-base-de-datos.md)** — creás el proyecto y la DB.
2. **[02 · Auth real](02-auth-real.md)** — login por email de verdad.
3. **[03 · Conectar la app](03-conectar-la-app.md)** — enchufás el front al backend (borra los mocks).
4. **[04 · Deploy web / PWA](04-deploy-web-pwa.md)** — sale a internet, instalable en el celu.
> 🎉 Al final de la Fase 1 ya podés mandarle el link a un amigo y ambos ven la misma salida.

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
| Dominio propio (ej. `convoyar.app`) | ~USD 12 / año | Opcional (queda más pro) |
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
- [ ] 🧑 Cuenta de Supabase creada y proyecto `convoyar-prod` levantado → [01](01-supabase-base-de-datos.md)
- [ ] 🧑 Schema SQL corrido y RLS activado → [01](01-supabase-base-de-datos.md)
- [ ] 🧑 Auth por email configurado + plantilla de email en español → [02](02-auth-real.md)
- [ ] 🧑 SMTP propio (Resend) conectado para que los mails no caigan en spam → [02](02-auth-real.md)
- [ ] 🤖 App conectada a Supabase (`.env`, cliente, repo remoto, mocks borrados) → [03](03-conectar-la-app.md)
- [ ] 🧑 Web deployada en Cloudflare Pages con las env vars de producción → [04](04-deploy-web-pwa.md)
- [ ] 🧑 (Opcional) Dominio propio apuntando a la web → [04](04-deploy-web-pwa.md)
- [ ] 🧑 **Probado con dos dispositivos distintos** que ven la misma salida ✅

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

- **PR5 `feat/account-comms`** dejó `services/auth.ts` con la interfaz `AuthProvider`
  lista para enchufar Supabase → ver **[02](02-auth-real.md)**.
- **PR7 `feat/server-skeleton`** planeaba un servidor propio con Postgres. Con Supabase
  **no lo necesitás para lanzar** (Supabase te da la DB y la API). El server propio queda
  como plan B / cuando quieras lógica de servidor pesada; lo aclaramos en [03](03-conectar-la-app.md).

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
- **PWA**: la web instalable como app. Ya la tenés; solo falta ponerla en internet.
- **Capacitor**: envuelve tu web en una app nativa Android/iOS. Ya está configurado (`app.convoyar`).
- **`.aab`**: Android App Bundle, el formato que subís a Google Play (no `.apk`).
- **Keystore**: el archivo con tu clave de firma de Android. ⚠️ Si lo perdés, es un dolor de cabeza.
- **FCM / APNs**: los servicios de push de Google (Android) y Apple (iOS).
- **Env var** (variable de entorno): config que NO va en el código (claves, URLs). Vive en
  el hosting y en un archivo `.env` local que git ignora.
