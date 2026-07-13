# 06 · Publicar en App Store (iOS)

> **Qué vas a lograr:** Convoyar en el iPhone, vía la App Store. Es el mismo build web
> empaquetado con Capacitor, igual que Android. La diferencia grande: **iOS necesita una Mac**
> y Apple es más estricto y más caro.

**Antes:** lo mismo que Android — la web funcionando con backend real (docs [01](01-supabase-base-de-datos.md)–[04](04-deploy-web-pwa.md)).
Muchos conceptos (privacidad, versionado, testing) son iguales al [doc 05](05-google-play.md);
acá va lo específico de iOS.

| | |
|---|---|
| ⏱️ Tiempo | ~1–2 días de setup + review (1–3 días típico) |
| 💰 Costo | **USD 99 / año** (Apple Developer Program) + eventualmente una Mac |
| 🧑 / 🤖 | Casi todo **VOS** (en una Mac). Un cambio de código obligatorio: borrar cuenta 🤖 |

> ### 📍 Estado (2026-07-12): ⏳ pendiente — Fase 2
> No empezaste esto. **Necesitás una Mac** (Paso 0) y el Apple Developer Program (USD 99/año).
> Va después de la Fase 1. Si querés llegar a usuarios rápido y barato, arrancá por Web + Android
> y dejá iOS para cuando tengas la Mac resuelta.

---

## ⚠️ Paso 0 — El problema de la Mac (estás en Windows) 🧑

Xcode (obligatorio para firmar y subir apps iOS) **solo corre en macOS**. Tus opciones:

| Opción | Costo | Para quién |
|---|---|---|
| **Mac prestada / de un amigo** | USD 0 | Lo hacés en unas sesiones |
| **Mac mini** (usada sirve) | ~USD 500–600 una vez | Si vas en serio con iOS |
| **Mac en la nube** (MacinCloud, MacStadium) | ~USD 20–30/mes | Puntual, sin comprar hardware |
| **CI que compila iOS por vos** (Codemagic, Ionic Appflow, EAS, GitHub Actions macOS) | Free tier / por build | Automatizás builds sin tocar una Mac a diario |

> 💡 **Recomendación:** para el primer envío, conseguí acceso a una Mac (prestada o en la
> nube) unas horas. Para mantener la app, un CI como **Codemagic** (tiene free tier) te
> compila y sube a TestFlight sin que tengas que abrir Xcode cada vez.

Si **no** vas a hacer iOS ahora, salteá este doc: web + Android ya te cubren la mayoría de
usuarios en Argentina. Volvé cuando tengas la Mac resuelta.

---

## Paso 1 — Apple Developer Program 🧑 💰 ⏱️ 30 min + días de verificación

1. **[developer.apple.com/programs](https://developer.apple.com/programs/)** → Enroll.
2. Pagá **USD 99/año** (recurrente; si no renovás, la app sale de la tienda).
3. Verificación de identidad: puede tardar de horas a varios días. Empezá temprano.

---

## Paso 2 — Cambio de código obligatorio: borrar cuenta ⚠️ 🤖

⚠️ **Apple exige (guía 5.1.1(v)) que toda app que permita crear cuenta permita BORRARLA
desde adentro de la app.** No alcanza con "escribinos un mail". Antes de enviar:

- Agregá en Perfil una acción **"Borrar mi cuenta"** que llame a una función que elimina al
  usuario y sus datos en Supabase (borra su fila de `members` → el `on delete cascade` del
  [schema](01-supabase-base-de-datos.md) limpia legs, requests, etc.) y hace `signOut`.
- Conviene hacerlo con una **Edge Function** que use `supabase.auth.admin.deleteUser()` +
  borrado en cascada, porque borrar el usuario de `auth.users` necesita `service_role`.

Es también buena práctica (y Google lo pide en el Data safety), así que sirve para ambas tiendas.

---

## Paso 3 — Agregar la plataforma iOS 🤖 (en la Mac) ⏱️ 20 min

```bash
npm i @capacitor/ios
npm run build
npx cap add ios         # crea ios/ (primera vez)
npx cap sync ios
npx cap open ios        # abre Xcode
```

El `appId` `app.convoyar` de `capacitor.config.json` es el **Bundle Identifier** en iOS.
⚠️ Igual que en Android, una vez publicado **no se cambia**.

---

## Paso 4 — Íconos, splash y firma en Xcode 🧑 ⏱️ 30 min

- Íconos/splash: `npx capacitor-assets generate --ios` (mismo `icon.png`/`splash.png` del [doc 05](05-google-play.md)).
- En Xcode → target de la app → **Signing & Capabilities**: elegí tu **Team** (tu cuenta
  Apple Developer) y dejá **Automatically manage signing**. Xcode registra el Bundle ID y crea
  los certificados/perfiles solo.
- Si vas a usar push ([doc 07](07-push-notifications.md)), agregá la capability
  **Push Notifications** acá.

---

## Paso 5 — App Store Connect: crear la app 🧑 ⏱️ 2–3 h

En **[appstoreconnect.apple.com](https://appstoreconnect.apple.com)** → My Apps → **+**:

- **Nombre:** `Convoyar`. ⚠️ Debe ser **único en toda la App Store**; si está tomado, usá un
  subtítulo o un nombre levemente distinto.
- **Bundle ID:** `app.convoyar` (el que registró Xcode).
- Idioma principal, categoría (ej. "Viajes" o "Estilo de vida").
- **Ficha:** descripción, palabras clave, **capturas** (por tamaño de iPhone; se pueden
  generar en el simulador de Xcode), ícono.
- **App Privacy** ("etiquetas nutricionales"): ⚠️ igual que el Data safety de Google —
  declará con la verdad que recolectás **email, ubicación y contenido del usuario** y para qué.
- **Clasificación por edad.**
- **Política de privacidad:** la URL del [doc 05 · Paso 1](05-google-play.md).
- **Cuenta de prueba para el revisor:** como la app pide login, dejale usuario + cómo obtener
  el código en las notas de revisión. Apple **rechaza** si no puede entrar.

> ℹ️ **Sign in with Apple:** Apple lo obliga **solo si** ofrecés login social de terceros
> (Google/Facebook). Convoyar usa **email OTP solo**, así que **no** te aplica. Si algún día
> agregás "entrar con Google", vas a tener que agregar también "entrar con Apple".

---

## Paso 6 — Archivar, subir y TestFlight 🧑

1. En Xcode: seleccioná destino **Any iOS Device**, luego **Product → Archive**.
2. En el Organizer que abre: **Distribute App → App Store Connect → Upload**.
3. En App Store Connect → **TestFlight**: la build aparece tras procesarse (~15–30 min).
   - **Testers internos** (hasta 100, tu equipo): sin revisión, al toque. Probá en tu iPhone.
   - **Testers externos:** requieren una revisión de beta liviana. Sirve para probar con más
     gente antes de producción (Apple no obliga los 14 días que pide Google, pero testear igual conviene).

---

## Paso 7 — Enviar a revisión y publicar 🧑

- En App Store Connect → tu app → **Add for Review** → Submit.
- La revisión de Apple suele tardar **1–3 días**. Es más estricta que Google.
- Podés elegir publicación automática al aprobar, o manual (vos apretás el botón).

### Rechazos típicos de Apple (para no comértelos)

- **Guía 4.2 "minimum functionality":** Apple rechaza apps que son "solo un sitio web
  envuelto". Convoyar tiene mapas, matching, push y flujos propios → está por encima de eso,
  pero asegurate de que **se sienta app** (funciona la instalación, push, no parece un browser).
- **Falta borrar cuenta:** ver Paso 2. Es causa frecuente de rechazo.
- **No pueden loguearse:** dales la cuenta de prueba (Paso 5).
- **App Privacy inexacta:** declará bien los datos.

---

## Actualizar (releases futuros) 🔁

1. Web → `npm run build && npx cap sync ios`.
2. Subí el **Build number** (y `Version` cuando sea release público) en Xcode.
3. **Archive → Upload** → nueva build a TestFlight/producción.

---

## 💰 Costos y escala

- **USD 99/año** mientras quieras estar en la tienda.
- Comisiones solo si vendés digital in-app → [doc 08](08-monetizacion.md).
- Una Mac (comprada o en la nube) es el otro costo real; ver Paso 0.

---

## ✅ Checklist de este doc

- [ ] Acceso a una Mac resuelto (propia / prestada / nube / CI)
- [ ] Apple Developer Program pagado (USD 99) e identidad verificada
- [ ] Flujo **"Borrar mi cuenta"** implementado (obligatorio Apple) 🤖
- [ ] `npx cap add ios` + `sync` OK, abre en Xcode
- [ ] Signing automático con tu Team; Bundle ID `app.convoyar`
- [ ] Íconos/splash generados
- [ ] App creada en App Store Connect (nombre único)
- [ ] **App Privacy** declarada con la verdad
- [ ] Política de privacidad + cuenta de prueba para el revisor cargadas
- [ ] Build archivada y subida; probada en TestFlight en un iPhone real
- [ ] Enviada a revisión

---

## 🆘 Problemas comunes

- **"Xcode solo en Mac"** → Paso 0 (Mac prestada, en la nube, o CI como Codemagic).
- **Rechazo 4.2** → reforzá que sea una app de verdad (push, mapas, flujos), no un marcador web.
- **Rechazo por no poder borrar cuenta** → implementá el flujo del Paso 2.
- **"Invalid Bundle" / firma** → dejá el signing en automático y confirmá el Team correcto.
- **La build no aparece en TestFlight** → esperá el procesamiento (~30 min) y revisá que no
  haya warnings de "Missing Compliance" (export encryption: casi siempre respondés "no usa
  cifrado no estándar").

---

**Siguiente:** [07 · Push notifications](07-push-notifications.md) → avisos reales en ambas plataformas.
