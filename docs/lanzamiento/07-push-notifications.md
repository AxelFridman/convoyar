# 07 · Push notifications (avisos reales)

> **Qué vas a lograr:** que a la persona le **llegue un aviso al celular aunque la app esté
> cerrada** ("¡te aceptaron en la Escapada al Delta!", "tenés un mensaje nuevo"). Hoy
> `services/notify.ts` usa la Notification API del navegador, que **solo funciona con la app
> abierta** — no es push de verdad. Este doc conecta push real en Android, iOS y web.

**Antes:** doc [01](01-supabase-base-de-datos.md) (ya creaste la tabla `device_tokens`) y
tener las apps nativas armadas (docs [05](05-google-play.md)/[06](06-app-store-ios.md)).

| | |
|---|---|
| ⏱️ Tiempo | ~2–3 h (Firebase + plugin + Edge Function) |
| 💰 Costo | USD 0 (FCM y APNs son gratis) |
| 🧑 / 🤖 | Firebase/Apple = **VOS**; el código del plugin y el sender = **CÓDIGO** |

> ### 📍 Estado (2026-07-13): 🟡 credenciales listas, falta el código
> **Ya tenés el proyecto Firebase `convoyar-940ec` creado** y sus credenciales en
> [`.env`](../../.env): `firebaseConfig` web completo (`VITE_FIREBASE_*`), VAPID (web push),
> `google-services.json` (Android) y el **service account admin** (sender). La tabla
> `device_tokens` ya existe en la base ([doc 01](01-supabase-base-de-datos.md) ✅).
> **Lo que falta es 100% código** (Pasos 4–5: plugin + `registerPush` + Edge Function
> `send-push`), y conviene hacerlo **después del [doc 03](03-conectar-la-app.md)** (el push se
> apoya en el login/`meId` real). El push real solo se puede *probar* con la app corriendo en
> un dispositivo — no antes.
>
> ⚠️ El service account (`convoyar-940ec-df257ecbfdb6.json`) es **admin total**: está
> gitignoreado; su lugar final son los *secrets* de la Edge Function de Supabase, no el repo.

---

## Cómo funciona el push (el modelo mental)

Push real tiene **tres piezas**:

```
1) El teléfono se REGISTRA y recibe un "token" único  ──►  lo guardás en device_tokens (Supabase)
2) Pasa algo (te aceptan, te escriben) → se crea una fila en notifications
3) Un SENDER (Edge Function) lee los tokens del destinatario y los manda por FCM/APNs ──► ping en el celu
```

**El sender unificado = Firebase Cloud Messaging (FCM).** FCM manda a **Android**, y también a
**iOS** (subiéndole una clave de Apple) y a **web**. Una sola integración para todo. Gratis.

Lo elegante: tu app **ya crea filas en `notifications`** (el `diffNotifs` del store). Vamos a
enganchar el push a **cada insert en esa tabla**, así todo aviso in-app también dispara un push.

---

## Paso 1 — Proyecto Firebase 🧑 ⏱️ 15 min

1. **[console.firebase.google.com](https://console.firebase.google.com)** → **Add project**
   (`convoyar`). Es gratis; no necesitás el plan Blaze para FCM básico.
2. En el proyecto vas a agregar una "app" por plataforma (Android, iOS, web) en los pasos que siguen.

---

## Paso 2 — Android (FCM) 🧑🤖 ⏱️ 20 min

1. Firebase → Add app → **Android**. Package name: **`app.convoyar`**.
2. Descargá **`google-services.json`** y ponelo en **`android/app/google-services.json`** 🤖.
3. Instalá el plugin de Capacitor:
   ```bash
   npm i @capacitor/push-notifications
   npx cap sync android
   ```
4. Capacitor + el plugin agregan lo que hace falta en Gradle. Si te pide el plugin de
   `google-services`, seguí el mensaje (agregar el classpath en el `build.gradle` del proyecto).

---

## Paso 3 — iOS (APNs vía FCM) 🧑 ⏱️ 30 min (en la Mac)

⚠️ El push en iOS necesita una **clave APNs** y un **iPhone real** (el simulador no recibe push).

1. En **developer.apple.com → Certificates, IDs & Profiles → Keys** → creá una **APNs Auth
   Key** (archivo `.p8`). Guardá el archivo, el **Key ID** y tu **Team ID**.
2. En Firebase → Project Settings → **Cloud Messaging → Apple app config** → subí el `.p8`
   con su Key ID y Team ID.
3. Firebase → Add app → **iOS**, Bundle ID `app.convoyar` → descargá **`GoogleService-Info.plist`**
   → ponelo en **`ios/App/App/`** 🤖.
4. En Xcode agregá la capability **Push Notifications** (y **Background Modes → Remote
   notifications**) — ver [doc 06 · Paso 4](06-app-store-ios.md).
5. `npx cap sync ios`.

---

## Paso 4 — Registrar el token en el cliente 🤖

`services/notify.ts` hoy tiene `requestNotifPermission()` y `systemNotify()`. Agregá el
registro de push nativo (y guardá el token en Supabase). Esqueleto:

```ts
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabaseClient";

export async function registerPush(meId: string) {
  if (!Capacitor.isNativePlatform()) return registerWebPush(meId); // web: Paso 6 (opcional)

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;
  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    const platform = Capacitor.getPlatform() as "android" | "ios";
    await supabase.from("device_tokens").upsert(
      { member_id: meId, token: token.value, platform },
      { onConflict: "token" }
    );
  });

  // App abierta: mostramos el aviso in-app (systemNotify) para no molestar con banner del SO
  PushNotifications.addListener("pushNotificationReceived", (n) => {
    systemNotify(n.title ?? "Convoyar", n.body ?? "");
  });
}
```

Llamá `registerPush(meId)` después del login (donde ya activás notificaciones en el onboarding).
El token se guarda en `device_tokens` (con RLS self-only del [doc 01](01-supabase-base-de-datos.md)).

---

## Paso 5 — El sender: Edge Function que dispara el push 🤖

Creá una Edge Function (`supabase functions new send-push`) que se ejecute **cuando se
inserta una fila en `notifications`** y mande push a los dispositivos del destinatario:

```ts
// supabase/functions/send-push/index.ts (Deno)
// Disparada por un Database Webhook: Database → Webhooks → on INSERT en public.notifications
import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async (req) => {
  const { record } = await req.json();               // la fila nueva de notifications
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

  // 1) ¿el usuario quiere este tipo de aviso? (member_settings.notif_prefs)
  const { data: s } = await admin.from("member_settings")
    .select("notif_prefs").eq("member_id", record.member_id).single();
  // (chequear s?.notif_prefs.assignments / requests / chat según el tipo)

  // 2) tokens del destinatario
  const { data: tokens } = await admin.from("device_tokens")
    .select("token").eq("member_id", record.member_id);
  if (!tokens?.length) return new Response("no tokens");

  // 3) mandar por FCM HTTP v1 (auth con service account de Firebase, guardada en secrets)
  for (const t of tokens) {
    await sendFcm(t.token, record.title, record.body);   // implementá sendFcm con el access token de Firebase
  }
  return new Response("ok");
});
```

- La **service account de Firebase** (JSON de Project Settings → Service accounts) y la
  `SERVICE_ROLE_KEY` van como **secrets** de la función (`supabase secrets set ...`),
  ⚠️ **nunca** en el cliente.
- Conectá el disparo con **Database → Webhooks → INSERT en `public.notifications`** apuntando
  a la función. Así, cada aviso que ya genera tu store se convierte en un push automáticamente.
- Respetá `notif_prefs` (assignments/requests/chat) antes de enviar: es la preferencia por
  canal que la PR5 dejó en el modelo.

> 💡 FCM HTTP v1 pide un access token OAuth armado desde la service account. Hay libs para
> Deno/Node que lo hacen en 3 líneas; o usás el SDK admin de Firebase desde la función.

---

## Paso 6 — Web push (opcional) 🤖

Para la PWA en el navegador podés usar **FCM Web** (necesita una **VAPID key** de Firebase y
lógica en el service worker `public/sw.js`). Funciona en Chrome/Android y en iOS 16.4+ **solo
si la PWA está instalada**. Es más quisquilloso que el nativo: dejalo para después del push
móvil. Mientras tanto, en web seguís con la Notification API que ya tenés (app abierta).

---

## 💰 Costos y escala

- **FCM: gratis**, con límites altísimos (millones de mensajes). No vas a pagar por push.
- **APNs: gratis** (viene con tu Apple Developer del [doc 06](06-app-store-ios.md)).
- Edge Functions de Supabase: incluidas en el free tier (con cupo de invocaciones generoso).

---

## ✅ Checklist de este doc

- [ ] Proyecto Firebase creado
- [ ] Android: `google-services.json` en `android/app/`, plugin instalado
- [ ] iOS: clave APNs `.p8` subida a Firebase, `GoogleService-Info.plist` en `ios/App/App/`, capability Push en Xcode
- [ ] `@capacitor/push-notifications` instalado y `registerPush()` guardando el token en `device_tokens`
- [ ] Edge Function `send-push` desplegada, con service account y `SERVICE_ROLE_KEY` en secrets
- [ ] Database Webhook: INSERT en `notifications` → `send-push`
- [ ] `notif_prefs` respetadas antes de enviar
- [ ] Probado en **teléfono real** (Android e iOS): con la app cerrada llega el aviso ✅

---

## 🆘 Problemas comunes

- **No llega nada en iOS** → falta la clave APNs en Firebase, la capability Push en Xcode, o
  estás probando en el simulador (no recibe push; usá iPhone real).
- **No llega en Android** → `google-services.json` mal ubicado, o no hiciste `npx cap sync`.
- **El token no se guarda** → RLS: confirmá que el usuario tenga member linkeado
  ([doc 02](02-auth-real.md)) para que `device_tokens` con self-policy lo acepte.
- **Llega duplicado / a quien no debía** → revisá que el sender filtre por `member_id` del
  `record` y respete `notif_prefs`.
- **El sender falla con 401** → el access token de FCM (desde la service account) no se está
  generando bien; revisá el JSON en secrets y los scopes.

---

**Siguiente:** volvé al [README](README.md) para el checklist maestro, o seguí con
[08 · Monetización](08-monetizacion.md), [09 · Ruteo OSRM](09-ruteo-osrm.md) y
[10 · Analytics](10-analytics-y-monitoreo.md) cuando tengas tracción.
