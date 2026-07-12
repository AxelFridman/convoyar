# 02 · Auth real — login por email de verdad

> **Qué vas a lograr:** que el login mande un **código real por email** (o un magic link)
> en vez del código simulado que hoy vive en `LocalAuthProvider`. Al terminar, una persona
> se registra con su email, recibe un código de 6 dígitos en su casilla, y queda con una
> **sesión real** de Supabase. Eso es lo que después distingue "quién soy" en todos los
> dispositivos (`meId` deja de ser fijo).

**Antes:** hacé el **[doc 01](01-supabase-base-de-datos.md)** (necesitás el proyecto Supabase).
El código que hoy simula esto está en [`src/services/auth.ts`](../../src/services/auth.ts)
(la interfaz `AuthProvider` ya está lista para este reemplazo — así lo dejó la PR5).

| | |
|---|---|
| ⏱️ Tiempo | ~40 min |
| 💰 Costo | USD 0 (Supabase Free + Resend Free) |
| 🧑 / 🤖 | Config en el dashboard = **VOS**; el swap del provider = **CÓDIGO** (se activa en el doc 03) |

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

## Paso 2 — Traducir los emails al español 🧑 ⏱️ 10 min

**Authentication → Email Templates**. Por defecto vienen en inglés. Editá al menos el de
**"Magic Link"** (que es el que trae el OTP). Poné algo tuyo, en rioplatense, con la marca:

```
Asunto: Tu código para entrar a Convoyar

Hola 👋
Tu código para entrar es: {{ .Token }}

Vence en unos minutos. Si no fuiste vos, ignorá este mail.
— El equipo de Convoyar
```

⚠️ Dejá la variable **`{{ .Token }}`** tal cual: es la que Supabase reemplaza por el código.
Si preferís magic link, usá `{{ .ConfirmationURL }}` en su lugar (y configurá deep links después).

---

## Paso 3 — SMTP propio para no caer en spam ⚠️ 🧑 ⏱️ 15 min

⚠️ **Esto no es opcional para producción.** El SMTP que trae Supabase gratis está pensado
solo para pruebas: **limita a unos pocos mails por hora** y los envía desde un dominio
compartido → **caen en spam** o directamente no llegan. Con eso, nadie puede loguearse.

Solución free y rápida: **[Resend](https://resend.com)** (3.000 emails/mes, 100/día gratis).

1. Creá cuenta en Resend 🧑.
2. **Domains → Add domain**: idealmente tu dominio propio (ej. `convoyar.app`, ver
   [doc 04](04-deploy-web-pwa.md)). Resend te da unos registros **DNS** (SPF/DKIM) para
   pegar en tu proveedor de dominio; eso es lo que hace que el mail sea "legítimo" y no spam.
   - ¿No tenés dominio todavía? Podés probar con el dominio de sandbox de Resend, pero para
     lanzar en serio conseguí uno (son ~USD 12/año) y verificalo.
3. **API Keys / SMTP**: Resend te da credenciales SMTP (host `smtp.resend.com`, puerto 465,
   usuario `resend`, y la API key como password).
4. En Supabase → **Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**:
   pegá host, puerto, usuario, password, y el **Sender email** (ej. `hola@convoyar.app`) y
   **Sender name** (`Convoyar`).
5. Mandate un mail de prueba (registrate con tu propio email) y confirmá que llega a la bandeja
   de entrada, no a spam.

> Alternativas equivalentes a Resend: Brevo, Mailgun, Amazon SES, Postmark. Resend es la más
> simple para arrancar.

---

## Paso 4 — URLs permitidas 🧑 ⏱️ 3 min

**Authentication → URL Configuration**:

- **Site URL:** tu URL de producción (la del [doc 04](04-deploy-web-pwa.md), ej.
  `https://convoyar.app`). Mientras no la tengas, poné `http://localhost:5173`.
- **Redirect URLs (allow list):** agregá `http://localhost:5173`, tu URL de prod, y —para la
  app móvil— el scheme de Capacitor `app.convoyar://` (lo vas a necesitar en los docs
  [05](05-google-play.md)/[06](06-app-store-ios.md) si algún día usás magic link en móvil).

Con OTP puro (código) esto importa poco, pero dejarlo listo ahora te ahorra un dolor después.

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

- [ ] Email provider habilitado con OTP
- [ ] Plantilla de email traducida al español (con `{{ .Token }}`)
- [ ] SMTP propio (Resend) conectado y **mail de prueba llega a la bandeja, no a spam**
- [ ] Site URL y Redirect URLs configuradas
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
