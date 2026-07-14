# 05 · Publish to Google Play (Android)

> **What you'll achieve:** your app on the Play Store, installable from anyone's phone.
> Convoyar is already set up for this: Capacitor is configured (`convoyar.app`), the `android/`
> platform is added, and a signed AAB is already built — the app is now going through Google's
> Play Console process (see status below).

**Before you start:** the web must already work against the real backend (docs [01](01-supabase-database.md)–[04](04-deploy-web-pwa.md)),
because the Android app is **that same web** packaged. It's also ideal to have the
[doc 07 · Push](07-push-notifications.md) resolved before the final version.

| | |
|---|---|
| ⏱️ Time | ~1 day of setup + **14 days of mandatory testing** (see ⚠️ Step 9) + review days |
| 💰 Cost | **USD 25** one-time, for life |
| 🧑 / 🤖 | The bulk is **YOU** (accounts, signing, Console). The occasional minor code change is 🤖 |

> ### 📍 Status (2026-07-14): ✅ **In Google Play CLOSED testing** — signed AAB v3 uploaded
> The agent built and signed the bundle on this machine (Android Studio SDK detected), and it's now
> uploaded to Play Console and running in closed testing. Done:
> - ✅ Capacitor 8 deps + `android/` platform synced with the PROD web (Supabase `qlcwluvhrbkwjkjigsog`).
> - ✅ **Upload key generated**: `android/upload-keystore.jks` (alias `convoyar-upload`), with its
>   credentials in `android/keystore.properties`. **Both are gitignored.** ⚠️ **BACK UP both
>   files in 2 safe places**: without them you can't update the app.
>   Upload key SHA-256: `A6:C2:98:B4:71:AD:A8:3F:33:A1:BD:AE:F5:5A:85:E7:91:C4:07:6D:CE:A9:1E:21:74:71:5A:F0:48:22:6C:5F`.
> - ✅ **Signed `.aab`**: `android/app/build/outputs/bundle/release/app-release.aab` (~3.4 MB). Uploaded to Play.
>   To regenerate it: `export ANDROID_HOME=<sdk>; npm run build && npx cap sync android && (cd android && ./gradlew bundleRelease)`.
> - ✅ **Versioning**: `versionCode 3`, `versionName "1.0.2"` (bump `versionCode` +1 on every future release).
> - ✅ **Store listing assets generated**: `resources/store/icon-512.png` (512×512 icon) and
>   `resources/store/feature-graphic-1024x500.png` (feature graphic 1024×500).
> - ✅ **Store copy** (name / short & long description, 6 languages) in [`docs/BRAND.md`](../BRAND.md).
> - ✅ **Public privacy policy** for the form: `https://convoyar.com/privacidad` (convoyar.com is now live in production).
>
> **What's left is YOURS** (needs your account and identity, already verified): keep the **closed
> test** running for the full 14 days with its 12 testers (Step 9), finish any store-listing items
> Console still flags (see the screenshots note below), and then promote to **production**. The app
> and signed `.aab` are already uploaded and the closed test is live. Values ready to paste are
> further down (Step 8) and in `docs/BRAND.md`.
>
> ⚠️ **Phone screenshots still needed for the production listing** (min. 2): grab them from the
> emulator/device with the app running, or from the browser at mobile size. Play won't accept the
> production listing without at least 2.

> ✅ **Good news for you:** Android is developed **on Windows** without any problem (unlike iOS,
> which needs a Mac — see [doc 06](06-app-store-ios.md)). Your Windows 11 is enough.

---

## Step 0 — Install the tools 🧑 ⏱️ 30–60 min

1. **[Android Studio](https://developer.android.com/studio)** (brings the Android SDK and the JDK).
   Install it with the default options and let it download the SDK the first time it opens.
2. Node 20+ (you already have it) and the repo building (`npm run build` green).
3. `keytool` (for signing) comes with Android Studio's JDK — you don't install anything extra.

---

## Step 1 — Privacy policy ⚠️ 🧑 ⏱️ 1–2 h

> ✅ **Already done for Convoyar:** the privacy policy (and terms) are published in all 6 languages,
> live at `https://convoyar.com/privacidad`. The rest of this step is the general recipe.

⚠️ **Mandatory.** Google (and Apple) **reject** the app without a public privacy-policy URL. And
heads up: the project's old line "the app doesn't send data to servers" **is no longer true** now
that you've connected Supabase. You now collect email, locations (home, destinations) and content
(messages, reviews).

- Write an honest policy: what data you request, what for, where it's stored (Supabase), that it's
  not sold, how the account is deleted, and a contact.
- Publish it at a stable URL: it can be a page on your domain (`convoyar.com/privacidad`) or a
  static route served by the same hosting from [doc 04](04-deploy-web-pwa.md).
- You can start from a generator (Termly, iubenda have a free tier) **but review it** so it tells
  the truth about what Convoyar does. Don't copy a generic one that lies.

---

## Step 2 — Google Play Console account 🧑 💰 ⏱️ 30 min (+ verification)

> ✅ **Already done for Convoyar:** the account is paid and the identity is verified (the app is
> already in Play Console). This step stays here for reference.

1. Go to **[play.google.com/console](https://play.google.com/console)** → pay the **USD 25**
   (one time, forever).
2. Choose account type: **Personal** (for you) or **Organization** (company; requires a
   D-U-N-S number). To get started, Personal.
3. ⚠️ **Identity verification:** Google asks for a document and your details. It can take hours
   to days. Do it as soon as you create the account, don't leave it for the end.

---

## Step 3 — Add the Android platform ✅ DONE 🤖

Already done: the Capacitor deps are installed, the `android/` folder exists in the repo and is
synced with the production web. The commands that were run (for your reference):

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android   # ✅ done (Capacitor 8)
npm i -D @capacitor/assets                                # ✅ done
npm run build            # ✅ generates dist/ with the PROD env vars (project qlcwluvhrbkwjkjigsog)
npx cap add android      # ✅ created the android/ folder (only the first time)
npx cap sync android     # ✅ copied dist/ + plugins into the native project
```

The only thing left in this step is to **open the project in Android Studio** (after installing it, Step 0):

```bash
npx cap open android     # opens Android Studio with the android/ project
```

`capacitor.config.json` already has the important bits:

```json
{ "appId": "convoyar.app", "appName": "Convoyar", "webDir": "dist", "server": { "androidScheme": "https" } }
```

> ⚠️ **`convoyar.app` is your identity forever.** Once you publish with that `applicationId`, it
> **can't be changed** (it would be a different app). It's well chosen, don't touch it.

> 🔁 **Every time you change the web**, re-run `npm run build && npx cap sync android` before
> rebuilding the `.aab`. The `android/` folder is generated: don't hand-edit things Capacitor
> regenerates; native changes go in the files Capacitor respects.

---

## Step 4 — Icons and splash ✅ DONE 🤖

Already generated from `public/icon.svg`:

- `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732) — the sources.
- All the Android mipmap sizes (adaptive icons) and splash, created with:

```bash
npx capacitor-assets generate --android   # ✅ done
```

> 💅 **Polish detail (optional):** since only `icon.png` was provided, the *adaptive icon* background
> defaulted to white. If you want a cleaner icon (brand background + logo cropped into the safe
> zone), add a `resources/icon-foreground.png` and a `resources/icon-background.png` and re-run
> `npx capacitor-assets generate --android`. It's not a blocker for publishing.

If you change the sources in `resources/`, re-run the command above and then `npx cap sync android`.

---

## Step 5 — Versioning ✅ DONE 🤖

Already set in `android/app/build.gradle` (inside `defaultConfig`): **`versionCode 3`** and
**`versionName "1.0.2"`**. For the next uploads:

- **`versionCode`** (integer): **bump it +1 on every upload** to Play. If you reuse one that's
  already been used, Play rejects the `.aab`.
- **`versionName`** (text, e.g. `"1.0.3"`): what the user sees.

---

## Step 6 — Generate your signing keystore ⚠️⚠️ 🧑 ⏱️ 15 min

> ✅ **Already done for Convoyar:** the upload key is generated (`android/upload-keystore.jks`) and
> the `.aab` is signed with it. Keep this step as a reference — and above all **make sure the
> keystore and its passwords are backed up.**

This is **the step where you can't make a mistake**. The *keystore* is the file with your signing
key. Generate it once and **guard it like gold**:

```bash
keytool -genkey -v -keystore convoyar-upload.keystore \
  -alias convoyar -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and some details. When it finishes you have `convoyar-upload.keystore`. Store
it in the **repo root** (next to `package.json`) or wherever you prefer — you define the path below.

> On Windows with Android Studio installed, `keytool` lives in the JDK that comes with Android Studio.
> If `keytool` "is not recognized", use the full path, e.g.:
> `& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore ...`

⚠️ **Back up the `.keystore` file AND the passwords in at least 2 safe places**
(a password manager + an encrypted backup). If you lose it:

- With **Play App Signing** (on by default today) Google keeps the *app signing key*; you only sign
  with an *upload key*. If you lose the upload key, it can be **reset** by asking Google support.
  Less catastrophic than before, but still a days-long headache. **Don't lose it.**

### Configure signing in the project ✅ ALREADY PRECONFIGURED 🤖

`android/app/build.gradle` **already has `signingConfigs.release` set up**: it reads
`android/keystore.properties` **if that file exists**. If it doesn't exist (as it does not by
default), the debug build still works and the release stays unsigned. **You only have to create that
file with your secrets.** There's a ready-made template: **`android/keystore.properties.example`**.

1. Copy the template:

   ```bash
   cp android/keystore.properties.example android/keystore.properties
   ```

2. Edit `android/keystore.properties` with your real data (the `storeFile` paths are **relative to
   the `android/` folder**; `../` points to the repo root):

   ```
   storeFile=../convoyar-upload.keystore
   storePassword=YOUR_PASSWORD
   keyAlias=convoyar
   keyPassword=YOUR_PASSWORD
   ```

> ✅ `android/keystore.properties`, `*.keystore` and `*.jks` **are already in `.gitignore`** — they
> don't get committed. Still, check with `git status` before any commit that they don't show up.

With that file in place, `./gradlew bundleRelease` signs on its own. And if you prefer the visual
route, Android Studio signs it just the same from **Build → Generate Signed Bundle** (Step 7)
without touching anything.

---

## Step 7 — Build the signed `.aab` 🧑 ⏱️ 10 min

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.

- Pick your `convoyar-upload.keystore`, enter the passwords, alias `convoyar`.
- Variant: **release**.
- You get an **`app-release.aab`** in `android/app/release/`.

⚠️ For Play you upload an **`.aab`** (Android App Bundle), **not an `.apk`**. The `.apk` is for
installing by hand on a test phone (`Build → Build APK`), not for the store.

---

## Step 8 — Set up the listing in Play Console 🧑 ⏱️ 2–3 h

In Console → **Create app**. Suggested default language: **Spanish (Latin America) es-419**.
Then complete EVERYTHING Console flags with ⚠️ (it won't let you publish with anything missing):

- **Play Store listing:** name (`Convoyar`), short description (≤80 chars), long description,
  **screenshots** (min. 2 phone; you can use/regenerate the ones in `docs/screenshots/`),
  **512×512 icon**, **feature graphic 1024×500**.
- **Content rating:** IARC questionnaire (answer honestly; for an app like this, a low rating).
- **Target audience and content:** age range.
- **Data safety:** ⚠️ **mandatory and verified** form. Declare truthfully what Convoyar collects
  now: **email** (for login), **location** (home/destinations), **user content** (messages,
  reviews). State that it travels encrypted (HTTPS) and that the user can delete their account.
  Lying here = suspension.
- **App access:** since the app requires login, give the reviewer a **test user** (email +
  password of a demo account) so they can get in.
- **Privacy policy:** paste the URL from Step 1.

---

## Step 9 — Mandatory testing ⚠️ (the one that blocks everyone) 🧑

Google uses release **tracks** (channels):

1. **Internal testing:** up to 100 testers by email, available **right away**. Upload your `.aab`
   here first and test the real install on your phone.
2. **Closed testing:** ⚠️ **for new personal accounts, Google requires a closed-testing period with
   a minimum number of testers (currently 12) who stay opted-in for 14 consecutive days BEFORE you
   can move to production.** Confirm the exact number in Console (it has changed over time). **This
   means you can't publish on day 1:** gather 12 people you know, have them join the test and keep
   the app installed for two weeks.
3. **Production:** only after that do you enable production, with a *staged rollout* (start at a %
   of users and ramp up).

> 📍 **Convoyar is right here now:** the app is in **closed testing** with 12 testers and the 14-day
> window is **in progress**. Once it completes, the next step is promoting to production.

> 💡 **Plan the calendar.** Add the 14 days of closed testing + Google's review days. If you want to
> launch by a certain date, start closed testing ~3 weeks earlier.

---

## Step 10 — Submit for review and publish 🧑

- When you move to production, Google reviews the app. The **first** review usually takes from a
  few days up to 1–2 weeks.
- Technical requirements Play checks on its own (Capacitor meets them, but keep it on your radar):
  the app must **target a recent API level** (Play raises the minimum every year). If Console
  complains, update `targetSdkVersion` in `build.gradle` and rebuild.

---

## Updating the app (future releases) 🔁

> 🔁 **Key reminder: to update the Android app, always run first**
> **`npm run build && npx cap sync android`.** That rebuilds the PROD web and copies it into the
> native project. If you forget, the `.aab` ships with the old version of the web.

1. Web changes → **`npm run build && npx cap sync android`**.
2. Bump `versionCode` (+1) and `versionName` in `android/app/build.gradle`.
3. Generate the signed `.aab` (same keystore) → upload it to a track → production.

---

## 💰 Costs and scale

- **USD 25 one-time.** There's no recurring cost for keeping the app published.
- Fees **only** if you sell something digital inside the app → see [doc 08](08-monetization.md).
- There's no "scaling" to pay for here: Play serves the downloads for free.

---

## ✅ Checklist for this doc

- [x] ✅ Android platform added: `npx cap add android` + `sync` OK (`android/` folder in the repo)
- [x] ✅ Icons/splash generated (from `public/icon.svg`)
- [x] ✅ Signing preconfigured via `keystore.properties` in `build.gradle` (+ `.example` template)
- [x] ✅ Versioning: `versionCode 3`, `versionName "1.0.2"`
- [x] ✅ `keystore.properties`, `*.keystore`, `*.jks` and build artifacts in `.gitignore`
- [x] Android Studio installed and `npm run build` green
- [x] Privacy policy published at a stable URL
- [x] Play Console account paid (USD 25) and **identity verified**
- [x] Project opened in Android Studio (`npx cap open android`)
- [x] **Keystore generated and backed up in 2 places + passwords saved** ⚠️ (Step 6)
- [x] `android/keystore.properties` created from the template and filled with your data
- [x] **Signed** `.aab` generated (release) in Android Studio
- [ ] Listing complete: descriptions, screenshots, icon, graphic, rating
- [ ] **Data safety** completed truthfully (email, location, content)
- [ ] Test user given to the reviewer (the app requires login)
- [ ] Internal testing OK on a real phone
- [ ] Closed testing with 12 testers running (14 days) — **IN PROGRESS**
- [ ] Production submitted for review

---

## 🆘 Common problems

- **"Version code X has already been used"** → bump `versionCode` (+1) and rebuild.
- **"You uploaded an APK... expected an App Bundle"** → you uploaded an `.apk`; upload the `.aab`.
- **"Upload key mismatch" / invalid signature** → you signed with a different keystore than the
  first time. Always use the same one. If you lost it, ask support to reset the upload key (Play
  App Signing).
- **Rejected for incomplete or false Data safety** → fill it truthfully (you collect email,
  location, content). It's the most common one for apps with a backend.
- **Rejected for missing privacy policy** → Step 1, public and accessible URL.
- **"I can't move to production yet"** → it's the mandatory closed testing (Step 9); wait the 14
  days with the testers active.

---

**Next:** [06 · App Store iOS](06-app-store-ios.md) (needs a Mac) · or [07 · Push](07-push-notifications.md) for the alerts.
