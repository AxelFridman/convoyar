# 🚀 Launching Convoyar — step-by-step operations guide

> **What this folder is.** Convoyar's real backend is **already connected** (Supabase: **email +
> password** auth, orgs, realtime, RLS; migrations run in dev and prod), and the app is **live in
> production** at `convoyar.com` as an installable PWA. Two people on two phones already see the
> same trip. What's left to launch fully —native push, publishing to production on Google Play and
> App Store— is mostly stuff **you do with the mouse and sometimes with the credit card**
> (dashboards, store fees, uploading files, signing). This folder is your master checklist: one
> document per piece, in order, built for the **free tier** and easy to scale. (The app still runs
> 100% locally in tests and `build:single` via the `hasSupabase` switch, see
> [AGENTS.md](../../AGENTS.md).)

> **Chosen stack:** Supabase (Postgres + Auth + Realtime) as the backend, web deploy on
> Cloudflare Pages / Netlify, and the native apps with Capacitor to **Google Play** and **App Store**.

---

## 📍 Current state (2026-07-14)

What's **actually** done as of today:

| Piece | Status | Detail |
|---|---|---|
| Supabase projects (prod + dev) | ✅ **done** | `convoyar-prod` (`qlcwluvhrbkwjkjigsog`) and `convoyar-dev`; keys in `.env` |
| Schema + migrations (prod **and** dev) | ✅ **done** | `schema.sql` + `migrate-v3-to-v4` / `-personal-org` / `-orgs` / `-moderation` + `migrate-review-gate.sql` + `migrate-trip-history.sql` all run |
| RLS (security) | ✅ **active** | on for every table (`server/rls.sql` + migrations) → [01](01-supabase-database.md) |
| Realtime | ✅ **enabled** | shared tables in the `supabase_realtime` publication (ships in the v4 migration) |
| Auth | ✅ **real: email + password** | `services/auth.ts` + `screens/Auth.tsx` (sign-up, login, reset). **It's not OTP** → [02](02-auth.md) |
| **App connected to Supabase** | ✅ **done** | `@supabase/supabase-js`, `supabaseClient.ts`, `repo.ts`; real multi-user → [03](03-connect-app.md) |
| Web deploy (Cloudflare Pages) | ✅ **LIVE in production** | `convoyar.com` (project `convoyar-web`, direct upload via `npm run deploy`) → [04](04-deploy-web-pwa.md) |
| Domain `convoyar.com` | ✅ **live** | owned and pointed at the `convoyar-web` deploy; the flip is done → [04](04-deploy-web-pwa.md) |
| Android (Capacitor) | ✅ **signed AAB in closed testing** | signed AAB v3 (versionCode 3 / 1.0.2), package `convoyar.app`, in Google Play **closed testing** (12 testers × 14 days in progress) → [05](05-google-play.md) |
| Private organizations | ✅ **complete end-to-end** | create/join by code, invite by email, self-serve link, deep-link `?join=CODE`, switcher, leave, admins — in 6 languages → [03](03-connect-app.md) |
| Moderation (report / block) | ✅ **wired end-to-end** | report → server-side pause; block/unblock, in 6 languages |
| Reputation (reviews) | ✅ **shipped** | reviews only between co-travelers (`canReview` + RLS `share_trip`); real trip history materialized (`materialize_my_trips`) |
| Legal (privacy + terms) | ✅ **published** | in all 6 languages, plus delete account + sign out |
| Native push | ⏳ **pending** | blocked on human credentials (FCM/APNs) → [07](07-push-notifications.md) |
| iOS | ⏳ **pending** | requires macOS → [06](06-app-store-ios.md) |
| Sentry / analytics | 🟡 **partial** | DSN in `.env`; still needs wiring (optional, Phase 3) → [10](10-analytics-monitoring.md) |

> **In one sentence:** the app is **already truly multi-user** (Supabase connected, RLS, realtime,
> email + password auth), **live in production** at `convoyar.com`, and a **signed AAB is in Google
> Play closed testing**. The next milestones are finishing closed testing, wiring native push, then
> pushing to Play production and iOS.

**Your shortest path to a full launch:** finish Play closed testing (12 testers × 14 days)
([doc 05](05-google-play.md), 🧑 you) → native push ([doc 07](07-push-notifications.md), 🤖) →
Play production ([doc 05](05-google-play.md), 🧑 you) → iOS ([doc 06](06-app-store-ios.md), 🧑 you).

---

## 🧭 How to read this guide

Every step is labeled so you know right away whose court the ball is in:

| Icon | Means |
|---|---|
| 🧑 **YOU** | You do it by hand: create an account, click through a dashboard, pay, upload a file, sign. **Claude can't do this for you.** |
| 🤖 **CODE** | A change in the repo. Some are already done (marked ✅); others Claude does in a PR. You just review and merge. |
| 💰 | Costs money (or may, if you scale). |
| ⏱️ | Estimated time for the task. |
| ⚠️ | Trap / something that hurts if you get it wrong. Read it twice. |

**Golden rule of this guide:** never paste a secret key (`service_role`, signing keys,
tokens) into the code or into git. They go in environment variables and secret
managers. Each doc tells you exactly where.

---

## 🗺️ State: what's real and what's mocked today

| Piece | Today | After this guide |
|---|---|---|
| Matching engine | ✅ **Real** (pure TS, `src/engine/`) | Same (moves to the server as-is if needed) |
| Maps | ✅ **Real** (Leaflet + OpenStreetMap) | Same |
| Database | ✅ **Postgres on Supabase, multi-user** (localStorage stays as cache) | Same → **[01](01-supabase-database.md)** |
| Login / auth | ✅ **Real: email + password** (`services/auth.ts`) | Same → **[02](02-auth.md)** |
| Sync between real people | ✅ **Supabase Realtime** (`subscribeRealtime`); the simulation is gated to local mode | Same → **[03](03-connect-app.md)** |
| Web on the internet | ✅ **Live in production** at `convoyar.com` (installable PWA) | Same → **[04](04-deploy-web-pwa.md)** |
| App on Google Play | ✅ **Signed AAB v3 in closed testing** (12 testers × 14 days) | Published to production → **[05](05-google-play.md)** |
| App on App Store | ❌ (requires macOS) | Published → **[06](06-app-store-ios.md)** |
| Push notifications | ❌ Browser Notification API only (native blocked on human credentials) | ✅ FCM / APNs / Web Push → **[07](07-push-notifications.md)** |
| Moderation (report / block) | ✅ **Wired end-to-end** (`migrate-moderation.sql`; report → server-side pause, block/unblock) | Same |
| Reputation (reviews) | ✅ **Shipped** (co-travelers only; real trip history materialized) | Same |
| Private organizations | ✅ **Complete end-to-end** (create/join, invite, link, deep-link, switcher, admins) | Same |
| Monetization | ⚪ Wired and **off** (`billing.ts`) | ⚪ On whenever you want → **[08](08-monetization.md)** |
| Real street routing | ⚪ Mock (haversine); OSRM adapter written | ⚪ Self-hosted OSRM (optional) → **[09](09-routing-osrm.md)** |
| Errors / product metrics | 🟡 Sentry DSN in `.env`; still needs wiring | ✅ Sentry + PostHog free → **[10](10-analytics-monitoring.md)** |

✅ done · 🏗️ scaffolded · 🟡 partial · ❌ missing · ⚪ optional or for later

---

## 📋 Recommended order (and why)

Do it in phases. Each phase leaves something **usable and demoable**; you don't need to do
everything at once. Phase 1 is already done — the app is live in production with real users.

### Phase 0 — Before you start (30 min) 🧑
- Create the free accounts you'll need (all free tier): [GitHub](https://github.com)
  (you already have it), [Supabase](https://supabase.com), [Cloudflare](https://cloudflare.com).
- Install the local basics: Node 20+, Git, and (for later) Android Studio.

### Phase 1 — The app is real and in production ✅ (done) 💰 ~USD 0
1. ✅ **[01 · Supabase / database](01-supabase-database.md)** — project, DB, migrations and RLS.
2. ✅ **[02 · Real auth](02-auth.md)** — login with **email + password**.
3. ✅ **[03 · Connect the app](03-connect-app.md)** — front end plugged into the backend; simulation gated.
4. ✅ **[04 · Web deploy / PWA](04-deploy-web-pwa.md)** — **live in production at `convoyar.com`**.
> 🎉 You can send a friend the `convoyar.com` link and you both see the same trip.

### Phase 2 — It's in the stores (2–4 days of work + review days) 💰 USD 25 + USD 99/year
5. **[05 · Google Play](05-google-play.md)** — Android. 💰 USD 25 (one-time). *Signed AAB already in closed testing.*
6. **[07 · Push notifications](07-push-notifications.md)** — real alerts (do it with or before Play).
7. **[06 · App Store iOS](06-app-store-ios.md)** — ⚠️ **you need a Mac**. 💰 USD 99/year.

### Phase 3 — When you have traction (later) 💰 depends on scale
8. **[10 · Analytics and monitoring](10-analytics-monitoring.md)** — find out what's happening (better to do it NOW, it's free).
9. **[08 · Monetization](08-monetization.md)** — charge / ads, when it makes sense.
10. **[09 · OSRM routing](09-routing-osrm.md)** — real street detours, when the mock isn't enough.

---

## 💰 How much it costs (realistic)

**To launch on all three platforms, first year:**

| Item | Cost | Required? |
|---|---|---|
| Supabase (Free) | USD 0 | Yes (backend) |
| Cloudflare Pages / Netlify (web) | USD 0 | Yes (web) |
| Firebase / FCM (push) | USD 0 | Recommended |
| Google Play Console | **USD 25** (one-time, lifetime) | Only if you want Android |
| Apple Developer Program | **USD 99 / year** | Only if you want iOS |
| Own domain `convoyar.com` | ✅ bought and live | Yes (already yours and pointed at the deploy) |
| Sentry + PostHog | USD 0 (free tier) | Recommended |
| **Minimum total to launch on all 3** | **≈ USD 124 first year** | (USD 25 is one-time) |

**When you actually start paying** (only once you have users): Supabase Free handles around
~50,000 monthly active auth users and 500 MB of database. The next step is **Supabase Pro USD 25/month**.
The rest (Cloudflare, FCM) scales free by a lot. Details in each doc.

> ⚠️ **Supabase Free pauses the project after 7 days of inactivity.** For a demo that's fine;
> for real production you want someone using it regularly or you move to Pro. It's not a
> problem until you have traffic.

---

## ✅ Master launch checklist

Copy this and start ticking. The detail for each item is in the linked doc.

**Phase 1 — Backend + web**
- [x] 🧑 Supabase account created and projects `convoyar-prod` + `convoyar-dev` up → [01](01-supabase-database.md)
- [x] 🧑 SQL schema + migrations (`v3-to-v4`, `personal-org`, `orgs`, `moderation`, `review-gate`, `trip-history`) run in prod **and** dev → [01](01-supabase-database.md)
- [x] 🧑 **RLS enabled** on every table + Realtime enabled → [01](01-supabase-database.md)
- [x] 🤖 **Email + password** auth wired (`services/auth.ts`, `screens/Auth.tsx`) → [02](02-auth.md)
- [ ] 🧑 Own SMTP (Resend) for volume/production — optional to start (Supabase sends with its default SMTP) → [02](02-auth.md)
- [x] 🤖 **App connected to Supabase** (`@supabase/supabase-js`, `supabaseClient.ts`, `repo.ts`, realtime; simulation gated) → [03](03-connect-app.md)
- [x] 🧑 Web deployed (**live in production** with the `VITE_SUPABASE_*` env vars baked in) → [04](04-deploy-web-pwa.md)
- [x] 🧑 **Production flip**: `convoyar.com` pointed at the `convoyar-web` deploy → [04](04-deploy-web-pwa.md)
- [x] 🧑 **Tested with two different devices** seeing the same trip

**Phase 2 — Stores**
- [x] 🧑 **Privacy policy** page published (required in both stores; privacy + terms live in all 6 languages) → [05](05-google-play.md)
- [x] 🧑 Google Play Console account (USD 25) → [05](05-google-play.md)
- [x] 🧑 **Signing keystore generated and backed up in 2 places** ⚠️ → [05](05-google-play.md)
- [ ] 🤖 Push integrated in the code (`services/notify.ts` → FCM) → [07](07-push-notifications.md)
- [ ] 🧑 Signed `.aab` in closed testing → production (currently in **closed testing**; production pending) → [05](05-google-play.md)
- [ ] 🧑 (iOS) Mac + Apple Developer (USD 99) + build to TestFlight → [06](06-app-store-ios.md)

**Phase 3 — Operations**
- [ ] 🧑 Sentry (errors) and PostHog (analytics) connected → [10](10-analytics-monitoring.md)
- [ ] 🧑 DB backups verified (Supabase does them, confirm) → [01](01-supabase-database.md)

---

## 🧩 How it relates to the code PRs (ROADMAP.md)

This guide is **complementary** to [docs/ROADMAP.md](../ROADMAP.md). That file tracks the
**code** (the PRs Claude does); this folder tracks the **infrastructure** (what you do). They
touch in two places:

- **`feat/supabase-connect`** connected the backend: `services/auth.ts` (**email + password**),
  `services/supabaseClient.ts`, `services/repo.ts` (AppState ⇄ tables + realtime) → see
  **[02](02-auth.md)** and **[03](03-connect-app.md)**.
- **PR7 `feat/server-skeleton`** planned a dedicated server with Postgres. With Supabase it
  **wasn't needed** to launch (Supabase provides the DB and the API via RLS). The dedicated
  server stays as plan B for heavy server-side logic; we note this in [03](03-connect-app.md).

When a PR touches something here, the corresponding doc says which file changes.

---

## 📚 Document index

| # | Document | What you solve | Phase |
|---|---|---|---|
| 01 | [Supabase / database](01-supabase-database.md) | Real DB, multi-device | 1 |
| 02 | [Real auth](02-auth.md) | Real email login | 1 |
| 03 | [Connect the app](03-connect-app.md) | Plug front ↔ backend, remove mocks | 1 |
| 04 | [Web deploy / PWA](04-deploy-web-pwa.md) | App on the internet, installable | 1 |
| 05 | [Google Play](05-google-play.md) | Publish on Android | 2 |
| 06 | [App Store iOS](06-app-store-ios.md) | Publish on iPhone | 2 |
| 07 | [Push notifications](07-push-notifications.md) | Real alerts | 2 |
| 08 | [Monetization](08-monetization.md) | Charge / ads | 3 |
| 09 | [OSRM routing](09-routing-osrm.md) | Real street detours | 3 |
| 10 | [Analytics and monitoring](10-analytics-monitoring.md) | Errors + metrics | 3 |

---

## 🆘 Minimal glossary (so you don't get lost)

- **BaaS** (Backend as a Service): they give you database + auth + API without you managing
  servers. Supabase is that.
- **RLS** (Row Level Security): rules in the database that decide which row each user can
  read/write. It's your security wall; without it anyone reads everything.
- **PWA**: the web installable as an app. It's live in production at `convoyar.com` (installable).
- **Capacitor**: wraps your web app in a native Android/iOS app. Already configured (`convoyar.app`).
- **`.aab`**: Android App Bundle, the format you upload to Google Play (not `.apk`).
- **Keystore**: the file with your Android signing key. ⚠️ If you lose it, it's a headache.
- **FCM / APNs**: the push services from Google (Android) and Apple (iOS).
- **Env var** (environment variable): config that does NOT go in the code (keys, URLs). It lives
  in the hosting and in a local `.env` file that git ignores.
