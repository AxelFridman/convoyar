# 10 · Analytics & monitoring — know what's going on

> **What you'll achieve:** eyes on production from day 1. You'll know **when something
> blows up** on a user's phone (errors/crashes → Sentry), **what people do** in the app
> (product analytics → PostHog) and **whether the web app is still alive** (uptime →
> UptimeRobot). All on free tiers, USD 0, and without sending a single piece of personal
> data to third parties.

**Before you start, read:** [the folder README](README.md) · the data model in
[`src/state/model.ts`](../../src/state/model.ts) (so you know what's PII and what isn't).

| | |
|---|---|
| ⏱️ Time | ~1 h (all three) |
| 💰 Cost | USD 0 (free tier on all three) |
| 🧑 / 🤖 | Half and half: the accounts and dashboards are **YOU**; the front-end integration is done by Claude in a PR 🤖 |

> ### 📍 Status (2026-07-13): 🟡 you started Sentry
> ✅ You created the Sentry project and the **DSN is already in your `.env`** (I also left it
> as `VITE_SENTRY_DSN`). ⏳ It still needs to be wired into the code — but **DON'T copy the
> snippet the Sentry assistant gave you as-is**: it brings in things that break Convoyar's
> privacy and doesn't match this project. Use the config in **Part 1** below and read the
> "⚠️ About the assistant's snippet" box. (Remember: this is optional/Phase 3; analytics/funnel
> is still an open gap, and it didn't block the launch — convoyar.com is already live.)

---

## ⏱️ Do it EARLY (even though it's listed under Phase 3)

In the [README](README.md) this is in **Phase 3 (once you have traction)**, but the real
advice is: **wire it up as soon as the web app is on the internet (after [doc 04](04-deploy-web-pwa.md))**.
Why? It's free, it installs in a few minutes, and from minute zero of the launch you'll want
to know whether the app is breaking or whether people are dropping off during onboarding.
Finding out about a crash too late means losing your first users, who are the most valuable.

These are **three distinct things**, don't mix them up: **errors ≠ analytics ≠ uptime**.

---

## Part 1 — Errors / crashes → Sentry 🧑🤖 ⏱️ 20 min 💰 USD 0

Sentry alerts you when something throws an exception in a user's browser or app, with the
stack trace and the version it happened in. The free tier handles **~5,000 errors/month**,
plenty to get started.

**🧑 YOU (dashboard):**
1. Create an account at **[sentry.io](https://sentry.io)**.
2. **Create Project** → platform **React**.
3. Copy the **DSN** it gives you (it's a URL like `https://xxx@xxx.ingest.sentry.io/xxx`).

**🤖 CODE (Claude's PR):**
1. Install the SDK: `npm i @sentry/react`.
2. Put the DSN in the env var **`VITE_SENTRY_DSN`** (in local `.env` and in the hosting; never in git).
3. Initialize as early as possible (in `src/main.tsx`, before mounting React):

```ts
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,            // ⚠️ key: never send PII (see Part 4)
    tracesSampleRate: 0.1,            // 10% of transactions is enough for the free tier
  });
}
```

4. Wrap the app with Sentry's error boundary to capture render crashes:

```tsx
<Sentry.ErrorBoundary fallback={<p>Something went wrong. We've already been notified.</p>}>
  <App />
</Sentry.ErrorBoundary>
```

> ### ⚠️ About the snippet the Sentry assistant gave you
> The assistant handed you a bigger block. **Don't use it as-is** — fix these:
> - 🔴 **`Sentry.replayIntegration()` + `replaysSessionSampleRate`**: **Session Replay records
>   the user's screen**, and in Convoyar that includes **the map with their home address** →
>   it violates privacy invariant #6. **Remove replay** (or, if you ever want it, you'd have to
>   mask everything and even then the map is delicate). For launch: no replay.
> - 🟠 **`tracesSampleRate: 1.0`** (100%): burns through the free tier and adds overhead. Leave it at **`0.1`**.
> - 🟠 **`getElementById("app")`**: in this project the root is **`#root`** (check `index.html`).
>   And **don't replace your `src/main.tsx`** with the assistant's render: your `main.tsx` already
>   mounts `<App/>` in `StrictMode`. Just add `Sentry.init(...)` **above** your current render.
> - 🟠 **`tracePropagationTargets: [..., /yourserver\.io/]`**: it's a placeholder. Remove it or put
>   your real domain / the Supabase URL.
> - 🟢 **Don't hardcode the DSN**: read it from `import.meta.env.VITE_SENTRY_DSN` (it's already in your `.env`).
>
> In short: keep the `Sentry.init({ dsn, environment, sendDefaultPii: false,
> tracesSampleRate: 0.1 })` from above, without replay. It's smaller, cheaper and respects privacy.

> 💡 **Native apps (Capacitor).** For Android/iOS crashes there's
> [`@sentry/capacitor`](https://docs.sentry.io/platforms/javascript/guides/capacitor/),
> which also captures native crashes. Add it when you tackle docs
> [05](05-google-play.md) / [06](06-app-store-ios.md); on the web, `@sentry/react` is enough.

---

## Part 2 — Product analytics → PostHog 🧑🤖 ⏱️ 20 min 💰 USD 0

This answers **what people do**: how many complete onboarding, how many create a trip, where
they drop out of the funnel. PostHog cloud is free up to **~1M events/month** (and if you
want, you can **self-host** it for free).

**🧑 YOU:** create an account at **[posthog.com](https://posthog.com)** → copy the **Project API Key**.

**🤖 CODE:** `npm i posthog-js`, with the key in **`VITE_POSTHOG_KEY`**, and initialize:

```ts
import posthog from "posthog-js";

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",   // no anonymous profiles
  });
}
```

**Track the key funnel events** (put the `posthog.capture(...)` on each action):

| Event | When |
|---|---|
| `onboarding_completed` | finished the sign-up wizard |
| `event_created` | created a trip |
| `join_requested` | tapped "request a seat" (public mode) |
| `request_accepted` | an admin accepted a request |
| `trip_rated` | rated a trip (1–5★) |

With those five you already see the whole funnel: sign up → create → request → get accepted → rate.

> 💡 **Alternatives** if PostHog is too much: **[Plausible](https://plausible.io)**
> (privacy-first, dead simple, paid) or **[Umami](https://umami.is)** (free self-host). All
> three respect privacy better than Google Analytics; for this project, any of them before GA.

---

## Part 3 — Uptime (is the web app alive?) → UptimeRobot 🧑 ⏱️ 10 min 💰 USD 0

An external monitor that **pings your public URL every 5 min** and emails/notifies you if it
goes down. It's 100% dashboard, **it doesn't touch the code**.

1. Account at **[UptimeRobot](https://uptimerobot.com)** (or **[Better Stack](https://betterstack.com)**).
2. **Add New Monitor** → type **HTTP(s)** → your production URL (`convoyar.com`, from [doc 04](04-deploy-web-pwa.md)).
3. Interval 5 min, alerts to your email. Done.

> 💡 It's useful mostly because of what we saw in [doc 01](01-supabase-database.md): **Supabase
> Free pauses the project after 7 days of inactivity**. An uptime monitor tells you right away
> if the app stopped responding because the backend went to sleep.

---

## Part 4 — ⚠️ Privacy: DON'T send PII to these tools

This is the most important point in the doc. Convoyar is **privacy by design**, and that
applies **to telemetry too**. Sentry and PostHog are third parties: everything you send them
leaves your control.

- ⚠️ **Never** send home addresses (`home`), emails or names to Sentry or PostHog. The
  `home` is the most sensitive field in the model (privacy invariant #6, see [doc 01](01-supabase-database.md)).
- **Anonymize the user id:** identify a person by their **`member id`** (a uuid with the backend;
  `m0`/`m1`… in the local demo), **never by email**. That way you follow a funnel without exposing who they are.
- In Sentry: `sendDefaultPii: false` (already set above) and review the `beforeSend` hooks to
  scrub any payload that drags along data.
- In PostHog: `person_profiles: "identified_only"` and don't pass props with names/emails.
- **Consent:** add a privacy notice and, if you go to the EU, a real opt-in. PostHog and
  Sentry can start off disabled until the user accepts.

> ⚠️ Simple rule: if a piece of data could identify a person or their home, **it doesn't travel**
> to telemetry. When in doubt, don't send it.

---

## The database already comes observed 🧠

**You don't need an extra tool for the backend.** Supabase gives you DB/API observability in
its own dashboard: **Logs** (Postgres, Auth, API, Realtime) and **Reports** (usage, slow
queries, egress). Look there. Sentry/PostHog are for the **front end and the product**; for
database health, the Supabase panel is more than enough.

---

## Security before scaling 🔒

Before opening the app to a lot of people, two things:

- Run the **`/security-review`** command the project already has, to audit the security
  changes before growing.
- **Review the RLS policies** in [doc 01](01-supabase-database.md): they're "a solid base,
  not an audit." With data from thousands of users, verify that nobody reads what isn't theirs
  (especially `member_home`).

---

## 💰 Cost and when you start paying

| Tool | Free tier | When you pay |
|---|---|---|
| Sentry | ~5k errors/month | High error volume → plans from ~USD 26/month |
| PostHog | ~1M events/month | You exceed 1M events/month (or self-host to stay at USD 0) |
| UptimeRobot | 50 monitors, every 5 min | More frequent checks / more monitors |

For launch and the first few thousand users: **USD 0 on all three**. Only with real traction
will you brush up against the limits, and by then you'll have revenue or investment to cover it.

---

## ✅ Checklist for this doc

- [ ] 🧑 Sentry account + React project created, DSN copied
- [ ] 🤖 `@sentry/react` initialized with `VITE_SENTRY_DSN` and `sendDefaultPii: false`
- [ ] 🤖 App wrapped in `Sentry.ErrorBoundary`
- [ ] 🧑 PostHog account + `VITE_POSTHOG_KEY` in the hosting
- [ ] 🤖 The 5 funnel events are tracked (`onboarding_completed` … `trip_rated`)
- [ ] 🧑 Uptime monitor pointing at the public URL
- [ ] ⚠️ Verified that **no** PII travels: user id = `member id`, no emails/names/`home`
- [ ] 🧑 Privacy notice / consent accounted for
- [ ] 🧑 Supabase Logs/Reports panel reviewed
- [ ] 🧑 `/security-review` run and doc 01's RLS reviewed before scaling

---

## 🆘 Common problems

- **No errors reach Sentry** → the `if (import.meta.env.VITE_SENTRY_DSN)` is false: the env
  var isn't loaded in the hosting. Confirm you defined it in the deploy panel
  ([doc 04](04-deploy-web-pwa.md)) and that you rebuilt.
- **PostHog shows tons of anonymous users** → normal if you don't identify; use
  `posthog.identify(memberId)` (with the `member id`, **not** the email) after login.
- **I got scared: am I sending personal data?** → open an event in Sentry/PostHog and look at
  the payload. If you see an email, name or home coordinates, cut it off with `beforeSend`
  (Sentry) or by stopping passing that prop (PostHog).
- **UptimeRobot alerts me about downtime in the middle of the night** → it's usually the
  Supabase project paused due to inactivity (free tier). Reactivate it or move to Pro
  ([doc 01](01-supabase-database.md)).

---

**Back to the [README](README.md)** for the master launch checklist.
