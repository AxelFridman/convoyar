# 10 · Analytics y monitoreo — enterate qué pasa

> **Qué vas a lograr:** ojos en producción desde el día 1. Vas a saber **cuándo algo
> explota** en el celular de un usuario (errores/crashes → Sentry), **qué hace la gente**
> en la app (analytics de producto → PostHog) y **si la web sigue viva** (uptime →
> UptimeRobot). Todo en free tier, USD 0, y sin mandar un solo dato personal a terceros.

**Antes de empezar leé:** [README de la carpeta](README.md) · el modelo de datos en
[`src/state/model.ts`](../../src/state/model.ts) (para saber qué es PII y qué no).

| | |
|---|---|
| ⏱️ Tiempo | ~1 h (las tres cosas) |
| 💰 Costo | USD 0 (free tier de las tres) |
| 🧑 / 🤖 | Mitad y mitad: las cuentas y dashboards **VOS**; la integración en el front la hace Claude en una PR 🤖 |

---

## ⏱️ Hacelo TEMPRANO (aunque figure en Fase 3)

En el [README](README.md) esto está en la **Fase 3 (cuando tengas tracción)**, pero el
consejo real es: **conectalo apenas la web esté en internet (después del [doc 04](04-deploy-web-pwa.md))**.
¿Por qué? Es gratis, se instala en un rato, y desde el minuto cero del lanzamiento vas a
querer saber si la app se rompe o si la gente abandona en el onboarding. Enterarte tarde
de un crash es perder a tus primeros usuarios, que son los más valiosos.

Son **tres cosas distintas**, no las confundas: **errores ≠ analytics ≠ uptime**.

---

## Parte 1 — Errores / crashes → Sentry 🧑🤖 ⏱️ 20 min 💰 USD 0

Sentry te avisa cuando algo tira una excepción en el navegador o la app de un usuario, con
el stack trace y en qué versión pasó. El free tier aguanta **~5.000 errores/mes**, de sobra
para arrancar.

**🧑 VOS (dashboard):**
1. Creá cuenta en **[sentry.io](https://sentry.io)**.
2. **Create Project** → plataforma **React**.
3. Copiá el **DSN** que te da (es una URL tipo `https://xxx@xxx.ingest.sentry.io/xxx`).

**🤖 CÓDIGO (PR de Claude):**
1. Instalar el SDK: `npm i @sentry/react`.
2. Poner el DSN en la env var **`VITE_SENTRY_DSN`** (en `.env` local y en el hosting; nunca en git).
3. Inicializar lo antes posible (en `src/main.tsx`, antes de montar React):

```ts
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,            // ⚠️ clave: no mandar PII (ver Parte 4)
    tracesSampleRate: 0.1,            // 10% de transacciones alcanza para el free tier
  });
}
```

4. Envolver la app con el error boundary de Sentry para capturar los crashes de render:

```tsx
<Sentry.ErrorBoundary fallback={<p>Algo salió mal. Ya estamos avisados.</p>}>
  <App />
</Sentry.ErrorBoundary>
```

> 💡 **Apps nativas (Capacitor).** Para los crashes de Android/iOS hay
> [`@sentry/capacitor`](https://docs.sentry.io/platforms/javascript/guides/capacitor/),
> que captura también los cascotazos nativos. Sumalo cuando encares los docs
> [05](05-google-play.md) / [06](06-app-store-ios.md); en la web con `@sentry/react` alcanza.

---

## Parte 2 — Analytics de producto → PostHog 🧑🤖 ⏱️ 20 min 💰 USD 0

Esto responde **qué hace la gente**: cuántos completan el onboarding, cuántos crean una
salida, dónde se caen del embudo. PostHog cloud es free hasta **~1M eventos/mes** (y si
querés, se puede **self-hostear** gratis).

**🧑 VOS:** creá cuenta en **[posthog.com](https://posthog.com)** → copiá el **Project API Key**.

**🤖 CÓDIGO:** `npm i posthog-js`, con la key en **`VITE_POSTHOG_KEY`**, e inicializar:

```ts
import posthog from "posthog-js";

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",   // no perfiles de anónimos
  });
}
```

**Trackeá los eventos clave del embudo** (poné el `posthog.capture(...)` en cada acción):

| Evento | Cuándo |
|---|---|
| `onboarding_completed` | terminó el wizard de alta |
| `event_created` | creó una salida |
| `join_requested` | apretó "pedir lugar" (modo público) |
| `request_accepted` | un admin aceptó una solicitud |
| `trip_rated` | calificó un viaje (1–5★) |

Con esos cinco ya ves el embudo entero: alta → crea → pide → lo aceptan → califica.

> 💡 **Alternativas** si PostHog te queda grande: **[Plausible](https://plausible.io)**
> (privacy-first, simplísimo, pago) o **[Umami](https://umami.is)** (self-host gratis). Las
> tres respetan mejor la privacidad que Google Analytics; para este proyecto, cualquiera de
> ellas antes que GA.

---

## Parte 3 — Uptime (¿está viva la web?) → UptimeRobot 🧑 ⏱️ 10 min 💰 USD 0

Un monitor externo que **pingea tu URL pública cada 5 min** y te manda un mail/notif si se
cae. Es 100 % dashboard, **no toca el código**.

1. Cuenta en **[UptimeRobot](https://uptimerobot.com)** (o **[Better Stack](https://betterstack.com)**).
2. **Add New Monitor** → tipo **HTTP(s)** → tu URL de producción (la del [doc 04](04-deploy-web-pwa.md)).
3. Intervalo 5 min, alertas a tu mail. Listo.

> 💡 Sirve sobre todo por lo que vimos en el [doc 01](01-supabase-base-de-datos.md): **Supabase
> Free pausa el proyecto tras 7 días sin actividad**. Un monitor de uptime te avisa al toque
> si la app dejó de responder porque el backend se durmió.

---

## Parte 4 — ⚠️ Privacidad: NO mandes PII a estas herramientas

Este es el punto más importante del doc. Convoyar es **privacidad por diseño**, y eso vale
**también para la telemetría**. Sentry y PostHog son terceros: todo lo que les mandás sale
de tu control.

- ⚠️ **Nunca** mandes domicilios (`home`), emails ni nombres a Sentry ni a PostHog. El
  `home` es el dato más sensible del modelo (invariante de privacidad #6, ver [doc 01](01-supabase-base-de-datos.md)).
- **Anonimizá el user id:** identificá a la persona por su **`member id`** (`m0`, `m1`…),
  **nunca por el email**. Así podés seguir un embudo sin exponer quién es.
- En Sentry: `sendDefaultPii: false` (ya está arriba) y revisá los `beforeSend` para
  scrubbear cualquier payload que arrastre datos.
- En PostHog: `person_profiles: "identified_only"` y no pases props con nombres/mails.
- **Consentimiento:** sumá un aviso de privacidad y, si vas a la UE, un opt-in real. PostHog
  y Sentry permiten arrancar apagados hasta que el usuario acepte.

> ⚠️ Regla simple: si un dato podría identificar a una persona o su casa, **no viaja** a la
> telemetría. Ante la duda, no lo mandes.

---

## La base de datos ya viene observada 🧠

**No necesitás una herramienta extra para el backend.** Supabase te da observabilidad de la
DB/API en su propio dashboard: **Logs** (Postgres, Auth, API, Realtime) y **Reports** (uso,
queries lentas, egress). Miralo ahí. Sentry/PostHog son para el **front y el producto**;
para la salud de la base, el panel de Supabase alcanza y sobra.

---

## Seguridad antes de escalar 🔒

Antes de abrir la app a mucha gente, dos cosas:

- Corré el comando **`/security-review`** que ya tiene el proyecto, para auditar los cambios
  de seguridad antes de crecer.
- **Revisá las policies RLS** del [doc 01](01-supabase-base-de-datos.md): son "una base
  sólida, no una auditoría". Con datos de miles de usuarios, verificá que nadie lea lo que no
  le corresponde (sobre todo `member_home`).

---

## 💰 Costo y cuándo empezás a pagar

| Herramienta | Free tier | Cuándo pagás |
|---|---|---|
| Sentry | ~5k errores/mes | Mucho volumen de errores → planes desde ~USD 26/mes |
| PostHog | ~1M eventos/mes | Superás 1M eventos/mes (o self-host para seguir en USD 0) |
| UptimeRobot | 50 monitores, cada 5 min | Chequeos más frecuentes / más monitores |

Para el lanzamiento y los primeros miles de usuarios: **USD 0 las tres**. Recién con
tracción real vas a rozar los límites, y ahí ya tenés ingresos o inversión para bancarlo.

---

## ✅ Checklist de este doc

- [ ] 🧑 Cuenta de Sentry + proyecto React creado, DSN copiado
- [ ] 🤖 `@sentry/react` inicializado con `VITE_SENTRY_DSN` y `sendDefaultPii: false`
- [ ] 🤖 App envuelta en `Sentry.ErrorBoundary`
- [ ] 🧑 Cuenta de PostHog + `VITE_POSTHOG_KEY` en el hosting
- [ ] 🤖 Los 5 eventos del embudo se trackean (`onboarding_completed` … `trip_rated`)
- [ ] 🧑 Monitor de uptime apuntando a la URL pública
- [ ] ⚠️ Verificado que **no** viaja PII: user id = `member id`, sin emails/nombres/`home`
- [ ] 🧑 Aviso de privacidad / consentimiento contemplado
- [ ] 🧑 Panel de Logs/Reports de Supabase revisado
- [ ] 🧑 `/security-review` corrido y RLS del doc 01 repasado antes de escalar

---

## 🆘 Problemas comunes

- **No llega ningún error a Sentry** → el `if (import.meta.env.VITE_SENTRY_DSN)` es falso:
  la env var no está cargada en el hosting. Confirmá que la definiste en el panel de deploy
  ([doc 04](04-deploy-web-pwa.md)) y que rebuildeaste.
- **PostHog muestra montones de usuarios anónimos** → normal si no identificás; usá
  `posthog.identify(memberId)` (con el `member id`, **no** el email) tras el login.
- **Me asusté: ¿estoy mandando datos personales?** → entrá a un evento en Sentry/PostHog y
  mirá el payload. Si ves un email, nombre o coordenadas de casa, cortalo con `beforeSend`
  (Sentry) o dejando de pasar esa prop (PostHog).
- **UptimeRobot me avisa de caídas de madrugada** → suele ser el proyecto Supabase pausado
  por inactividad (free tier). Reactivalo o pasá a Pro ([doc 01](01-supabase-base-de-datos.md)).

---

**Volvé al [README](README.md)** para el checklist maestro de lanzamiento.
