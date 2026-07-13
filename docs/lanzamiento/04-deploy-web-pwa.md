# 04 · Deploy web / PWA — la app en internet

> **Qué vas a lograr:** tu app, hoy encerrada en `localhost`, servida en una URL pública
> con HTTPS, gratis, que se **redeploya sola** cada vez que hacés push a `main`, y que se
> **instala como PWA** en el celu (ícono en la pantalla de inicio, arranca a pantalla
> completa). El manifest y el service worker **ya existen** en el repo
> ([`public/manifest.webmanifest`](../../public/manifest.webmanifest) y
> [`public/sw.js`](../../public/sw.js)) — no hay que crearlos. Solo falta poner el build
> estático en internet y decirle al hosting dos cosas: cómo buildear y dónde están las
> claves de Supabase.

**Antes de empezar leé:** [README de la carpeta](README.md). Este doc **depende de**
[03 · Conectar la app](03-conectar-la-app.md) (que arma el código que lee las env vars) y
de [01 · Supabase](01-supabase-base-de-datos.md) (de donde salen las claves que vas a pegar).

| | |
|---|---|
| ⏱️ Tiempo | ~30 min (sin dominio) · +20 min con dominio propio |
| 💰 Costo | USD 0 (Free tier) · dominio propio opcional ~USD 12/año |
| 🧑 / 🤖 | Casi todo **VOS** (dashboard de Cloudflare). Un solo archivo nuevo en el repo (🤖). |

> ### 📍 Estado (2026-07-12): ✅ LIVE en https://convoyar-web.pages.dev
> Ya está deployado y sirviendo la app (lo verifiqué: HTTP 200). Cómo se resolvió:
> - El intento inicial era un **Worker** (deploy con `npx wrangler deploy`) y fallaba con
>   *"Vite 5.4.21 cannot be automatically configured, update to 6.0.0"*. **No actualizamos Vite**
>   (rompería los tests): se hizo con **Cloudflare Pages**, que sirve `dist/` sin wrangler ni Vite 6.
> - Se creó el proyecto **`convoyar-web`** y se subió por CLI (**direct upload**):
>   ```bash
>   npm run build
>   npx wrangler pages deploy dist --project-name convoyar-web --branch main
>   ```
>   (con `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` del `.env`). Repetí esos 2 comandos
>   para re-deployar cuando cambies algo.
>
> **Lo que falta:** (a) apuntar `convoyar.com` a este proyecto Pages (ver Paso 6, y borrar el
> Worker viejo que hoy muestra "Hello world"); (b) cuando exista el cliente Supabase
> ([doc 03](03-conectar-la-app.md)), **rebuildear** con las env vars **prod** — en este flujo
> por CLI las `VITE_*` se hornean **en tu máquina al buildear** (desde `.env`), no en el panel.
>
> 💡 Si preferís **auto-deploy en cada push**, en el dashboard podés crear un Pages con
> **Connect to Git** (repo `AxelFridman/convoyar`, build `npm run build`, output `dist`) — ahí
> sí las env vars van en el panel. El CLI de arriba es el atajo manual que ya te dejó la web viva.

> ### ⚠️ Worker vs Pages (por qué el 404)
> Cloudflare tiene dos productos que se confunden. Para este proyecto querés **Pages**:
> **Workers & Pages → Create → Pages → Connect to Git**. Si lo que creaste fue un **Worker**
> (te quedó una URL `*.workers.dev`), lo más limpio es **borrarlo y crear un Pages** apuntando
> al repo `AxelFridman/convoyar` con Build `npm run build` y output `dist`. El `*.pages.dev`
> resultante sí sirve tu app. (Los Workers también pueden servir estáticos, pero es más
> vueltero; no te compliques.)

---

## ¿Por qué Cloudflare Pages?

El build de Convoyar es **estático** (`npm run build` escupe HTML + JS + CSS en `dist/`).
No necesitás un servidor Node prendido; solo alguien que sirva archivos rápido. Los tres
grandes gratuitos hacen eso bien, pero recomendamos **Cloudflare Pages**:

- **Gratis de verdad:** ancho de banda **ilimitado** en el free tier (Netlify y Vercel
  cortan en 100 GB/mes).
- **Sin cold start:** es CDN pura, no una función que se duerme.
- **Build desde GitHub:** conectás el repo y listo; cada push buildea y publica.
- HTTPS y CDN global automáticos, y la cuenta ya la creaste en la Fase 0.

**Alternativas equivalentes** (mismos pasos, otro panel): **Netlify** (free: 100 GB/mes,
soporta el mismo `_redirects`) y **Vercel** (free: 100 GB/mes, muy pulido para Vite). Si ya
tenés cuenta en una de esas, sirve igual. Este doc usa Cloudflare como camino principal.

> **Filosofía:** free tier primero, fácil de escalar. Para una web estática, el tráfico que
> te haría pagar es astronómico. Vas a pagar Supabase mucho antes que el hosting web.

---

## Paso 1 — El fallback de SPA 🤖 CÓDIGO ⏱️ 2 min ⚠️ NO TE LO SALTEES

Convoyar es una **Single Page App**: el ruteo lo maneja React en el navegador, no el
servidor. Si alguien entra directo a `tuapp.com/evento/123` o **refresca** en una ruta
profunda, el hosting busca un archivo `/evento/123` que no existe → **404**.

La solución es decirle al hosting: "cualquier ruta, servime `index.html` y dejá que React
resuelva". Eso se hace con un archivo `public/_redirects` (Vite lo copia tal cual a `dist/`):

```
/*    /index.html   200
```

El `200` es clave: es un *rewrite* (servís el index pero mantenés la URL), no un redirect
301. Funciona igual en **Cloudflare Pages** y en **Netlify**.

> ⚠️ Sin esto, la home anda pero refrescar en cualquier subruta tira 404. Es el error más
> común de deploy de SPAs. Este archivo lo agrega Claude en una PR (o lo creás vos: es una
> línea). En **Vercel** el equivalente es un `vercel.json` con un rewrite — si vas por ahí,
> avisá y se ajusta.

---

## Paso 2 — Crear la cuenta y conectar el repo 🧑 ⏱️ 10 min

1. Andá a **[dash.cloudflare.com](https://dash.cloudflare.com)** → creá la cuenta gratis
   (o logueate, ya la hiciste en la Fase 0).
2. En el menú lateral: **Workers & Pages → Create → Pages → Connect to Git**.
3. Autorizá a Cloudflare a ver tu GitHub y elegí el repo **`AxelFridman/caravana`**.
4. En **Set up builds and deployments** completá:

| Campo | Valor |
|---|---|
| **Production branch** | `main` |
| **Framework preset** | `Vite` (si no aparece, dejá `None`) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | dejalo vacío (el repo raíz) |

> ⚠️ **No pongas `dist-single` como output.** Ese es de `build:single`, que es otra cosa
> (ver Paso 5). El deploy web va a `dist`.

Todavía **no** le des a "Save and Deploy": primero cargá las env vars (Paso 3), o el primer
build va a fallar al no encontrar las claves de Supabase.

---

## Paso 3 — Variables de entorno de producción 🧑 ⏱️ 5 min

El código del [doc 03](03-conectar-la-app.md) lee dos variables para conectarse a Supabase.
En Cloudflare: **Settings → Environment variables → Production → Add variable**:

| Variable | Valor (de tu `.env`, PROD) | Nombre en tu `.env` |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://qlcwluvhrbkwjkjigsog.supabase.co` | `SUPABASE_LINK_PROD` |
| `VITE_SUPABASE_ANON_KEY` | tu `sb_publishable_...` (empieza así) | `SUPABASE_PUBLISHABLE_KEY_PROD` |

> ⚠️ **Los nombres NO coinciden con tu `.env` a propósito.** Tu `.env` los tiene como
> `SUPABASE_LINK_PROD` / `SUPABASE_PUBLISHABLE_KEY_PROD` (útiles para tooling), pero **Vite solo
> expone al navegador las que empiezan con `VITE_`**. Por eso en Cloudflare creás las variables
> con el nombre **`VITE_SUPABASE_URL`** y **`VITE_SUPABASE_ANON_KEY`** y les pegás esos valores.
> Y **jamás** pongas el `sb_secret_...` acá (bypassa RLS).

Puntos que **tenés que** entender:

- **Solo la `anon` (pública).** ⚠️ **NUNCA** pegues acá la `service_role`. La `anon` es
  pública a propósito; la seguridad la da RLS (doc 01, Paso 4), no esconder la clave.
- **Tienen que empezar con `VITE_`.** Vite solo expone al navegador las variables con ese
  prefijo. Sin él, `import.meta.env` no las ve y quedan `undefined`.
- **Quedan embebidas en el bundle.** Vite las *hornea* en el JS que baja el usuario:
  cualquiera puede leerlas con F12. Por eso **solo van claves públicas**. Esto es normal y
  correcto para una anon key; no lo es para un secreto.

> 💡 Si tenés `convoyar-dev` y `convoyar-prod` en Supabase (doc 01), podés cargar las claves
> de `dev` en el scope **Preview** y las de `prod` en **Production**. Así las ramas de prueba
> pegan a la base de dev y no ensucian producción.

Ahora sí: **Save and Deploy**. El primer build tarda ~2 min. Al terminar tenés una URL tipo
`https://caravana.pages.dev`. Abrila: ya está en internet. 🎉

---

## Paso 4 — Auto-deploy y previews 🧑 ⏱️ 0 min (ya funciona)

- **Cada push a `main` redeploya solo.** Hacés `git push`, Cloudflare buildea y publica en
  ~2 min. No tenés que tocar nada más nunca.
- **Preview deploys por rama:** cada rama (y cada PR) genera su **propia URL temporal**
  (`https://<hash>.caravana.pages.dev`) con ese código, sin pisar producción. Ideal para
  probar una feature en el celu antes de mergear, o para mandarle un preview a alguien.
- El estado de cada build (verde/rojo, logs) lo ves en **Workers & Pages → caravana →
  Deployments**.

---

## Paso 5 — Instalarla como PWA (probá en el celu) 🧑 ⏱️ 3 min

El manifest y el service worker ya están en el repo, así que el deploy **ya es una PWA
instalable**. Confirmalo en un teléfono real (no solo en la compu):

1. Abrí la URL (`caravana.pages.dev` o tu dominio) en el celu.
2. **Android/Chrome:** menú ⋮ → **"Agregar a pantalla de inicio"** / "Instalar app".
   **iOS/Safari:** botón Compartir → **"Agregar a pantalla de inicio"**.
3. Debería aparecer el ícono, abrir a pantalla completa (sin barra del navegador) y andar.

> ⚠️ **`build:single` NO es para hosting web.** `npm run build:single` genera
> `dist-single/index.html`, un archivo único autocontenido (todo el JS/CSS inline) pensado
> para **mandar por mail o hacer una demo offline** sin servidor. No lo subas a Cloudflare:
> para web va **`npm run build` → `dist/`**, que es lo que configuraste en el Paso 2.

> 💡 Si actualizás la app y el celu sigue mostrando la versión vieja, es el service worker
> cacheando. Cerrá y reabrí la PWA, o borrá el caché del sitio. La estrategia de cache está
> en [`public/sw.js`](../../public/sw.js).

---

## Paso 6 — Dominio propio (OPCIONAL) 🧑 💰 ~USD 12/año ⏱️ 20 min

`caravana.pages.dev` funciona perfecto para lanzar. Un dominio propio (ej. `convoyar.app`)
queda más profesional pero **no es obligatorio**.

1. **Comprá el dominio.** Podés hacerlo en el propio **Cloudflare → Domain Registration**
   (lo vende al costo, ~USD 10–12/año para `.app`) o en cualquier registrador.
2. Si lo comprás **en Cloudflare**: andá a **Pages → caravana → Custom domains → Set up a
   domain**, escribí `convoyar.app`, y Cloudflare configura el **DNS y el HTTPS solos**
   (registrador y hosting son la misma cuenta). Cero fricción.
3. Si el dominio está **en otro registrador**: agregá el dominio en Custom domains y
   Cloudflare te dice qué poner. Dos caminos:
   - Apuntar los **nameservers** del dominio a los de Cloudflare (control total del DNS), o
   - Dejar un **CNAME** de `www` (o del dominio) hacia `caravana.pages.dev`.
4. El certificado HTTPS lo emite Cloudflare gratis; tarda unos minutos en propagar.

> 💡 `.app` y `.dev` fuerzan HTTPS a nivel navegador (preload HSTS), así que ni siquiera hay
> forma de servir la app insegura. Buen default para una PWA.

---

## Costos y cuándo pagarías 💰

| Concepto | Costo |
|---|---|
| Cloudflare Pages (web estática) | **USD 0** — ancho de banda ilimitado, builds gratis (límite práctico: 500 builds/mes) |
| Dominio propio | ~USD 12/año (opcional) |

**¿Cuándo pagás?** Por tráfico web estático, prácticamente **nunca**. El free tier de Pages
no tiene tope de ancho de banda; el único límite real es **500 builds/mes** (o sea ~16 pushes
por día, todos los días), y si lo cruzás el plan pago arranca en USD 5/mes. En la práctica el
gasto de infra va a venir de **Supabase** (doc 01), no de acá. Netlify/Vercel sí cobran pasados
los 100 GB/mes de tráfico, por eso preferimos Cloudflare.

---

## ✅ Checklist de este doc

- [ ] 🤖 `public/_redirects` con `/*  /index.html  200` en el repo
- [ ] 🧑 Proyecto de Pages creado y conectado a `AxelFridman/caravana`
- [ ] 🧑 Build command = `npm run build`, output = `dist`, preset Vite/None
- [ ] 🧑 `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cargadas en Production
- [ ] 🧑 Confirmado que **no** pegaste la `service_role`
- [ ] 🧑 Primer deploy en verde, URL pública abre bien
- [ ] 🧑 Refrescar en una ruta profunda **no** tira 404 (fallback SPA anda)
- [ ] 🧑 Instalada como PWA en un celu real ("Agregar a pantalla de inicio")
- [ ] 🧑 (Opcional) Dominio propio apuntando con HTTPS

---

## 🆘 Problemas comunes

- **El build falla con "supabaseUrl is required" o env `undefined`** → las variables no
  están cargadas, o no empiezan con `VITE_`, o las pusiste en el scope equivocado
  (Preview vs Production). Reordená y volvé a deployar.
- **La home anda pero refrescar en `/evento/123` tira 404** → falta `public/_redirects`
  (Paso 1), o lo pusiste fuera de `public/` y no llegó a `dist/`.
- **Cambié una env var y sigue igual** → las env se hornean **en build time**. Tenés que
  **redeployar** (Deployments → Retry deployment) para que tome el valor nuevo.
- **Subí `dist-single` sin querer y no carga bien** → ese es el build de demo por mail.
  Cambiá el output directory a `dist` y el command a `npm run build`.
- **La PWA no ofrece "Instalar"** → tiene que ser HTTPS (Pages ya lo es) y cargar el manifest.
  Revisá en DevTools → Application → Manifest que no haya errores.

---

🎉 **Fin de la Fase 1.** Convoyar ya es una app real en internet: base de datos en la nube,
login por email de verdad, sync entre personas y una URL instalable en el celu. Mandale el
link a un amigo y ambos ven la misma salida. Cuando quieras llevarla a las tiendas, seguís
con la Fase 2.

**Siguiente:** [05 · Google Play](05-google-play.md) → publicar la app en Android.
