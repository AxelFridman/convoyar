# 06 · Publish to the App Store (iOS)

> **What you'll achieve:** Convoyar on the iPhone, via the App Store. It's the same web build
> packaged with Capacitor, just like Android. The big difference: **iOS needs a Mac**
> and Apple is stricter and more expensive.

**Before:** same as Android — the web running with the real backend (docs [01](01-supabase-database.md)–[04](04-deploy-web-pwa.md)).
That backend is live: convoyar.com is already in production. Many concepts (privacy, versioning, testing)
are the same as [doc 05](05-google-play.md); here's what's specific to iOS.

| | |
|---|---|
| ⏱️ Time | ~1–2 days of setup + review (1–3 days typical) |
| 💰 Cost | **USD 99 / year** (Apple Developer Program) + eventually a Mac |
| 🧑 / 🤖 | Almost all **YOU** (on a Mac). No code change needed — delete account is already shipped ✅ |

> ### 📍 Status (2026-07-12): ⏳ pending — Phase 2
> You haven't started this. **You need a Mac** (Step 0) and the Apple Developer Program (USD 99/year).
> It comes after Phase 1. If you want to reach users fast and cheap, start with Web + Android
> and leave iOS for when you have the Mac sorted out. Web is already live in production and
> Android has a signed AAB (versionCode 3 / 1.0.2) in Google Play closed testing.

---

## ⚠️ Step 0 — The Mac problem (you're on Windows) 🧑

Xcode (required to sign and upload iOS apps) **only runs on macOS**. Your options:

| Option | Cost | For whom |
|---|---|---|
| **Borrowed / a friend's Mac** | USD 0 | You do it in a few sessions |
| **Mac mini** (a used one works) | ~USD 500–600 one time | If you're serious about iOS |
| **Mac in the cloud** (MacinCloud, MacStadium) | ~USD 20–30/month | One-off, without buying hardware |
| **CI that builds iOS for you** (Codemagic, Ionic Appflow, EAS, GitHub Actions macOS) | Free tier / per build | Automate builds without touching a Mac daily |

> 💡 **Recommendation:** for the first submission, get access to a Mac (borrowed or in the
> cloud) for a few hours. To maintain the app, a CI like **Codemagic** (it has a free tier)
> builds and uploads to TestFlight without you having to open Xcode every time.

If you're **not** going to do iOS right now, skip this doc: web + Android already cover most of
your users in Argentina. Come back when you have the Mac sorted out.

---

## Step 1 — Apple Developer Program 🧑 💰 ⏱️ 30 min + days of verification

1. **[developer.apple.com/programs](https://developer.apple.com/programs/)** → Enroll.
2. Pay **USD 99/year** (recurring; if you don't renew, the app is removed from the store).
3. Identity verification: can take from hours to several days. Start early.

---

## Step 2 — Delete account (Apple requirement) — already shipped ✅ 🤖

⚠️ **Apple requires (guideline 5.1.1(v)) that any app allowing account creation also allow
DELETING it from within the app.** "Email us" is not enough. Good news: **this is already done.**

- Profile → Settings has a **"Delete my account"** action that calls the `delete_my_account()`
  RPC (a `security definer` function). Most tables reference `members(id)` with
  `on delete cascade`, so deleting the member row cleans up legs, requests, reviews,
  trip history, messages, notifications, etc. See the [schema](01-supabase-database.md).
- The RPC also handles the edge cases: it deletes orgs where the user was the only member
  (including the personal "My trips" org), promotes the oldest member to admin in shared orgs
  that would otherwise be left with no admin, and finally deletes the user from `auth.users`
  (which frees the email and cuts off login) — this last step needs `service_role`-level
  access, which the `security definer` function provides.

This is also good practice (and Google requires it in Data safety), so it covers both stores.

---

## Step 3 — Add the iOS platform 🤖 (on the Mac) ⏱️ 20 min

```bash
npm i @capacitor/ios
npm run build
npx cap add ios         # crea ios/ (primera vez)
npx cap sync ios
npx cap open ios        # abre Xcode
```

The `appId` `convoyar.app` from `capacitor.config.json` is the **Bundle Identifier** on iOS.
⚠️ Just like on Android, once published **it can't be changed**.

---

## Step 4 — Icons, splash and signing in Xcode 🧑 ⏱️ 30 min

- Icons/splash: `npx capacitor-assets generate --ios` (same `icon.png`/`splash.png` from [doc 05](05-google-play.md)).
- In Xcode → app target → **Signing & Capabilities**: pick your **Team** (your Apple Developer
  account) and leave **Automatically manage signing** on. Xcode registers the Bundle ID and
  creates the certificates/profiles on its own.
- If you're going to use push ([doc 07](07-push-notifications.md)), add the
  **Push Notifications** capability here.

---

## Step 5 — App Store Connect: create the app 🧑 ⏱️ 2–3 h

In **[appstoreconnect.apple.com](https://appstoreconnect.apple.com)** → My Apps → **+**:

- **Name:** `Convoyar`. ⚠️ It must be **unique across the entire App Store**; if it's taken, use a
  subtitle or a slightly different name.
- **Bundle ID:** `convoyar.app` (the one Xcode registered).
- Primary language, category (e.g. "Travel" or "Lifestyle").
- **Listing:** description, keywords, **screenshots** (per iPhone size; you can generate them
  in the Xcode simulator), icon.
- **App Privacy** ("nutrition labels"): ⚠️ same as Google's Data safety —
  truthfully declare that you collect **email, location and user content** and what for.
- **Age rating.**
- **Privacy policy:** the URL from [doc 05 · Step 1](05-google-play.md).
- **Test account for the reviewer:** since the app requires login, leave an **email + password** for
  a demo account in the review notes. Apple **rejects** if it can't get in.

> ℹ️ **Sign in with Apple:** Apple only requires it **if** you offer third-party social login
> (Google/Facebook). Convoyar uses **email + password only**, so it **doesn't** apply to you. If some
> day you add "sign in with Google", you'll also have to add "sign in with Apple".

---

## Step 6 — Archive, upload and TestFlight 🧑

1. In Xcode: select the **Any iOS Device** destination, then **Product → Archive**.
2. In the Organizer that opens: **Distribute App → App Store Connect → Upload**.
3. In App Store Connect → **TestFlight**: the build appears after processing (~15–30 min).
   - **Internal testers** (up to 100, your team): no review, right away. Test on your iPhone.
   - **External testers:** require a lightweight beta review. Useful for testing with more
     people before production (Apple doesn't require the 14 days Google asks for, but testing is still worth it).

---

## Step 7 — Submit for review and publish 🧑

- In App Store Connect → your app → **Add for Review** → Submit.
- Apple's review usually takes **1–3 days**. It's stricter than Google's.
- You can choose automatic release on approval, or manual (you press the button).

### Typical Apple rejections (so they don't catch you out)

- **Guideline 4.2 "minimum functionality":** Apple rejects apps that are "just a wrapped
  website". Convoyar has maps, matching, push and its own flows → it's above that,
  but make sure it **feels like an app** (installation works, push works, it doesn't look like a browser).
- **Missing account deletion:** see Step 2. It's a frequent cause of rejection (and already handled).
- **Can't log in:** give them the test account (Step 5).
- **Inaccurate App Privacy:** declare the data correctly.

---

## Updating (future releases) 🔁

1. Web → `npm run build && npx cap sync ios`.
2. Bump the **Build number** (and `Version` when it's a public release) in Xcode.
3. **Archive → Upload** → new build to TestFlight/production.

---

## 💰 Costs and scale

- **USD 99/year** as long as you want to be in the store.
- Commissions only if you sell digital goods in-app → [doc 08](08-monetization.md).
- A Mac (bought or in the cloud) is the other real cost; see Step 0.

---

## ✅ Checklist for this doc

- [ ] Mac access sorted out (own / borrowed / cloud / CI)
- [ ] Apple Developer Program paid (USD 99) and identity verified
- [x] **"Delete my account"** flow implemented (Apple requirement) 🤖
- [ ] `npx cap add ios` + `sync` OK, opens in Xcode
- [ ] Automatic signing with your Team; Bundle ID `convoyar.app`
- [ ] Icons/splash generated
- [ ] App created in App Store Connect (unique name)
- [ ] **App Privacy** declared truthfully
- [ ] Privacy policy + test account for the reviewer loaded
- [ ] Build archived and uploaded; tested on TestFlight on a real iPhone
- [ ] Submitted for review

---

## 🆘 Common problems

- **"Xcode only on Mac"** → Step 0 (borrowed Mac, in the cloud, or CI like Codemagic).
- **4.2 rejection** → reinforce that it's a real app (push, maps, flows), not a web bookmark.
- **Rejection for not being able to delete an account** → already covered by the flow in Step 2.
- **"Invalid Bundle" / signing** → leave signing on automatic and confirm the correct Team.
- **The build doesn't appear in TestFlight** → wait for processing (~30 min) and check there are no
  "Missing Compliance" warnings (export encryption: you almost always answer "does not use
  non-standard encryption").

---

**Next:** [07 · Push notifications](07-push-notifications.md) → real notifications on both platforms.
