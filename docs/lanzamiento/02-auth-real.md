# 02 · Auth real — login con email + contraseña

> **Qué ya está / qué vas a pulir:** el login con **email + contraseña** real contra Supabase
> Auth. Una persona se registra con nombre + email + contraseña, (opcional) confirma su email, y
> queda con una **sesión real** que la identifica en todos los dispositivos (`meId` deja de ser
> fijo). **Esto ya está implementado** en [`src/services/auth.ts`](../../src/services/auth.ts) y
> `screens/Auth.tsx`. Este doc explica la config del lado de Supabase (los emails de confirmación
> de alta y de reset de contraseña) y qué queda por pulir. **No es OTP** (el diseño original de
> este doc proponía OTP; se implementó email + contraseña, que es lo que corre hoy).

**Antes:** el **[doc 01](01-supabase-base-de-datos.md)** (proyecto Supabase + RLS).

|             |                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| ⏱️ Tiempo | ~30 min (config de emails)                                                                               |
| 💰 Costo    | USD 0 (el dominio `convoyar.com` ya está comprado)                                                       |
| 🧑 / 🤖     | El código de auth **ya está** 🤖; queda config en el dashboard = **VOS** (emails de confirmación/reset) |

> ### 📍 Estado (2026-07-13): ✅ auth implementado — queda pulir los emails
>
> El **código de auth ya está hecho**: alta/login con **email + contraseña**, reset y update de
> contraseña en [`services/auth.ts`](../../src/services/auth.ts), pantalla `screens/Auth.tsx`, y
> el bootstrap del member por sesión (`onAuthStateChange`) en el store.
>
> Lo que queda es del lado de Supabase, para los **emails que manda el auth** (confirmación de
> alta y reset de contraseña):
> - ✅ Dominio `convoyar.com` comprado y activo en Cloudflare · ✅ registros de **envío** de Resend
>   publicados (DKIM/SPF/return-path).
> - ⏳ En Resend tocar "Verify DNS Records" y conectar **Custom SMTP** en Supabase (para
>   volumen/producción). Para testear ya alcanza el **SMTP default** de Supabase.
> - ⚠️ Siguen aplicando: multi-idioma (una sola plantilla) y "envío ≠ recepción" (Paso 3B).

---

## Cómo funciona (ya implementado)

`services/auth.ts` expone funciones contra Supabase Auth (no una interfaz `AuthProvider`):

```ts
signUpWithPassword(name, email, password)  // alta (el nombre viaja en user_metadata.name)
signInWithPassword(email, password)         // login
resetPassword(email)                        // manda el email de "restablecer contraseña"
updatePassword(newPassword)                 // fija la nueva contraseña (pantalla de recovery)
```

Sólo corren en modo Supabase (`hasSupabase === true`, ver [doc 03](03-conectar-la-app.md)); en
modo demo local no hay login: la app arranca con `meId "m0"`. Con "Confirm email" activado,
`signUp` no devuelve sesión hasta que la persona confirma (el código maneja el caso `needsConfirm`);
el store detecta la sesión con `onAuthStateChange` y crea/enlaza su fila en `members`.

---

## Paso 1 — Prender Email + contraseña 🧑 ⏱️ 5 min

En el dashboard de Supabase → **Authentication → Providers → Email**:

- **Enable Email provider:** ✅ ON.
- **Confirm email:** dejalo ON si querés que el usuario confirme su email antes de operar (el
  código ya maneja el caso `needsConfirm`). Si lo dejás OFF, el alta loguea de una.
- No hace falta OTP ni magic link: la app usa **email + contraseña** (`signInWithPassword`).

> 💡 El email igual importa: Supabase manda el **email de confirmación** (si "Confirm email" está
> ON) y el de **reset de contraseña** (`resetPassword`). Por eso el resto del doc configura el envío.

---

## Paso 2 — Los emails: idioma y plantillas 🧑 ⏱️ 10 min

⚠️ **Ojo con dos cosas que descubriste vos:**

**(a) Para editar las plantillas necesitás SMTP propio primero.** Con el SMTP default,
Supabase te muestra: *"Emails will be sent using the default templates. Set up custom SMTP to
edit their subject and body."* O sea: **hasta que no conectes SMTP (Paso 3) no podés editar el
texto.** Igual, para **testear el alta/login**, las plantillas default (en inglés) **funcionan** —
mandan el email de confirmación/reset igual. Editás el texto después, cuando tengas SMTP.

**(b) Convoyar es multi-idioma (es/en/pt/de/it/fr), y las plantillas de Supabase son UNA sola.**
El sistema de templates de Supabase **no cambia el idioma por usuario**. Tenés dos caminos:

| Camino                                                           | Cuándo        | Cómo                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plantilla neutra / bilingüe** (recomendado para lanzar) | Ya             | Una plantilla corta ES + EN por tipo (confirmar / reset). Como el contenido es casi solo un link, alcanza. Ver abajo.                                                                                                                     |
| **Email 100% localizado** (los 6 idiomas de verdad)        | Cuando importe | **Auth Hooks → "Send Email Hook"**: registrás una Edge Function que Supabase llama en vez de mandar su propio mail; tu función lee el idioma del usuario y arma el texto en su idioma con la API de Resend. |

**Plantillas bilingües para arrancar** (pegalas cuando tengas SMTP, en **Authentication → Email
Templates → "Confirm signup"** y **"Reset password"**):

```
Asunto: Confirmá tu cuenta Convoyar / Confirm your Convoyar account

Tocá para confirmar tu email / Tap to confirm your email:  {{ .ConfirmationURL }}

Si no fuiste vos, ignorá este mail. / If this wasn't you, ignore this email.
— Convoyar
```

```
Asunto: Restablecé tu contraseña Convoyar / Reset your Convoyar password

Tocá para elegir una nueva contraseña / Tap to set a new password:  {{ .ConfirmationURL }}
— Convoyar
```

⚠️ Dejá **`{{ .ConfirmationURL }}`** tal cual: es el link que Supabase reemplaza en cada mail.

> 💡 **Para el camino localizado (después):** guardás el idioma del usuario al dar de alta
> (`signUp({ email, password, options: { data: { name, lang: "pt" } } })`), y el **Send Email Hook**
> lo lee de la metadata para elegir el texto. Las traducciones ya existen en
> [`src/i18n/`](../../src/i18n/), así que el copy no lo escribís de cero. Es la misma idea que
> el `send-push` del [doc 07](07-push-notifications.md): una Edge Function que arma el mensaje.

---

## Paso 3 — Enviar los emails: testear YA vs. producción 🧑

Acá está lo que te trabó. Separá dos momentos:

### 3A — Para TESTEAR el login ahora (sin dominio, sin Resend) ✅ ⏱️ 0 min

**No necesitás Resend ni dominio para probar que el alta/login anda.** El SMTP **default** de
Supabase manda el email (de confirmación o reset) a **cualquier** casilla (con un límite de ~2–4
por hora y a veces cae en spam la primera vez). Para vos y 1–2 cuentas de prueba, alcanza perfecto:

- **No enciendas** Custom SMTP todavía. Dejá el default.
- Registrate con tu email real → mirá la bandeja (y spam) → tocá el link de confirmación → entrás.
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
**recibir** correos entrantes, algo que **Convoyar NO hace** (solo manda emails de confirmación/reset).
**No lo actives / borralo.** Que quede "pending" es irrelevante.

|                                      | Registros                         | ¿Convoyar los necesita?      |
| ------------------------------------ | --------------------------------- | ----------------------------- |
| **Envío** (mandar los emails) | DKIM + SPF + MX en`send.`       | **SÍ** — ya están ✅ |
| **Recepción** (recibir mails) | MX en la raíz (`inbound-smtp`) | **NO** — borralo       |

**Cómo se armó (referencia, ya lo hiciste):**

1. **Dominio: `convoyar.com` ✅ ya comprado** (en tu Cloudflare, así el DNS ya está ahí y agregar
   los registros de Resend es un clic). Ese mismo dominio sirve para la web
   ([doc 04](04-deploy-web-pwa.md)) y para el email.
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

**Qué es esto:** el "Site URL" y las "Redirect URLs" importan porque los links que Supabase manda
por email — **confirmación de alta** y **reset de contraseña** — redirigen el navegador de vuelta
a la app. El código usa `emailRedirectTo` / `redirectTo = window.location.origin` y el cliente
tiene `detectSessionInUrl: true`. Configuralas o esos links no vuelven bien:

**Authentication → URL Configuration**:

- **Site URL:** **`https://convoyar.com`** (o, por ahora, `https://supabase-preview.convoyar-web.pages.dev`).
  Para desarrollo local, `http://localhost:5173`.
- **Redirect URLs (allow list):** agregá `http://localhost:5173`, la URL del preview y `https://convoyar.com`.

> ⚠️ **`app.convoyar://` (deep link móvil).** Es el scheme de la app **nativa**. Supabase rechaza
> el `app.convoyar://` "pelado" (le falta ruta); iría como **`app.convoyar://auth-callback`**.
> Agregalo cuando hagas la confirmación/reset **en la app móvil** ([05](05-google-play.md)/[06](06-app-store-ios.md));
> para web alcanza con localhost + preview + `convoyar.com`.

---

## Paso 5 — El código 🤖 (ya implementado)

No hay que escribir nada: [`src/services/auth.ts`](../../src/services/auth.ts) ya tiene las
funciones contra Supabase Auth (`signUpWithPassword`, `signInWithPassword`, `resetPassword`,
`updatePassword`) y `screens/Auth.tsx` es la pantalla de alta/login/recovery. Corren sólo cuando
`hasSupabase === true` ([doc 03](03-conectar-la-app.md)); en modo demo local no hay login.

### `meId` deja de ser fijo 🤖 (ya implementado)

Con auth real, "yo" es el member ligado a mi sesión, no `m0`. El store escucha
`supabase.auth.onAuthStateChange`: al haber sesión, corre la RPC `ensure_personal_org` (crea la
org personal del usuario nuevo), carga con `loadRemote` y deriva `meId` del member vinculado a
`auth.uid()` (se crea/enlaza la primera vez). La sesión la persiste `supabase-js` solo
(localStorage en web; en móvil se configura con Capacitor Preferences — lo ve el doc 03).

---

## Escalar 💰

- **Volumen de emails:** Resend Free = 3.000/mes. Si lo superás, su plan pago arranca en
  ~USD 20/mes (100k emails). Muchísimo para un lanzamiento.
- **Usuarios de Auth:** Supabase Free = 50.000 MAU. Después, Pro (USD 25/mes) sube el techo.
- **Más métodos de login:** cuando quieras "entrar con Google/Apple", se agregan como
  Providers en el mismo panel; Apple lo **exige** si ofrecés otros logins sociales en iOS.
  Por ahora, email + contraseña es suficiente y es lo más simple.

---

## ✅ Checklist de este doc

- [x] Auth **email + contraseña** implementado (`services/auth.ts` + `screens/Auth.tsx`)
- [x] Email provider habilitado en Supabase
- [ ] Decidir "Confirm email" ON/OFF (el código maneja ambos: `needsConfirm`)
- [ ] Site URL y Redirect URLs configuradas (confirmación + reset redirigen a la app)
- [X] **(Producción)** Dominio `convoyar.com` propio + registros de **envío** publicados (DKIM/SPF/return-path)
- [ ] **(Producción)** En Resend: "Verify DNS Records" (envío) OK · **NO** activar "Enable Receiving"
- [ ] **(Producción)** Custom SMTP (Resend) conectado en Supabase → recién ahí editás plantillas
- [ ] Plantillas "Confirm signup" y "Reset password" bilingües (con `{{ .ConfirmationURL }}`); 6 idiomas = después (Send Email Hook)
- [ ] Testeado el alta + login (el email de confirmación / reset llega a tu casilla)

---

## 🆘 Problemas comunes

- **No llega el mail / tarda muchísimo** → seguís con el SMTP default de Supabase. Configurá
  Resend (Paso 3). Revisá también la carpeta de spam la primera vez.
- **"Email rate limit exceeded"** → límite del SMTP default; mismo fix (SMTP propio).
- **"Invalid login credentials"** → email/contraseña incorrectos, o el email todavía no fue
  confirmado (si "Confirm email" está ON). Revisá la bandeja/spam del email de confirmación.
- **El link de confirmación/reset no vuelve a la app** → falta agregar la URL a las Redirect URLs (Paso 4).
- **Entra pero después "permission denied" en las tablas** → te falta la fila en `members` con
  `auth_user_id = auth.uid()` (la crea el bootstrap del store al detectar la sesión). Sin eso,
  `current_member_id()` del [doc 01](01-supabase-base-de-datos.md) devuelve null y RLS bloquea todo.

---

**Siguiente:** [03 · Conectar la app](03-conectar-la-app.md) → enchufar el front al backend y borrar los mocks.
