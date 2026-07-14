# ✅ Completing Google Play Console — step by step (foolproof)

Everything Play asks for, with **the exact value to copy** or **the exact file to upload**.
The files are on your computer, inside the project folder:

```
C:\Users\fridm\Downloads\caravana-src\caravana\
```

> 💡 To open a folder quickly: copy the path, paste it into the Windows Explorer address bar, and press Enter.

---

## 1) Play Store listing  ·  (Store listing)

| Field in Play | What to enter |
|---|---|
| **App name** (8/30) | `Convoyar` |
| **Short description** (≤80) | `Coordiná el convoy de tu grupo: quién lleva a quién, resuelto.` |
| **Full description** (≤4000) | Copy the text below ⬇️ |

**Full description** (copy as-is):

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

## 2) Graphics

Folder: `resources\store\`

| Field in Play | File to upload |
|---|---|
| **App icon** (512×512) | `resources\store\icon-512.png` |
| **Feature graphic** (1024×500) | `resources\store\feature-graphic-1024x500.png` |
| **Video** | Leave empty (optional). |

---

## 3) Screenshots

Folder: `resources\store\phone\` — there are **6 images**, all 1080×1920.
They work for phone **and** tablet, so **upload the same 6 in every slot**:

| Slot in Play | What to upload |
|---|---|
| **Phone screenshots** * | All 6 from `resources\store\phone\` (with 6 you already qualify for the promotion, which requires ≥4). |
| **7-inch tablet** * | The same 6. |
| **10-inch tablet** * | The same 6. |
| Chromebook / Android XR | Leave empty (optional). |

The 6 (in order): `01-inicio` · `02-mi-viaje` · `03-convoy-armado` · `04-explorar` · `05-chat` · `06-perfil`.

---

## 4) The app itself (the file that gets installed)

In Play Console → **Testing** or **Production** → **Create release** → upload the bundle:

```
android\app\build\outputs\bundle\release\app-release.aab
```

- If Play asks about **app signing (Play App Signing)**: let Google manage it. Your upload key is already created (`android\upload-keystore.jks`).
- **versionCode 3 / versionName 1.0.2** are already set. Each future update must bump the versionCode by +1.

> The signed AAB v3 is already uploaded to Google Play **closed testing** (package `convoyar.app`); the "12 testers × 14 days" requirement is in progress.

---

## 5) Other required Console sections

| Section | What to enter |
|---|---|
| **Privacy policy (URL)** | `https://convoyar.com/privacidad` |
| **Ads** | **No**, the app has no ads. ✅ (already done) |
| **Content rating** | Already assigned (rated +3). ✅ |
| **App access** (test login for reviewers) | User `lolospanolasos@gmail.com`, password `123456`. ✅ (already done) |
| **Data safety** | See the details below ⬇️ |

### Data safety (suggested answers)

- **Does it collect data?** Yes.
- **Is it encrypted in transit?** Yes (HTTPS/TLS).
- **Can the user request deletion?** Yes (deleted from within the app).
- **Data it collects** and its purpose (all for "App functionality", none for advertising):
  - **Email address** → account management.
  - **Name** → user identity / functionality.
  - **Approximate location** (origin/destination the user enters) → functionality. It is *not* background location.
  - **In-app messages** (chat) → functionality.
  - **Device ID** (only if you enable push later) → notifications.
- **Is data shared with third parties?** It is not sold. It is processed by infrastructure providers (Supabase, Cloudflare) — that is "processing", not "sharing for advertising".

> These answers match the Privacy Policy published at `https://convoyar.com/privacidad`.

---

## If you need to regenerate something

- **Screenshots:** `npx playwright test e2e/store-screenshots.spec.ts` → they go back to `resources\store\phone\`.
- **Icon / graphic:** they are versioned in the repo; no need to regenerate them.
- **AAB:** `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease` (with `ANDROID_HOME` set).
