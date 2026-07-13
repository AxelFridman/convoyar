# 02 · Auth real — login por email de verdad

> **Qué vas a lograr:** que el login mande un **código real por email** (o un magic link)
> en vez del código simulado que hoy vive en `LocalAuthProvider`. Al terminar, una persona
> se registra con su email, recibe un código de 6 dígitos en su casilla, y queda con una
> **sesión real** de Supabase. Eso es lo que después distingue "quién soy" en todos los
> dispositivos (`meId` deja de ser fijo).

**Antes:** hacé el **[doc 01](01-supabase-base-de-datos.md)** (necesitás el proyecto Supabase).
El código que hoy simula esto está en [`src/services/auth.ts`](../../src/services/auth.ts)
(la interfaz `AuthProvider` ya está lista para este reemplazo — así lo dejó la PR5).

|             |                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| ⏱️ Tiempo | ~40 min                                                                                                  |
| 💰 Costo    | USD 0 para testear · dominio ~USD 10/año para producción                                              |
| 🧑 / 🤖     | Config en el dashboard =**VOS**; el swap del provider = **CÓDIGO** (se activa en el doc 03) |

> ### 📍 Estado (2026-07-12) y qué corregí de este doc
>
> Probaste con Resend + `convoyar.com`, y te trabaste. Dos cosas que este doc no te había
> dicho bien y ya corregí:
>
> 1. **No podés editar las plantillas de email sin SMTP propio** (Supabase te lo dice:
>    *"Set up custom SMTP to edit their subject and body"*). Reordené: SMTP **antes** que templates.
> 2. **La plataforma es multi-idioma** (es/en/pt/de/it/fr), y las plantillas de Supabase son
>    **una sola** (no cambian por idioma). Agregué cómo resolverlo (Paso 2, nuevo).
> 3. **Envío ≠ recepción.** El registro "Enable Receiving" (MX en la raíz) es para **recibir**
>    correos — Convoyar no los recibe. No lo actives. Los que importan son los 3 de **envío**,
>    que ya tenés OK. Detalle en el Paso 3B.
>
> **Lo que ya hiciste:** ✅ Email provider ON · ✅ dominio `convoyar.com` en Cloudflare (activo) ·
> ✅ registros de **envío** de Resend publicados (DKIM/SPF/return-path).
> **Lo que falta:** en Resend tocar "Verify" (envío) · conectar Custom SMTP en Supabase ·
> testear el login (podés hacerlo YA con el SMTP default, sin depender de Resend).

---

## El plan en una frase

`services/auth.ts` define esta interfaz (no la toques, es el contrato):

```ts
export interface AuthProvider {
  sendCode(email): Promise<{ ok, demoCode?, message? }>;
  verifyCode(email, code): Promise<boolean>;
}
```

Hoy la implementa `LocalAuthProvider` (genera el código con `Math.random` y lo devuelve en
`demoCode` para mostrarlo en pantalla). Vamos a agregar un `SupabaseAuthProvider` que
implementa la **misma interfaz** pero contra Supabase Auth. **La UI no cambia** — solo que
`demoCode` viene vacío (el código ahora llega por email, no lo mostramos).

---

## Paso 1 — Prender Email Auth con OTP 🧑 ⏱️ 5 min

En el dashboard de Supabase → **Authentication → Providers → Email**:

- **Enable Email provider:** ✅ ON.
- **Confirm email:** dejalo ON (así el email queda verificado al usarlo).
- Modo: vamos con **OTP (código numérico)** porque calza con `sendCode`/`verifyCode` que ya
  tenés. (Supabase manda por defecto un magic link + un código de 6 dígitos en el mismo mail;
  nosotros usamos el código.)

> 💡 Magic link vs OTP: el magic link (tocás un botón en el mail y entrás) es más cómodo en
> web, pero en la app móvil requiere configurar deep links. El **código de 6 dígitos** anda
> igual en web y en móvil sin nada extra, y es lo que tu UI ya sabe pedir. Arrancá con OTP.

---

## Paso 2 — Los emails: idioma y plantillas 🧑 ⏱️ 10 min

⚠️ **Ojo con dos cosas que descubriste vos:**

**(a) Para editar las plantillas necesitás SMTP propio primero.** Con el SMTP default,
Supabase te muestra: *"Emails will be sent using the default templates. Set up custom SMTP to
edit their subject and body."* O sea: **hasta que no conectes SMTP (Paso 3) no podés editar el
texto.** Igual, para **testear el login**, las plantillas default (en inglés) **funcionan** —
mandan el código igual. Editás el texto después, cuando tengas SMTP.

**(b) Convoyar es multi-idioma (es/en/pt/de/it/fr), y las plantillas de Supabase son UNA sola.**
El sistema de templates de Supabase **no cambia el idioma por usuario**. Tenés dos caminos:

| Camino                                                           | Cuándo        | Cómo                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plantilla neutra / bilingüe** (recomendado para lanzar) | Ya             | Una sola plantilla corta ES + EN. Como el contenido es casi solo el código, alcanza. Ver abajo.                                                                                                                     |
| **Email 100% localizado** (los 6 idiomas de verdad)        | Cuando importe | **Auth Hooks → "Send Email Hook"**: registrás una Edge Function que Supabase llama en vez de mandar su propio mail; tu función lee el idioma del usuario y arma el texto en su idioma con la API de Resend. |

**Plantilla bilingüe para arrancar** (pegala cuando tengas SMTP, en **Authentication → Email
Templates → Magic Link**, que es la que trae el OTP):

```
Asunto: Tu código Convoyar / Your Convoyar code

Tu código para entrar es / Your login code is:  {{ .Token }}

Vence en unos minutos. Si no fuiste vos, ignorá este mail.
It expires in a few minutes. If this wasn't you, ignore this email.
— Convoyar
```

⚠️ Dejá **`{{ .Token }}`** tal cual: es la variable que Supabase reemplaza por el código.

> 💡 **Para el camino localizado (después):** guardás el idioma del usuario al mandar el OTP
> (`signInWithOtp({ email, options: { data: { lang: "pt" } } })`), y el **Send Email Hook** lo
> lee de la metadata para elegir el texto. Las traducciones ya existen en
> [`src/i18n/`](../../src/i18n/), así que el copy no lo escribís de cero. Es la misma idea que
> el `send-push` del [doc 07](07-push-notifications.md): una Edge Function que arma el mensaje.

---

## Paso 3 — Enviar los emails: testear YA vs. producción 🧑

Acá está lo que te trabó. Separá dos momentos:

### 3A — Para TESTEAR el login ahora (sin dominio, sin Resend) ✅ ⏱️ 0 min

**No necesitás Resend ni dominio para probar que el login anda.** El SMTP **default** de
Supabase manda el código a **cualquier** email (con un límite de ~2–4 por hora y a veces cae
en spam la primera vez). Para vos y 1–2 cuentas de prueba, alcanza perfecto:

- **No enciendas** Custom SMTP todavía. Dejá el default.
- Registrate con tu email real → mirá la bandeja (y spam) → entra el código de 6 dígitos.
- Con eso validás el flujo completo. Resend y el dominio son para **producción/volumen**, no para probar.

> 🧪 Otra opción de prueba: el **sandbox de Resend** (`onboarding@resend.dev`) envía **sin
> dominio**, pero **solo a tu propio email** (el de tu cuenta Resend). Sirve para ver que la
> integración con Resend anda; para mandarle a otra gente sí o sí necesitás dominio (3B).

### 3B — Para PRODUCCIÓN: por qué se te trabó y cómo destrabarlo ⚠️ 🧑 ⏱️ 30 min + propagación DNS

El SMTP default no sirve para usuarios reales (rate limit + spam) → ahí entra **Resend**
(3.000 emails/mes gratis). Necesita un dominio propio (para publicar sus registros de envío).

> ✅ **Estado (2026-07-12): ya lo resolviste.** `convoyar.com` es tuyo, está **activo en
> Cloudflare** con sus nameservers, y los **3 registros de ENVÍO ya están publicados** (los
> verifiqué por DNS): DKIM (`resend._domainkey`), SPF (`send.convoyar.com`) y el MX de
> return-path (`send.convoyar.com` → `feedback-smtp.sa-east-1.amazonses.com`). En Resend tocá
> **"Verify DNS Records"** y el dominio queda verificado para enviar.

⚠️ **ENVÍO ≠ RECEPCIÓN (esto te confundió).** Resend tiene un botón **"Enable Receiving"** que
agrega un MX en la **raíz** (`convoyar.com` → `inbound-smtp…amazonaws.com`). Eso es para
**recibir** correos entrantes, algo que **Convoyar NO hace** (solo manda el código de login).
**No lo actives / borralo.** Que quede "pending" es irrelevante.

|                                      | Registros                         | ¿Convoyar los necesita?      |
| ------------------------------------ | --------------------------------- | ----------------------------- |
| **Envío** (mandar el código) | DKIM + SPF + MX en`send.`       | **SÍ** — ya están ✅ |
| **Recepción** (recibir mails) | MX en la raíz (`inbound-smtp`) | **NO** — borralo       |

**Cómo se armó (referencia, ya lo hiciste):**

1. **Comprá un dominio (recomendado, ~USD 10/año).** Como ya tenés **Cloudflare**, compralo ahí
   (**Cloudflare → Domain Registration**, lo vende al costo) — así el DNS ya está en Cloudflare
   y agregar los registros de Resend es un clic. Fijate si `convoyar.com` está libre; si no,
   `convoyar.app` / `convoyar.ar` / `.com.ar` sirven igual. Ese mismo dominio te sirve para la
   web ([doc 04](04-deploy-web-pwa.md)) y el email.
2. **Verificá el dominio en Resend:** Domains → Add domain → te da 3 registros (DKIM, SPF, y uno
   de retorno). **En Cloudflare → DNS** agregás esos 3 (Resend tiene integración directa con
   Cloudflare que los pone solos). En minutos verifica.
   - Los registros que ya tenés en `.env` (`RESEND_DOMAIN_DKIM_CONTENT`, etc.) son los de
     `convoyar.com`; si comprás **otro** dominio, Resend regenera los suyos. Usá los del dominio real.
3. **Conectá el SMTP en Supabase:** Project Settings → Authentication → **SMTP Settings →
   Enable Custom SMTP**: host `smtp.resend.com`, puerto `465`, usuario `resend`, password = tu
   `RESEND_API_KEY`, Sender `hola@tudominio` y nombre `Convoyar`. Recién ahí podés **editar las
   plantillas** (Paso 2).

> ❓ **"¿Puedo usar la URL `...workers.dev` de Cloudflare para el SMTP?"** — **No.** Esa es la
> URL de tu **sitio web** (HTTP), no tiene nada que ver con enviar emails. El SMTP necesita un
> **dominio de correo** con registros DNS (DKIM/SPF) que controles; un `workers.dev`/`pages.dev`
> no te deja ponerlos. Sitio web y envío de email son cosas separadas.

> Alternativas equivalentes a Resend: Brevo, Mailgun, Amazon SES, Postmark. Todas necesitan
> dominio igual. Resend es la más simple. (Dominio gratis para email: en la práctica no hay uno
> bueno — `eu.org` es gratis pero tarda días en aprobar; conviene pagar los ~USD 10.)

---

## Paso 4 — URLs permitidas 🧑 ⏱️ 3 min

**Qué es esto (para que no marees):** el "Site URL" y las "Redirect URLs" **solo importan para
flujos que REDIRIGEN el navegador** — o sea magic links y "entrar con Google/Apple". Con el
flujo de **código OTP que usás vos (escribís los 6 dígitos en la app) NO hay redirect**, así que
esta sección es casi irrelevante hoy. Configurá lo mínimo y seguí:

**Authentication → URL Configuration**:

- **Site URL:** tu URL pública. Poné **`https://convoyar.com`** (o, por ahora,
  `https://convoyar-web.pages.dev`). Para desarrollo local sirve `http://localhost:5173`.
- **Redirect URLs (allow list):** agregá `http://localhost:5173` y tu URL pública. Con eso alcanza.

> ⚠️ **Lo de `app.convoyar://` — por qué te da "Please provide a valid URL" y por qué NO lo
> necesitás ahora.** Ese es el *deep link* de la app **móvil** (un scheme propio). Supabase
> rechaza el `app.convoyar://` "pelado" porque le falta una ruta; iría como
> **`app.convoyar://auth-callback`**. Pero **saltealo por completo hoy**: solo hace falta si en
> las apps nativas ([05](05-google-play.md)/[06](06-app-store-ios.md)) usás **magic link** (y vos
> usás código OTP). Agregalo recién cuando hagas mobile. Dejá solo localhost + tu URL web.

---

## Paso 5 — El código: `SupabaseAuthProvider` 🤖

Esto es el reemplazo. Se **activa** en el [doc 03](03-conectar-la-app.md) (que crea el cliente
`supabase` y setea las env vars); acá está el archivo para que veas exactamente qué cambia.
Creá `src/services/authSupabase.ts`:

```ts
import type { AuthProvider } from "./auth";
import { isValidEmail } from "./auth";          // reusamos el validador que ya existe
import { supabase } from "./supabaseClient";     // el cliente lo crea el doc 03

export class SupabaseAuthProvider implements AuthProvider {
  async sendCode(email: string) {
    const e = email.trim().toLowerCase();
    if (!isValidEmail(e)) return { ok: false, message: "invalid_email" };
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { shouldCreateUser: true },       // crea el usuario si es nuevo
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };                         // ⚠️ sin demoCode: el código va por email real
  }

  async verifyCode(email: string, code: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    if (error || !data.session) return false;
    await ensureMemberRow(data.session.user.id, email);  // vincula auth.users ↔ members
    return true;
  }
}

/** Primera vez que entra: crea su fila en members + member_home ligada a auth.uid(). */
async function ensureMemberRow(authUserId: string, email: string) {
  const { data: existing } = await supabase
    .from("members").select("id").eq("auth_user_id", authUserId).maybeSingle();
  if (existing) return;
  const id = crypto.randomUUID();
  await supabase.from("members").insert({
    id, auth_user_id: authUserId, name: email.split("@")[0], email, email_verified: true,
  });
  // member_home se completa cuando el usuario marca su casa en el onboarding/mapa.
}
```

Y en `src/services/auth.ts`, la línea que hoy dice:

```ts
export const auth: AuthProvider = new LocalAuthProvider();
```

pasa a elegir según haya backend configurado (el doc 03 define `hasSupabase`):

```ts
import { SupabaseAuthProvider } from "./authSupabase";
export const auth: AuthProvider = hasSupabase
  ? new SupabaseAuthProvider()
  : new LocalAuthProvider();   // fallback para la demo sin backend
```

> ⚠️ **Quitá el cartel del código de demo en la UI.** Hoy la pantalla de verificación muestra
> `demoCode` (el número en pantalla). Con Supabase ese campo viene `undefined`, así que
> mostralo **solo si existe**: `{demoCode && <p>Tu código de demo: {demoCode}</p>}`. Si no,
> el usuario ve un hueco raro.

### `meId` deja de ser fijo 🤖

Hoy `AppState.meId = "m0"`. Con auth real, "yo" es el member ligado a mi sesión. En el store
(doc 03), al arrancar:

```ts
const { data: { user } } = await supabase.auth.getUser();
const meId = user
  ? (await supabase.from("members").select("id").eq("auth_user_id", user.id).single()).data?.id
  : null;   // sin sesión → mostrar login/onboarding
```

La sesión la persiste `supabase-js` solo (en `localStorage` en web; en móvil se configura con
Capacitor Preferences — lo ve el doc 03). O sea: el usuario se loguea una vez y queda logueado.

---

## Escalar 💰

- **Volumen de emails:** Resend Free = 3.000/mes. Si lo superás, su plan pago arranca en
  ~USD 20/mes (100k emails). Muchísimo para un lanzamiento.
- **Usuarios de Auth:** Supabase Free = 50.000 MAU. Después, Pro (USD 25/mes) sube el techo.
- **Más métodos de login:** cuando quieras "entrar con Google/Apple", se agregan como
  Providers en el mismo panel; Apple lo **exige** si ofrecés otros logins sociales en iOS.
  Por ahora, email OTP solo es suficiente y es lo más simple.

---

## ✅ Checklist de este doc

- [X] Email provider habilitado con OTP
- [ ] **Testeado el login con SMTP default** (código llega a tu email) ← hacé esto primero
- [ ] Site URL y Redirect URLs configuradas (podés poner tu URL `...workers.dev` como Site URL)
- [X] **(Producción)** Dominio `convoyar.com` propio + registros de **envío** publicados (DKIM/SPF/return-path)
- [ ] **(Producción)** En Resend: "Verify DNS Records" (envío) OK · **NO** activar "Enable Receiving"
- [ ] **(Producción)** Custom SMTP (Resend) conectado en Supabase → recién ahí editás plantillas
- [ ] Plantilla bilingüe pegada (con `{{ .Token }}`); email localizado 6 idiomas = después (Send Email Hook)
- [ ] `authSupabase.ts` creado y `auth.ts` elige provider según `hasSupabase` (se activa en doc 03)
- [ ] Cartel de `demoCode` en la UI mostrándose solo si existe

---

## 🆘 Problemas comunes

- **No llega el mail / tarda muchísimo** → seguís con el SMTP default de Supabase. Configurá
  Resend (Paso 3). Revisá también la carpeta de spam la primera vez.
- **"Email rate limit exceeded"** → límite del SMTP default; mismo fix (SMTP propio).
- **`verifyOtp` devuelve error "Token has expired or is invalid"** → el código vence rápido
  (por defecto ~1 hora, configurable) y es de un solo uso. Reenviá con `sendCode`.
- **Entra pero después "permission denied" en las tablas** → te falta crear la fila en
  `members` con `auth_user_id = auth.uid()` (la hace `ensureMemberRow`). Sin eso,
  `current_member_id()` del [doc 01](01-supabase-base-de-datos.md) devuelve null y RLS bloquea todo.

---

**Siguiente:** [03 · Conectar la app](03-conectar-la-app.md) → enchufar el front al backend y borrar los mocks.
