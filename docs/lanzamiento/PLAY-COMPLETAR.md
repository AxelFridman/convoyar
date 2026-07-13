# ✅ Completar Google Play Console — paso a paso (a prueba de todo)

Todo lo que Play te pide, con **el valor exacto para copiar** o **el archivo exacto para subir**.
Los archivos están en tu compu, dentro de la carpeta del proyecto:

```
C:\Users\fridm\Downloads\caravana-src\caravana\
```

> 💡 Para abrir una carpeta rápido: copiá la ruta, pegala en la barra del Explorador de Windows y Enter.

---

## 1) Ficha de Play Store  ·  (Store listing)

| Campo en Play | Qué poner |
|---|---|
| **Nombre de la app** (8/30) | `Convoyar` |
| **Descripción breve** (≤80) | `Coordiná el convoy de tu grupo: quién lleva a quién, resuelto.` |
| **Descripción completa** (≤4000) | Copiá el texto de abajo ⬇️ |

**Descripción completa** (copiar tal cual):

```
Llegá con los tuyos, sin el quilombo de organizar.

Convoyar coordina los viajes compartidos de tu grupo. Vos cargás quién va y desde dónde; la app arma el convoy: quién lleva a quién, en qué auto, a qué hora y en qué punto de encuentro. Sin cadenas de WhatsApp interminables.

Para tu grupo (privado). Creá tu grupo o unite con un código. Ideal para clubes, oficinas, colegios, familias, iglesias y salidas.
O abierto a la comunidad (público). Publicá tu viaje o sumate al de alguien cerca.

Lo que hace por vos:
• Arma los convoyes automáticamente respetando lugares, desvíos y horarios de cada uno.
• Puntos de encuentro claros — tu domicilio exacto no se comparte, solo el punto.
• Ventana horaria flexible para entrar fácil a un viaje.
• Chat del convoy, reseñas y reputación para viajar con confianza.
• Andá en 6 idiomas, con modo claro y oscuro.

Gratis y para todos. Menos autos, menos gastos, menos CO₂ y más lugar para charlar en el camino. Armá tu primer convoy hoy.
```

---

## 2) Gráficos (Graphics)

Carpeta: `resources\store\`

| Campo en Play | Archivo a subir |
|---|---|
| **Ícono de la app** (512×512) | `resources\store\icon-512.png` |
| **Gráfico de funciones** (1024×500) | `resources\store\feature-graphic-1024x500.png` |
| **Video** | Dejar vacío (opcional). |

---

## 3) Capturas de pantalla (Screenshots)

Carpeta: `resources\store\phone\` — hay **6 imágenes**, todas 1080×1920.
Son válidas para teléfono **y** tablet, así que **subí las mismas 6 en cada slot**:

| Slot en Play | Qué subir |
|---|---|
| **Capturas de teléfono** * | Las 6 de `resources\store\phone\` (con 6 ya calificás para la promoción, que pide ≥4). |
| **Tablet de 7 pulgadas** * | Las mismas 6. |
| **Tablet de 10 pulgadas** * | Las mismas 6. |
| Chromebook / Android XR | Dejar vacío (opcional). |

Las 6 (en orden): `01-inicio` · `02-mi-viaje` · `03-convoy-armado` · `04-explorar` · `05-chat` · `06-perfil`.

---

## 4) La app en sí (el archivo que se instala)

En Play Console → **Prueba** o **Producción** → **Crear versión (release)** → subir el bundle:

```
android\app\build\outputs\bundle\release\app-release.aab
```

- Si Play te pregunta por la **firma de la app (Play App Signing)**: aceptá que Google la administre. Tu clave de subida ya está creada (`android\upload-keystore.jks`).
- **versionCode 1 / versionName 1.0.0** ya vienen puestos. En cada actualización futura hay que subir el versionCode +1.

---

## 5) Otras secciones obligatorias del Console

| Sección | Qué poner |
|---|---|
| **Política de privacidad (URL)** | `https://convoyar.com/privacidad` |
| **Anuncios** | **No**, la app no tiene anuncios. ✅ (ya lo pusiste) |
| **Clasificación de contenido** | Ya te la dieron (apta +3). ✅ |
| **Acceso a la app** (login de prueba para revisores) | Usuario `lolospanolasos@gmail.com`, contraseña `123456`. ✅ (ya lo pusiste) |
| **Seguridad de los datos (Data safety)** | Ver el detalle abajo ⬇️ |

### Data safety (respuestas sugeridas)

- **¿Recopila datos?** Sí.
- **¿Se cifran en tránsito?** Sí (HTTPS/TLS).
- **¿El usuario puede pedir que se borren?** Sí (se borran desde la app).
- **Datos que recopila** y su finalidad (todo para "Funcionalidad de la app", ninguno para publicidad):
  - **Correo electrónico** → gestión de la cuenta.
  - **Nombre** → identidad de usuario / funcionalidad.
  - **Ubicación aproximada** (origen/destino que el usuario ingresa) → funcionalidad. *No* es ubicación en segundo plano.
  - **Mensajes en la app** (chat) → funcionalidad.
  - **ID de dispositivo** (solo si activás push más adelante) → notificaciones.
- **¿Se comparten datos con terceros?** No se venden. Se procesan con proveedores de infraestructura (Supabase, Cloudflare) — eso es "procesamiento", no "compartir para publicidad".

> Estas respuestas coinciden con la Política de Privacidad publicada en `https://convoyar.com/privacidad`.

---

## Si necesitás regenerar algo

- **Capturas:** `npx playwright test e2e/store-screenshots.spec.ts` → vuelven a `resources\store\phone\`.
- **Ícono / gráfico:** están versionados en el repo; no hace falta regenerarlos.
- **AAB:** `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease` (con `ANDROID_HOME` seteado).
