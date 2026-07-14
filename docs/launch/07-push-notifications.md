# 07 · Push notifications (real alerts)

> **What you'll achieve:** that a person **gets an alert on their phone even when the app is
> closed** ("You were accepted for the trip to the Delta!", "You have a new message"). Today
> `services/notify.ts` uses the browser's Notification API, which **only works with the app
> open** — it's not real push. This doc wires up real push on Android, iOS and web.

**Before this:** doc [01](01-supabase-database.md) (you already created the `device_tokens` table) and
having the native apps built (docs [05](05-google-play.md)/[06](06-app-store-ios.md)).

| | |
|---|---|
| ⏱️ Time | ~2–3 h (Firebase + plugin + Edge Function) |
| 💰 Cost | USD 0 (FCM and APNs are free) |
| 🧑 / 🤖 | Firebase/Apple = **YOU**; the plugin code and the sender = **CODE** |

> ### 📍 Status (2026-07-13): 🟡 credentials ready, code pending
> **You already have the Firebase project `convoyar-940ec` created** and its credentials in
> [`.env`](../../.env): the full web `firebaseConfig` (`VITE_FIREBASE_*`), VAPID (web push),
> `google-services.json` (Android) and the **admin service account** (sender). The
> `device_tokens` table already exists in the database ([doc 01](01-supabase-database.md) ✅).
> **What's missing is 100% code** (Steps 4–5: plugin + `registerPush` + Edge Function
> `send-push`). [Doc 03](03-connect-app.md) (login + real `meId`) is **already done**, so
> this is ready to tackle. Real push can only be *tested* with the app running on a device —
> not before.
>
> ⚠️ The service account (`convoyar-940ec-df257ecbfdb6.json`) is **full admin**: it's
> gitignored; its final home is the Supabase Edge Function *secrets*, not the repo.

---

## How push works (the mental model)

Real push has **three pieces**:

```
1) The phone REGISTERS and gets a unique "token"  ──►  you save it in device_tokens (Supabase)
2) Something happens (you're accepted, someone messages you) → a row is created in notifications
3) A SENDER (Edge Function) reads the recipient's tokens and sends them via FCM/APNs ──► ping on the phone
```

**The unified sender = Firebase Cloud Messaging (FCM).** FCM delivers to **Android**, and also to
**iOS** (by uploading an Apple key) and to **web**. A single integration for everything. Free.

The elegant part: your app **already creates rows in `notifications`** (the store's `diffNotifs`).
We'll hook push into **every insert on that table**, so every in-app alert also fires a push.

---

## Step 1 — Firebase project 🧑 ⏱️ 15 min

1. **[console.firebase.google.com](https://console.firebase.google.com)** → **Add project**
   (`convoyar`). It's free; you don't need the Blaze plan for basic FCM.
2. Inside the project you'll add one "app" per platform (Android, iOS, web) in the steps that follow.

---

## Step 2 — Android (FCM) 🧑🤖 ⏱️ 20 min

1. Firebase → Add app → **Android**. Package name: **`convoyar.app`**.
2. Download **`google-services.json`** and put it in **`android/app/google-services.json`** 🤖.
3. Install the Capacitor plugin:
   ```bash
   npm i @capacitor/push-notifications
   npx cap sync android
   ```
4. Capacitor + the plugin add what's needed in Gradle. If it asks for the `google-services`
   plugin, follow the message (add the classpath in the project's `build.gradle`).

---

## Step 3 — iOS (APNs via FCM) 🧑 ⏱️ 30 min (on the Mac)

⚠️ Push on iOS needs an **APNs key** and a **real iPhone** (the simulator doesn't receive push).

1. In **developer.apple.com → Certificates, IDs & Profiles → Keys** → create an **APNs Auth
   Key** (`.p8` file). Save the file, the **Key ID** and your **Team ID**.
2. In Firebase → Project Settings → **Cloud Messaging → Apple app config** → upload the `.p8`
   with its Key ID and Team ID.
3. Firebase → Add app → **iOS**, Bundle ID `convoyar.app` → download **`GoogleService-Info.plist`**
   → put it in **`ios/App/App/`** 🤖.
4. In Xcode add the **Push Notifications** capability (and **Background Modes → Remote
   notifications**) — see [doc 06 · Step 4](06-app-store-ios.md).
5. `npx cap sync ios`.

---

## Step 4 — Register the token on the client 🤖

`services/notify.ts` today has `requestNotifPermission()` and `systemNotify()`. Add native push
registration (and save the token to Supabase). Skeleton:

```ts
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabaseClient";

export async function registerPush(meId: string) {
  if (!Capacitor.isNativePlatform()) return registerWebPush(meId); // web: Step 6 (optional)

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

  // App open: show the in-app alert (systemNotify) so we don't bother with the OS banner
  PushNotifications.addListener("pushNotificationReceived", (n) => {
    systemNotify(n.title ?? "Convoyar", n.body ?? "");
  });
}
```

Call `registerPush(meId)` after login (where you already enable notifications during onboarding).
The token is saved in `device_tokens` (with the self-only RLS from [doc 01](01-supabase-database.md)).

---

## Step 5 — The sender: an Edge Function that fires the push 🤖

Create an Edge Function (`supabase functions new send-push`) that runs **when a row is
inserted into `notifications`** and sends push to the recipient's devices:

```ts
// supabase/functions/send-push/index.ts (Deno)
// Triggered by a Database Webhook: Database → Webhooks → on INSERT on public.notifications
import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async (req) => {
  const { record } = await req.json();               // the new notifications row
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

  // 1) does the user want this type of alert? (member_settings.notif_prefs)
  const { data: s } = await admin.from("member_settings")
    .select("notif_prefs").eq("member_id", record.member_id).single();
  // (check s?.notif_prefs.assignments / requests / chat depending on the type)

  // 2) the recipient's tokens
  const { data: tokens } = await admin.from("device_tokens")
    .select("token").eq("member_id", record.member_id);
  if (!tokens?.length) return new Response("no tokens");

  // 3) send via FCM HTTP v1 (auth with the Firebase service account, stored in secrets)
  for (const t of tokens) {
    await sendFcm(t.token, record.title, record.body);   // implement sendFcm with the Firebase access token
  }
  return new Response("ok");
});
```

- The **Firebase service account** (JSON from Project Settings → Service accounts) and the
  `SERVICE_ROLE_KEY` go as function **secrets** (`supabase secrets set ...`),
  ⚠️ **never** on the client.
- Wire the trigger with **Database → Webhooks → INSERT on `public.notifications`** pointing to
  the function. That way, every alert your store already generates becomes a push automatically.
- Respect `notif_prefs` (assignments/requests/chat) before sending: it's the per-channel
  preference that PR5 left in the model.

> 💡 FCM HTTP v1 requires an OAuth access token built from the service account. There are
> Deno/Node libs that do it in 3 lines; or use the Firebase admin SDK from the function.

---

## Step 6 — Web push (optional) 🤖

For the PWA in the browser you can use **FCM Web** (needs a **VAPID key** from Firebase and
logic in the `public/sw.js` service worker). It works on Chrome/Android and on iOS 16.4+ **only
if the PWA is installed**. It's fussier than native: leave it for after mobile push. In the
meantime, on web you keep using the Notification API you already have (app open).

---

## 💰 Costs and scale

- **FCM: free**, with very high limits (millions of messages). You won't pay for push.
- **APNs: free** (comes with your Apple Developer account from [doc 06](06-app-store-ios.md)).
- Supabase Edge Functions: included in the free tier (with a generous invocation quota).

---

## ✅ Checklist for this doc

- [ ] Firebase project created
- [ ] Android: `google-services.json` in `android/app/`, plugin installed
- [ ] iOS: APNs `.p8` key uploaded to Firebase, `GoogleService-Info.plist` in `ios/App/App/`, Push capability in Xcode
- [ ] `@capacitor/push-notifications` installed and `registerPush()` saving the token in `device_tokens`
- [ ] Edge Function `send-push` deployed, with the service account and `SERVICE_ROLE_KEY` in secrets
- [ ] Database Webhook: INSERT on `notifications` → `send-push`
- [ ] `notif_prefs` respected before sending
- [ ] Tested on a **real phone** (Android and iOS): with the app closed, the alert arrives ✅

---

## 🆘 Common problems

- **Nothing arrives on iOS** → the APNs key is missing in Firebase, the Push capability in
  Xcode, or you're testing on the simulator (it doesn't receive push; use a real iPhone).
- **Nothing arrives on Android** → `google-services.json` is in the wrong place, or you didn't
  run `npx cap sync`.
- **The token isn't saved** → RLS: confirm the user has a linked member
  ([doc 02](02-auth.md)) so `device_tokens` with the self-policy accepts it.
- **It arrives duplicated / to the wrong person** → check that the sender filters by the
  `record`'s `member_id` and respects `notif_prefs`.
- **The sender fails with 401** → the FCM access token (from the service account) isn't being
  generated correctly; check the JSON in secrets and the scopes.

---

**Next:** go back to the [README](README.md) for the master checklist, or continue with
[08 · Monetization](08-monetization.md), [09 · OSRM routing](09-routing-osrm.md) and
[10 · Analytics](10-analytics-monitoring.md) once you have traction.
