# 08 · Monetización — cobrar sin reescribir la app

> **Qué vas a lograr:** entender cómo **encender** la monetización que ya está
> **cableada y apagada** en [`src/services/billing.ts`](../../src/services/billing.ts), y
> con qué costos y trampas. Al terminar este doc sabés cuáles son las tres vías (pagos web,
> compras in-app en las tiendas, y publicidad), cuál conviene arrancar y dónde exactamente
> se enchufa cada una en el código. **No vas a escribir un sistema nuevo: el andamiaje ya existe.**

**Antes de empezar leé:** [README de la carpeta](README.md) · el rail de monetización en
[`src/services/billing.ts`](../../src/services/billing.ts).

| | |
|---|---|
| ⏱️ Tiempo | Variable (según la vía; nada de esto es de un día) |
| 💰 Costo | Comisiones sobre lo que cobres (ver tabla). Integrar es gratis |
| 🧑 / 🤖 | Mitad **VOS** (cuentas Stripe/RevenueCat, precios, tiendas) y mitad 🤖 (enganchar `purchase()` y `AdSlot`) |

> ⚠️ **Esto es FASE 3: "cuando tengas usuarios y/o plata".** Convoyar **no necesita nada de
> esto para lanzar**. Monetizar antes de tener uso real es perder tiempo (y espantar gente).
> Volvé a este doc cuando haya tracción; hasta entonces, dejalo apagado y seguí con lo demás.

---

## El marco: ya está cableado, vos decidís cuándo prender

`services/billing.ts` es deliberadamente chico y **desconectado de la red**. Define tres
planes y unos helpers puros; ninguno cobra nada todavía. Encender la monetización es una
**decisión de negocio** (elegir modelo y precios) + un par de PRs para enchufar el proveedor,
**no** reescribir la app.

Lo que ya existe hoy:

| Pieza en `billing.ts` | Qué hace | Estado |
|---|---|---|
| `PlanId` = `"free" \| "pro" \| "org"` | Los tres planes | ✅ definido |
| `PLANS` | Specs de cada plan (límites, ads, `priceHint`) | ✅ definido |
| `can(plan, feature)` | Gate de features por plan | ✅ **activo** (gate real: `metricsExport`) |
| `shouldShowAds(plan)` | ¿muestro ads a este plan? | ✅ definido (depende de `ADS_ENABLED`) |
| `ADS_ENABLED` | Flag global de publicidad | ⚪ **`false`** (apagado) |
| `purchase(plan)` | Iniciar la compra | ⚪ **stub** (devuelve `{ ok: false }`) |
| `<AdSlot/>` | Slot donde iría el SDK de ads | ⚪ vacío hasta integrar |

Los tres planes de fábrica: **Free** (1 org, 30 miembros, con ads, `$0`), **Pro** (5 orgs,
150 miembros, sin ads, exporta métricas) y **Organización** (99 orgs, 1000 miembros, todo).
Hoy `pro` y `org` dicen `priceHint: "próximamente"` porque no hay caja conectada.

> 💡 **El único gate que hoy corta de verdad es `metricsExport`.** `can("free", "metricsExport")`
> devuelve `false`; `can("pro", …)` devuelve `true`. Es el ejemplo vivo de cómo se cierra una
> feature detrás de un plan: agregás la feature al tipo `GatedFeature`, la ponés en `PLANS`, y
> preguntás `can(planDelUsuario, "loQueSea")` en la UI. No toques el motor (`src/engine/`): la
> monetización es capa de producto, no de dominio.

---

## Las tres vías (y la gran trampa de las tiendas)

### Vía 1 — Pagos web con Stripe (suscripciones/planes desde el navegador) 🧑🤖

Para cobrar **Pro/Org** desde la **web** (no dentro de la app móvil), lo más simple:

1. 🧑 Creá una cuenta en **[stripe.com](https://stripe.com)**. Sin costo fijo, sin abono.
2. 🧑 En el dashboard, creá los **productos y precios** (ej. "Pro mensual", "Org anual").
3. 🧑 Usá **Payment Links** o **Checkout** (lo más rápido: Stripe te da la página de pago
   hecha, no manejás tarjetas vos). Menos código, menos riesgo, PCI cubierto por Stripe.
4. 🤖 **Webhook** → cuando Stripe confirma el pago, tu backend (una Edge Function de Supabase)
   escribe el plan del usuario en `member_settings.plan` (esa columna **ya existe** en el
   schema del [doc 01](01-supabase-base-de-datos.md)).
5. 🤖 Enganchá `purchase(plan)` en `billing.ts` para que redirija al Checkout/Payment Link.

💰 **Stripe cobra ~2,9 % + un fijo por transacción**, sin costo fijo mensual. Pagás solo
cuando cobrás.

### Vía 2 — Compras in-app en móvil ⚠️ (obligatorio usar la caja de la tienda)

⚠️ **REGLA DURA, leela dos veces:** si vendés **bienes o servicios digitales** (un plan Pro,
features desbloqueadas, "monedas") **dentro de la app móvil**, Apple y Google te **obligan** a
cobrar con **SU** sistema (Google Play Billing / Apple StoreKit) y se llevan **15–30 %**.
**No podés** meter Stripe para cobrar digital dentro de la app: te rechazan (o bajan) la app.
Stripe queda solo para la **web**.

- **Google Play Billing** (Android) y **Apple StoreKit** (iOS): dos SDKs distintos, dos
  consolas, dos catálogos de productos. Un dolor mantenerlos por separado.
- ✅ **Recomendado: [RevenueCat](https://revenuecat.com).** Unifica Play + Apple con **una sola
  integración**. Existe el plugin `@revenuecat/purchases-capacitor`: llamás `getCustomerInfo()`,
  mapeás el *entitlement* a un `PlanId` y listo. **Gratis** hasta ~USD 2,5k/mes de ingresos;
  después cobra un % chico. Es lo que menciona el comentario de cabecera de `billing.ts`.

> ⚠️ **La excepción de los bienes del mundo real.** Vender algo **físico/real** (ej. si algún
> día se cobrara un viaje de verdad entre personas) **NO** paga comisión de tienda. Pero eso
> abre otra lata enorme: pagos entre usuarios, retención, impuestos y **regulación de
> transporte**. **Fuera de alcance por ahora** — Convoyar coordina viajes, no los cobra.

### Vía 3 — Publicidad (`ADS_ENABLED = false` hoy) 🤖

- **AdMob** (móvil, vía plugin Capacitor `@capacitor-community/admob`) y **AdSense** (web).
- Encender = poner `ADS_ENABLED = true` en `billing.ts` + renderizar el SDK real dentro del
  componente `<AdSlot/>`. El helper `shouldShowAds(plan)` ya decide a quién mostrárselos
  (a `free` sí, a `pro`/`org` no).

> ⚠️ **Los ads en una app de comunidad chica rinden centavos** y ensucian la experiencia.
> Casi siempre conviene el modelo **freemium/Pro antes que ads**. Dejalos para el final, o nunca.

---

## Recomendación de estrategia para arrancar

1. **Mantené todo gratis** hasta tener uso real. En serio.
2. Cuando haya tracción, abrí un plan **Pro/Org** (para equipos y orgs grandes) con:
   - **Stripe** en la **web** (Vía 1).
   - **RevenueCat** en **móvil** (Vía 2), para no pelear con Play y Apple por separado.
3. **Ads al final o nunca** (Vía 3).

Un mismo usuario, un mismo `member_settings.plan`: cobres por web o por tienda, el plan
efectivo vive en Supabase y los gates (`can(...)`) lo leen igual.

---

## Puntos de integración concretos en el código

Todo cuelga de [`src/services/billing.ts`](../../src/services/billing.ts):

- **`purchase(plan)`** — hoy es un stub que devuelve `{ ok: false, message: "… no conectado" }`.
  Acá enchufás Stripe Checkout (web) o RevenueCat (móvil). Es el **único** punto que toca la red.
- **`can(plan, feature)`** — el gate. Ya corta `metricsExport`. Para cerrar una feature nueva,
  agregala a `GatedFeature` + `PLANS` y preguntá `can(...)` en la UI.
- **`<AdSlot/>` + `ADS_ENABLED`** — el slot y el flag de ads. Prendés el flag y metés el SDK adentro.
- **`member_settings.plan`** — el plan del usuario **debe persistirse en Supabase** (columna ya
  creada en el [doc 01](01-supabase-base-de-datos.md)), no en `localStorage`. El webhook de
  Stripe / el entitlement de RevenueCat escriben ahí; la app lo lee al cargar.

---

## Costos y comisiones (resumen)

| Vía | Quién cobra | Comisión / costo | Costo fijo |
|---|---|---|---|
| Stripe (web) | Stripe | ~2,9 % + fijo por transacción | USD 0 |
| Google Play Billing (Android) | Google | **15–30 %** de cada compra digital | USD 0 (aparte del alta de dev) |
| Apple StoreKit (iOS) | Apple | **15–30 %** de cada compra digital | USD 0 (aparte del alta de dev) |
| RevenueCat (unifica Play+Apple) | RevenueCat | **Gratis** hasta ~USD 2,5k/mes, luego % chico | USD 0 |
| AdMob / AdSense | Google | Se queda un % del ad revenue | USD 0 |

> 💡 El 15 % (no 30 %) de las tiendas aplica al **primer año** de suscripción por suscriptor y
> a devs chicos (programas *Small Business* de Apple y Google). Igual: es mucho más que el 2,9 %
> de Stripe web. Por eso lo digital conviene empujarlo por web cuando se pueda.

---

## ✅ Checklist de este doc

- [ ] Entendés que esto es **Fase 3** y que **nada** de acá bloquea el lanzamiento
- [ ] Sabés que la monetización ya está **cableada y apagada** en `billing.ts`
- [ ] Tenés claro que digital **dentro de la app móvil** ⚠️ **obliga** a la caja de la tienda (15–30 %)
- [ ] Stripe queda para **web**; RevenueCat unifica **Play + Apple** en móvil
- [ ] Sabés dónde se engancha: `purchase()`, `can()`, `<AdSlot/>` + `ADS_ENABLED`
- [ ] El plan del usuario se persiste en `member_settings.plan` (Supabase), no en `localStorage`
- [ ] Decidiste tu estrategia: gratis ahora → Pro/Org después → ads al final o nunca

---

## 🆘 Problemas comunes

- **"Apple/Google me rechazó la app por el pago"** → estás cobrando **digital** con Stripe
  dentro de la app móvil. Prohibido: usá Play Billing / StoreKit (o RevenueCat). Stripe solo web.
- **`purchase()` no hace nada** → es lo esperado hoy: es un **stub** que devuelve `{ ok: false }`.
  No está conectado hasta que enchufes Stripe/RevenueCat.
- **Prendí `ADS_ENABLED = true` y no aparecen ads** → falta integrar el SDK real dentro de
  `<AdSlot/>`. El flag solo habilita; no trae la red de ads solo.
- **El plan se resetea al cambiar de dispositivo** → lo estás guardando local. Tiene que vivir
  en `member_settings.plan` en Supabase (doc 01), escrito por el webhook/entitlement.
- **`can(...)` no corta una feature nueva** → agregala al tipo `GatedFeature` y al objeto
  `PLANS`; si no está ahí, `can()` no la conoce.

---

**Siguiente:** [09 · Ruteo OSRM](09-ruteo-osrm.md) → desvíos por calle real cuando el mock (haversine) no alcance.
