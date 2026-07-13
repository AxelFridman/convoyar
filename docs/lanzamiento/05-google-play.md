# 05 · Publicar en Google Play (Android)

> **Qué vas a lograr:** tu app en la Play Store, instalable desde el celular de cualquiera.
> Convoyar ya está preparado para esto: Capacitor está configurado (`app.convoyar`), solo
> falta agregar la plataforma Android, firmar el build y pasar por la burocracia de Google.

**Antes:** que la web ya funcione con el backend real (docs [01](01-supabase-base-de-datos.md)–[04](04-deploy-web-pwa.md)),
porque la app Android es **esa misma web** empaquetada. Ideal también tener el
[doc 07 · Push](07-push-notifications.md) resuelto antes de la versión final.

| | |
|---|---|
| ⏱️ Tiempo | ~1 día de setup + **14 días de testing obligatorio** (ver ⚠️ Paso 8) + días de review |
| 💰 Costo | **USD 25** pago único, de por vida |
| 🧑 / 🤖 | El grueso es **VOS** (cuentas, firma, Console). Algún cambio de código menor es 🤖 |

> ### 📍 Estado (2026-07-13): 🏗️ scaffold listo — falta la parte tuya (cuenta + firma + Console)
> El proyecto Android **ya está armado y compilando la web de PROD**. Lo que dejó hecho el agente:
> - ✅ Deps de Capacitor 8 instaladas (`@capacitor/core` · `cli` · `android`, + `@capacitor/assets` en dev).
> - ✅ Plataforma Android agregada (`npx cap add android`) y sincronizada (`npx cap sync android`) — carpeta `android/` en el repo.
> - ✅ Web de producción compilada apuntando al Supabase de PROD (proyecto `qlcwluvhrbkwjkjigsog`).
> - ✅ **Firma de release preconfigurada** en `android/app/build.gradle`: usa `android/keystore.properties` **si existe** (plantilla en `android/keystore.properties.example`). Sin ese archivo, el build debug sigue andando.
> - ✅ **Versionado** listo: `versionCode 1`, `versionName "1.0.0"`.
> - ✅ Íconos y splash generados desde `public/icon.svg` (`resources/icon.png` 1024×1024 + `resources/splash.png`, y todos los tamaños Android vía `capacitor-assets`).
> - ✅ `.gitignore` ajustado: la keystore y los artefactos de build de Android NO se commitean.
>
> **Lo que falta es TUYO y no se puede automatizar** (necesita tu identidad y tus secretos):
> generar y **respaldar la keystore** (Paso 6), abrir en Android Studio y **generar el `.aab` firmado**
> (Paso 7), y toda la burocracia de Google (cuenta USD 25 + verificación, ficha, Data safety, y los
> **14 días de testing cerrado** del Paso 9). **Hacelo cuando te verifiquen la cuenta de desarrollador.**
>
> ⚠️ El `.aab` **no** lo generó el agente a propósito: requiere tu keystore (secreta) y un entorno con
> Android SDK. Se hace en tu máquina con Android Studio (Paso 7).

> ✅ **Buena noticia para vos:** Android se desarrolla **en Windows** sin problema (a
> diferencia de iOS, que necesita Mac — ver [doc 06](06-app-store-ios.md)). Con tu Windows 11 alcanza.

---

## Paso 0 — Instalar las herramientas 🧑 ⏱️ 30–60 min

1. **[Android Studio](https://developer.android.com/studio)** (trae el Android SDK y el JDK).
   Instalalo con las opciones por defecto y dejá que baje el SDK la primera vez que abre.
2. Node 20+ (ya lo tenés) y el repo compilando (`npm run build` en verde).
3. `keytool` (para la firma) viene con el JDK de Android Studio — no instalás nada extra.

---

## Paso 1 — Política de privacidad ⚠️ 🧑 ⏱️ 1–2 h

⚠️ **Obligatoria.** Google (y Apple) **rechazan** la app sin una URL pública de política de
privacidad. Y ojo: la línea vieja del proyecto "la app no manda datos a servidores" **ya no
es cierta** desde que conectaste Supabase. Ahora recolectás email, ubicaciones (casa,
destinos) y contenido (mensajes, reseñas).

- Redactá una política honesta: qué datos pedís, para qué, dónde se guardan (Supabase), que
  no se venden, cómo se borra la cuenta, y un contacto.
- Publicala en una URL estable: puede ser una página de tu dominio (`convoyar.app/privacidad`)
  o una ruta estática servida por el mismo hosting del [doc 04](04-deploy-web-pwa.md).
- Podés partir de un generador (Termly, iubenda tienen free tier) **pero revisala** para que
  diga la verdad de lo que hace Convoyar. No copies una genérica que mienta.

---

## Paso 2 — Cuenta de Google Play Console 🧑 💰 ⏱️ 30 min (+ verificación)

1. Andá a **[play.google.com/console](https://play.google.com/console)** → pagá los **USD 25**
   (una sola vez, para siempre).
2. Elegí tipo de cuenta: **Personal** (para vos) u **Organización** (empresa; requiere
   número D-U-N-S). Para arrancar, Personal.
3. ⚠️ **Verificación de identidad:** Google te pide documento y datos. Puede tardar de horas
   a días. Hacelo apenas creás la cuenta, no lo dejes para el final.

---

## Paso 3 — Agregar la plataforma Android ✅ HECHO 🤖

Ya está hecho: las deps de Capacitor están instaladas, la carpeta `android/` existe en el repo y
está sincronizada con la web de producción. Los comandos que se corrieron (para tu referencia):

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android   # ✅ hecho (Capacitor 8)
npm i -D @capacitor/assets                                # ✅ hecho
npm run build            # ✅ genera dist/ con las env vars de PROD (proyecto qlcwluvhrbkwjkjigsog)
npx cap add android      # ✅ creó la carpeta android/ (solo la primera vez)
npx cap sync android     # ✅ copió dist/ + plugins al proyecto nativo
```

Lo único que te queda de este paso es **abrir el proyecto en Android Studio** (después de instalarlo, Paso 0):

```bash
npx cap open android     # abre Android Studio con el proyecto android/
```

`capacitor.config.json` ya tiene lo importante:

```json
{ "appId": "app.convoyar", "appName": "Convoyar", "webDir": "dist" }
```

> ⚠️ **`app.convoyar` es tu identidad para siempre.** Una vez que publicás con ese
> `applicationId`, **no se puede cambiar** (sería otra app distinta). Está bien elegido, no lo toques.

> 🔁 **Cada vez que cambiás la web**, repetís `npm run build && npx cap sync android` antes de
> volver a compilar el `.aab`. La carpeta `android/` es generada: no edites a mano cosas que
> Capacitor regenera; los cambios nativos van en los archivos que Capacitor respeta.

---

## Paso 4 — Íconos y splash ✅ HECHO 🤖

Ya están generados a partir de `public/icon.svg`:

- `resources/icon.png` (1024×1024) y `resources/splash.png` (2732×2732) — las fuentes.
- Todos los tamaños de mipmap (adaptive icons) y splash de Android, creados con:

```bash
npx capacitor-assets generate --android   # ✅ hecho
```

> 💅 **Detalle de pulido (opcional):** como solo se dio `icon.png`, el fondo del *adaptive icon*
> quedó blanco por defecto. Si querés un ícono más prolijo (fondo de marca + logo recortado en
> la zona segura), poné un `resources/icon-foreground.png` y un `resources/icon-background.png`
> y volvé a correr `npx capacitor-assets generate --android`. No es bloqueante para publicar.

Si cambiás las fuentes de `resources/`, reejecutá el comando de arriba y después `npx cap sync android`.

---

## Paso 5 — Versionado ✅ HECHO 🤖

Ya está seteado en `android/app/build.gradle` (dentro de `defaultConfig`): **`versionCode 1`** y
**`versionName "1.0.0"`**. Para las próximas subidas:

- **`versionCode`** (entero): **subilo +1 en cada subida** a Play. Si repetís uno ya usado,
  Play rechaza el `.aab`.
- **`versionName`** (texto, ej. `"1.0.1"`): lo que ve el usuario.

---

## Paso 6 — Generar tu keystore de firma ⚠️⚠️ 🧑 ⏱️ 15 min

Este es **el paso donde no te podés equivocar**. La *keystore* es el archivo con tu clave de
firma. Generala una vez y **guardala como oro**:

```bash
keytool -genkey -v -keystore convoyar-upload.keystore \
  -alias convoyar -keyalg RSA -keysize 2048 -validity 10000
```

Te pide una contraseña y unos datos. Al terminar tenés `convoyar-upload.keystore`. Guardalo en
la **raíz del repo** (junto a `package.json`) o donde prefieras — la ruta la definís vos abajo.

> En Windows con Android Studio instalado, `keytool` vive en el JDK que trae Android Studio.
> Si `keytool` "no se reconoce", usá la ruta completa, p. ej.:
> `& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore ...`

⚠️ **Respaldá el archivo `.keystore` Y las contraseñas en al menos 2 lugares seguros**
(gestor de contraseñas + un backup cifrado). Si lo perdés:

- Con **Play App Signing** (activado por defecto hoy) Google guarda la *clave de firma de la
  app*; vos solo firmás con una *clave de subida* (upload key). Si perdés la de subida, se
  puede **resetear** pidiéndolo a soporte de Google. Menos catastrófico que antes, pero igual
  un dolor de cabeza de días. **No lo pierdas.**

### Configurar la firma en el proyecto ✅ YA PRECONFIGURADO 🤖

`android/app/build.gradle` **ya tiene el `signingConfigs.release` armado**: lee
`android/keystore.properties` **si ese archivo existe**. Si no existe (como ahora), el build
debug sigue andando y el release queda sin firmar. **Vos solo tenés que crear ese archivo con
tus secretos.** Hay una plantilla lista: **`android/keystore.properties.example`**.

1. Copiá la plantilla:

   ```bash
   cp android/keystore.properties.example android/keystore.properties
   ```

2. Editá `android/keystore.properties` con tus datos reales (las rutas de `storeFile` son
   **relativas a la carpeta `android/`**; `../` apunta a la raíz del repo):

   ```
   storeFile=../convoyar-upload.keystore
   storePassword=TU_PASSWORD
   keyAlias=convoyar
   keyPassword=TU_PASSWORD
   ```

> ✅ `android/keystore.properties`, `*.keystore` y `*.jks` **ya están en `.gitignore`** — no se
> commitean. Igual, revisá con `git status` antes de cualquier commit que no aparezcan.

Con ese archivo en su lugar, `./gradlew bundleRelease` firma solo. Y si preferís la vía visual,
Android Studio te firma igual desde **Build → Generate Signed Bundle** (Paso 7) sin tocar nada.

---

## Paso 7 — Compilar el `.aab` firmado 🧑 ⏱️ 10 min

En Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.

- Elegí tu `convoyar-upload.keystore`, poné las contraseñas, alias `convoyar`.
- Variante: **release**.
- Sale un **`app-release.aab`** en `android/app/release/`.

⚠️ Para Play se sube **`.aab`** (Android App Bundle), **no `.apk`**. El `.apk` sirve para
instalar a mano en un teléfono de prueba (`Build → Build APK`), no para la tienda.

---

## Paso 8 — Configurar la ficha en Play Console 🧑 ⏱️ 2–3 h

En Console → **Create app**. Idioma por defecto sugerido: **Español (Latinoamérica) es-419**.
Después completá TODO lo que Console te va marcando con ⚠️ (no te deja publicar con faltantes):

- **Ficha de Play Store:** nombre (`Convoyar`), descripción corta (≤80 car.), descripción
  larga, **capturas de pantalla** (mínimo 2 de teléfono; podés usar/regenerar las de
  `docs/screenshots/`), **ícono 512×512**, **gráfico destacado 1024×500**.
- **Clasificación de contenido:** cuestionario IARC (respondé honesto; para una app así,
  clasificación baja).
- **Público objetivo y contenido:** rango de edad.
- **Seguridad de los datos (Data safety):** ⚠️ formulario **obligatorio y verificado**.
  Declará con la verdad lo que Convoyar recolecta ahora: **email** (para login),
  **ubicación** (casa/destinos), **contenido del usuario** (mensajes, reseñas). Decí que
  viajan cifrados (HTTPS) y que el usuario puede borrar su cuenta. Mentir acá = suspensión.
- **Acceso a la app:** como la app requiere login, dale al revisor un **usuario de prueba**
  (email + cómo recibir el código, o una cuenta demo) para que pueda entrar.
- **Política de privacidad:** pegá la URL del Paso 1.

---

## Paso 9 — Testing obligatorio ⚠️ (el que traba a todos) 🧑

Google usa **tracks** (canales) de lanzamiento:

1. **Testing interno** (Internal testing): hasta 100 testers por email, disponible **al toque**.
   Subí tu `.aab` acá primero y probá la instalación real en tu teléfono.
2. **Testing cerrado** (Closed testing): ⚠️ **para cuentas personales nuevas, Google exige un
   período de testing cerrado con un mínimo de testers (hoy ~12) que se mantengan opt-in
   durante 14 días corridos ANTES de poder pasar a producción.** El número exacto lo confirmás
   en Console (cambió con el tiempo). **Esto significa que no podés publicar el día 1:** juntá
   ~12 conocidos, que se sumen al test y tengan la app instalada dos semanas.
3. **Producción:** recién después habilitás producción, con *staged rollout* (empezás en un %
   de usuarios y subís).

> 💡 **Planificá el calendario.** Sumá los 14 días de testing cerrado + los días de review de
> Google. Si querés lanzar para una fecha, empezá el testing cerrado ~3 semanas antes.

---

## Paso 10 — Enviar a revisión y publicar 🧑

- Cuando pasás a producción, Google revisa la app. La **primera** revisión suele tardar de
  unos días hasta 1–2 semanas.
- Requisitos técnicos que Play verifica solo (Capacitor los cumple, pero tenelo en el radar):
  la app debe **apuntar a un target API level reciente** (Play sube el mínimo cada año). Si
  Console se queja, actualizá `targetSdkVersion` en `build.gradle` y recompilá.

---

## Actualizar la app (releases futuros) 🔁

> 🔁 **Recordatorio clave: para actualizar la app Android, siempre corré primero**
> **`npm run build && npx cap sync android`.** Eso recompila la web de PROD y la copia al
> proyecto nativo. Si te olvidás, el `.aab` sale con la versión vieja de la web.

1. Cambios en la web → **`npm run build && npx cap sync android`**.
2. Subí `versionCode` (+1) y `versionName` en `android/app/build.gradle`.
3. Generá el `.aab` firmado (misma keystore) → subilo a un track → producción.

---

## 💰 Costos y escala

- **USD 25 pago único.** No hay costo recurrente por tener la app publicada.
- Comisiones **solo** si vendés algo digital dentro de la app → ver [doc 08](08-monetizacion.md).
- No hay "escalar" que pagar acá: Play sirve las descargas gratis.

---

## ✅ Checklist de este doc

- [x] ✅ Plataforma Android agregada: `npx cap add android` + `sync` OK (carpeta `android/` en el repo)
- [x] ✅ Íconos/splash generados (desde `public/icon.svg`)
- [x] ✅ Firma preconfigurada por `keystore.properties` en `build.gradle` (+ plantilla `.example`)
- [x] ✅ Versionado: `versionCode 1`, `versionName "1.0.0"`
- [x] ✅ `keystore.properties`, `*.keystore`, `*.jks` y artefactos de build en `.gitignore`
- [ ] Android Studio instalado y `npm run build` en verde
- [ ] Política de privacidad publicada en una URL estable
- [ ] Cuenta Play Console pagada (USD 25) y **identidad verificada**
- [ ] Proyecto abierto en Android Studio (`npx cap open android`)
- [ ] **Keystore generada y respaldada en 2 lugares + contraseñas guardadas** ⚠️ (Paso 6)
- [ ] `android/keystore.properties` creado desde la plantilla y completado con tus datos
- [ ] `.aab` **firmado** generado (release) en Android Studio
- [ ] Ficha completa: descripciones, capturas, ícono, gráfico, clasificación
- [ ] **Data safety** completado con la verdad (email, ubicación, contenido)
- [ ] Usuario de prueba dado al revisor (la app pide login)
- [ ] Testing interno OK en teléfono real
- [ ] Testing cerrado con ~12 testers corriendo (14 días) — si tu cuenta lo exige
- [ ] Producción enviada a revisión

---

## 🆘 Problemas comunes

- **"Version code X has already been used"** → subí `versionCode` (+1) y recompilá.
- **"You uploaded an APK... expected an App Bundle"** → subiste `.apk`; subí el `.aab`.
- **"Upload key mismatch" / firma inválida** → firmaste con otra keystore que la primera vez.
  Usá SIEMPRE la misma. Si la perdiste, pedí reset de upload key a soporte (Play App Signing).
- **Rechazan por Data safety incompleta o falsa** → completala con la verdad (recolectás email,
  ubicación, contenido). Es lo más común en apps con backend.
- **Rechazan por falta de política de privacidad** → Paso 1, URL pública y accesible.
- **"No puedo pasar a producción todavía"** → es el testing cerrado obligatorio (Paso 9);
  esperá los 14 días con los testers activos.

---

**Siguiente:** [06 · App Store iOS](06-app-store-ios.md) (necesita Mac) · o [07 · Push](07-push-notifications.md) para los avisos.
