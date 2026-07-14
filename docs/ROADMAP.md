# Convoyar — Roadmap

> The single source of truth for where the product is going. This file consolidates the old
> Spanish roadmap, `GROWTH.md`, and the per-role backlogs into one English document.
>
> Deeper design lives in [ARCHITECTURE.md](ARCHITECTURE.md); the canonical agent guide is
> [AGENTS.md](../AGENTS.md); role charters live in [`.claude/agents/`](../.claude/agents/);
> human-only actions live in [HUMAN-TODOS.md](HUMAN-TODOS.md); operational launch guides live
> in [`launch/`](launch/).

## Where we are

**Convoyar is LIVE in production at [convoyar.com](https://convoyar.com)** as an installable PWA,
and shipping to **Google Play in CLOSED testing** (signed AAB v3 — versionCode 3 / 1.0.2, package
`convoyar.app`; the 12-testers × 14-days requirement is in progress — see
[launch/12-closed-testing.md](launch/12-closed-testing.md)). Web deploy is a Cloudflare Pages
direct upload (`npm run deploy` → `wrangler pages deploy dist --project-name convoyar-web --branch main`).

This is not a demo. Behind the `hasSupabase` gate there is a **real multi-user Supabase backend**:
email+password auth, RLS on every table, realtime, and `services/repo.ts` mapping model↔DB. Tests,
E2E and `build:single` still run 100% locally against the deterministic demo — untouched.

**Suite is green:** 129 unit tests + 31 Playwright E2E + `typecheck` + `build`. Bundle ~945 KB
(~280 KB gzip), currently a single chunk. (Older docs quoting "92 tests / 24 e2e / 726 KB" are stale.)

### Phases

| Phase | What | Status |
|---|---|---|
| **1 — Local MVP** | Orgs, members, vehicles, events; pure CVRPTW matching engine (hard constraints, soft prefs, warm-start, no-assignment reasons); OSM/Leaflet map with meeting points and ETAs; admin tools (compute/recompute, manual move with warnings, cancel driver, metrics, CSV/JSON export); public BlaBlaCar-style mode; installable PWA + Capacitor; 6 languages; delight layer. | ✅ Done |
| **2 — Real multi-device (Supabase)** | Email+password auth, schema+RLS, `loadRemote`/`writeAction`/`subscribeRealtime`, personal org per user, private orgs end-to-end, one-step public trip, moderation, co-traveler-only reviews, materialized trip history, delete account. | ✅ Connected & in prod |
| **3 — Routing & scale** | Real OSRM routing, address search (Nominatim), recurrence occurrences, server-side matching for scale/privacy. | 🟡 In progress |
| **4 — Product & growth** | Analytics/funnel, native push, viral sharing loops, impact metrics, audited AA accessibility, monetization (wired & OFF). | 🟡 In progress |

### Done end-to-end (do NOT rebuild)

Much of what earlier drafts flagged as "critical gaps" is already shipped and in production:

- **Private organizations, complete end-to-end.** Create (`create_org`), join by code
  (`join_org_by_code`), invite by email (`add_member_by_email`), **self-serve link with toggle**
  (`set_org_link`), **deep-link `?join=CODE`**, org switcher (`setActiveOrg`), leave (`leave_org`),
  admins, and a **common group destination** (`set_org_destination`) that trips inherit. Personal
  org "My trips" per user at first login (`ensure_personal_org`). All in 6 languages.
- **One-step public trip.** Explore → "Publish trip" (`create_public_trip`): from/to/days/recurring,
  no group selection.
- **Moderation, wired end-to-end.** Report → server-side pause until human review (`report_member`);
  block/unblock (`block_member`/`unblock_member`). 6 languages.
- **Honest reputation.** Reviews **only between co-travelers** (`canReview` in `reputation.ts` +
  RLS `share_trip`); real **materialized trip history** (`materialize_my_trips`, idempotent RPC on
  hydrate). `migrate-review-gate.sql` and `migrate-trip-history.sql` already run in dev and prod.
- **Legal / store compliance.** Privacy + terms in all 6 languages (lawyer edits applied), **delete
  account** (`delete_my_account`, right to be forgotten), sign out.
- **Security fixes closed** (`migrate-privacy-perms.sql`, already run): email PII closed
  (per-column grant; `authenticated` cannot read others' `members.email`), and event
  privilege-escalation closed (INSERT = active member; UPDATE/DELETE = `can_admin_event`).

## Invariants (non-negotiable)

Every proposal in this roadmap respects these:

- **Pure engine** in `src/engine/` — no React/UI imports; the source of truth for matching.
- **Hard constraints** (capacity / detour / window / walk / needs) are never auto-violated.
- **i18n in 6 languages** (es/en/pt/de/it/fr); every new key exists in all six (`i18n.test.ts` guards it).
- **Privacy by design** — exact home address (`member_home`) is self-only, never shown to others;
  only the computed meeting point is shared.
- **$0 to operate** — OSM/Leaflet maps, mock/OSRM routing, Web Share API; nothing paid.
- **FREE for users** — billing is wired and **OFF** (`services/billing.ts`); do not enable it
  without a business decision.
- **Backend gated by `hasSupabase`** — local/tests/e2e run the deterministic demo, untouched.
- **Green before done** — `npm test` + `typecheck` + `build` + `test:e2e`.

---

## Per-role vision & prioritized backlog

Ordering is value-per-effort tied to the shared north star: **free, two-tap convoys; growth by
usage (the invitation is the product); trust in public mode; habit that retains.** Anything already
done or obsolete has been dropped. Role identity/mission lives in the charters under
[`.claude/agents/`](../.claude/agents/); below is only each role's product lens and backlog.

### PM — Product

**Lens:** get a new user to "**got / gave a seat**" fast, keep building and joining a convoy free
and two-tap, and let the app grow by its own use. Optimize activation, retention, virality; arbitrate
lanes so no one collides. Charter: [`.claude/agents/convoyar-pm.md`](../.claude/agents/convoyar-pm.md).

**P0 — Measure and retain (what makes the real launch work)**

1. **Activation / funnel analytics** — lane Frontend (+ human: account) · impact HIGH · effort MEDIUM.
   *What:* thin `services/analytics.ts` wrapper gated by `VITE_POSTHOG_KEY` (no key = no-op, like
   `hasSupabase`), emitting `signup`, `org_created`, `invite_sent`, `member_joined`,
   `trip_published`, `join_requested`, `seat_confirmed`, and D1/D7 activation. *Why:* it is the
   mission metric — without instrumenting it, everything else is opinion. PostHog free tier ($0),
   guide in [launch/10-analytics-monitoring.md](launch/10-analytics-monitoring.md). Also Growth G4.
2. **Cross-device in-app notifications** — see **Backend #1** (owner). *Why (PM):* a latent product
   bug (the "you're accepted" alert never reaches the other device) and the aha of multi-user; cheap.
3. **Native push (FCM / Web Push)** — see **Backend #2** (owner). *Why (PM):* a trip-coordination
   app without push builds no habit and no retention.

**P1 — The daily use case and the trip-day loop**

4. **Real recurrence (generate occurrences)** — lane Backend+Frontend, engine intact · impact HIGH ·
   effort HIGH. *What:* the daily "office Mon–Fri 8am" must actually exist each day; today
   `recurrence.days` is stored and shown as 🔁 but nothing is cloned. **PM decision: template +
   rolling materialization** — a series materializes the next N occurrences (~2 weeks) as real
   `EventDoc`s per date, regenerated on hydrate (idempotent RPC, like `materialize_my_trips`), so the
   engine (already per-event/per-date via `event.dateISO`) stays untouched. *Why:* highest retention
   value. Requires a model delta (occurrence→series link) → **version bump + Postgres migration** on
   its own branch, coordinated with Backend; do NOT mix with anything else touching `model.ts`.
5. **Convoy states (confirmed / en route / arrived)** — lane Backend+Frontend · impact MEDIUM ·
   effort MEDIUM. *What:* a status field per assignment/leg + realtime (channel exists). *Why:*
   closes the trip-day loop and raises retention; fits the Duolingo tone (micro-celebration on
   "arrived"). Post-matching, engine untouched.
6. **Address search by text (self-hosted Nominatim)** — lane Frontend+infra · impact HIGH · effort
   MEDIUM. *What:* type "123 Main St" instead of hunting on the map; debounce + autocomplete over the
   existing `MapPicker`. *Why:* a concrete activation friction. $0 via self-hosted Nominatim (or the
   public rate-limited endpoint to start).

**P2 — Trust and scale of public mode**

7. **Optional identity verification (badge)** — lane Backend + human decision · impact HIGH · effort
   HIGH. *What:* at least optional, badge-based verification for public-mode drivers. *Why:* an app
   where you get into a stranger's car lives or dies on trust. Requires a business decision
   (optional vs mandatory for drivers; which $0/cheap provider). Precedes pushing public-mode growth.
8. **Matching in an Edge Function** — see **Backend #7** (owner). *Why (PM):* scale to 100+ events
   without recomputing on N clients, and never leak home origins in public mode.
9. **Impact metrics (cumulative CO₂/km saved + badges)** — lane Frontend · impact MEDIUM · effort
   MEDIUM. *What:* per-org and per-person, in the Duolingo tone (`state/achievements.ts`). *Why:*
   reinforces habit and gives shareable material ("your group saved X kg CO₂") → feeds virality.

**P3 — Maturity / business (noted, not now)**

10. **Real OSRM routing** — lane Backend/infra. Street-minute detours; 1-line swap in `store.tsx`
    (~L230) + self-hosted OSRM ($0). Guide [launch/09-routing-osrm.md](launch/09-routing-osrm.md).
11. **Share public trip ("join my ride")** — see **Growth G1** (owner). Small; add when Explore is touched.
12. **Audited AA accessibility** — reasonable ARIA/contrast today; formal audit pending (UX owns the CSS lane).
13. **Monetization** — rails ready and **OFF** (`services/billing.ts`). Do NOT touch without a
    business decision (mandate today is "free for everyone").

### UX — Product Design

**Lens:** every screen understood in 3 seconds and a pleasure to use — empty states with an action,
immediate feedback, sober delight, AA accessibility. Lane: CSS/markup in `src/styles.css` +
`src/screens` + `src/components` (coordinating with Frontend to avoid collisions). Charter:
[`.claude/agents/convoyar-ux.md`](../.claude/agents/convoyar-ux.md).

**P0 — Polish minute one and AA accessibility (highest ROI on what's already launched)**

1. **First-run welcome in Home (real account)** — lane UX (+Frontend gate) · impact HIGH · effort LOW.
   *What:* when the active org is the personal "My trips" and it has no events, show a welcome block
   with 3 clear CTAs (**Publish a trip** / **Create a group** / **Explore**) and a one-line copy.
   Reuses `emptyState` + `GroupActions`. Files: `Home.tsx` (new block), `styles.css`. Needs a
   personal-org signal (`Org.personal` flag from Backend, or infer `memberIds.length === 1 && no events`).
   *Why:* minute one decides whether the user returns; today it is cold.
2. **Hide the invite code in the personal org** — lane UX (+Backend flag) · impact MEDIUM · effort LOW.
   *What:* "My trips" is a party of one; hide `codeRow` + the invite button when the org is personal.
   Files: `Home.tsx`, `styles.css`. *Why:* clarity — avoids "who do I invite to my own space?".
3. **Consistent keyboard focus (WCAG 2.4.7)** — lane UX (pure CSS) · impact MEDIUM-HIGH · effort LOW.
   *What:* remove `outline:none` from `.obInput`, `.codeInput`, `.chatInput input`, `.vehAlias` (and
   delete dead `.fuelInput`) so the global `:focus-visible` wins, verified in light **and** dark.
   File: `styles.css` (5 rules). *Why:* real AA accessibility, a store requirement; zero flow risk.
4. **Confirmations with `aria-live` (WCAG 4.1.3)** — lane UX (+Frontend markup) · impact MEDIUM ·
   effort LOW. *What:* wrap success flashes ("Copied ✓", "Saved ✓", "Request sent", "Added by email")
   in `role="status"` / `aria-live="polite"`. Files: `Home.tsx`, `MyTrip.tsx`, `Profile.tsx`,
   `Explore.tsx`. *Why:* immediate feedback must exist for screen readers too.

**P1 — Reduce noise and close the loop**

5. **Contextual tabs** — lane Frontend (+UX styles) · impact MEDIUM · effort LOW-MEDIUM. *What:*
   hide/dim **Admin** when you're not the active event's organizer, and **Results/Trip** when no event
   is selected. Tab logic lives in `App.tsx` (Frontend); UX styles the tabbar. *Why:* a newcomer
   should see ~4 useful tabs, not 6 with dead-ends → "understood in 3 seconds".
6. **Loading skeletons** — lane UX (CSS/markup) · impact LOW-MEDIUM · effort MEDIUM. *What:* replace
   the bare `appLoading` spinner with a Home/event-list skeleton. Files: `App.tsx` (loader),
   `styles.css`. *Why:* perceived speed; cheap polish.
7. **Short onboarding for real accounts (optional)** — see **Frontend F1** (owner). *Why (UX):* if
   the guided empty state (P0 #1) isn't enough, a short wizard closes minute one — but it's heavier,
   so it comes after P0 #1. Needs a persisted `onboarded` flag per user (Backend).

**P2 — Polish and delight**

8. **Illustrated empty states** — lane UX (mine) + assets (human) · impact MEDIUM · effort LOW (mine).
   *What:* replace emoji art with real illustrations (fresh Home, empty Explore, Results with no
   compute). Needs assets (see [HUMAN-TODOS.md](HUMAN-TODOS.md)).
9. **Brand consistency in `eyebrow`** — lane UX · impact LOW · effort trivial. *What:* replace
   hardcoded `"Convoyar"` with `T("app.name")` in `Home.tsx` and `Profile.tsx`.
10. **Honest recurrence UX** — lane UX (+product decision) · impact MEDIUM · effort LOW (mine). *What:*
    while recurrence doesn't clone occurrences, adjust the 🔁 copy so "repeats" reads as a *template*
    (or hide it) until the generator exists. Depends on PM #4.

### Frontend — UI Engineering

**Lens:** ship features that work, are typed (strict TS, no `any`), accessible, and live in all 6
languages; reuse the UI kit and store contract; local (demo) and Supabase (real) behave identically.
Owner of `src/screens/`, `src/components/`, `src/state/`, `src/i18n/`. Charter:
[`.claude/agents/convoyar-frontend.md`](../.claude/agents/convoyar-frontend.md).

**P0 — Activation and performance**

1. **Onboarding for real accounts (Supabase)** — lane Frontend · impact HIGH · effort MEDIUM. *What:*
   reuse `screens/Onboarding.tsx` but fire it after first real login — change the gate at `App.tsx`
   so it also runs when `hasSupabase && !settings.onboarded`, ask name / home (optional) / car
   (optional), write `onboarded=true` to the DB on finish, and end with a clear CTA ("Create your
   first group" / "Join with a code"). *Why:* the biggest activation gap today — a new Supabase user
   lands directly in an empty "My trips" org with no guidance. Add a wizard smoke test + a welcome-flow E2E.
2. **Code-splitting: lazy-load the map (Leaflet/MapPicker)** — lane Frontend · impact MEDIUM-HIGH ·
   effort LOW-MEDIUM. *What:* dynamic `import()` of `components/MapPicker.tsx` (and Leaflet) only when
   the picker opens; `React.lazy` + `Suspense` with a correctly-sized placeholder (no layout shift).
   *Why:* the single ~945 KB chunk slows first paint on low-end phones (against "install and go in two
   taps"). Also QA Q5 / B8.
3. **Save feedback / offline state** — lane Frontend · impact MEDIUM · effort MEDIUM. *What:* a
   reusable `Toast` + "offline / retrying" banner with `aria-live`; let `writeAction` (fire-and-forget
   at `store.tsx`) surface failures to the UI instead of a silent `console.warn`. *Why:* in real
   multi-user prod, a silent failed save makes users believe they saved when they didn't → erodes trust.

**P1 — Habit, trust, communication**

4. **Chat more present + unread badge** — lane Frontend · impact MEDIUM · effort LOW-MEDIUM. *What:*
   surface chat in `MyTrip.tsx` too, unread badge on the tab (`App.tsx`), scroll-to-bottom; respect
   `notifPrefs.chat`. *Why:* pushes the habit (Duolingo tone).
5. **In-app notification center** — lane Frontend (+ **Backend #1** for realtime) · impact MEDIUM ·
   effort MEDIUM. *What:* surface `state.notifications` (bell + list + mark-read). *Why:* alerts don't
   cross devices until Backend adds `notifications` to `subscribeRealtime`; Frontend can ship the UI
   and consume it the moment the table arrives.
6. **AA accessibility audit** — lane Frontend/UX · impact MEDIUM · effort MEDIUM. *What:* focus trap
   in `Sheet`, `aria-live` on toasts, labels on org inputs, dark-mode contrast. *Why:* cheap and
   widens the real audience (clubs, schools, families). Overlaps UX P0 #3–#4.

**P2 — Finish half-done features (coordinate with Backend/PM)**

7. **Convoy states** — see **PM #5**. Frontend adds the status chip per convoy in MyTrip/Results;
   requires a `model.ts` field (v5 bump) coordinated with Backend — do NOT touch `model.ts` alone.
8. **Real recurrence occurrences** — see **PM #4**. Frontend builds the "upcoming departures" view
   once the model is defined. Blocked by the product decision.

**P3 — Polish / nice-to-have**

9. **Client-side QR of the join code** — lane Frontend · impact LOW-MEDIUM · effort LOW. 100%
   client-generated ($0) to invite in person (barbecue/club); scanned from another phone.
10. **Map view in Explore** (public trips on the map) — lane Frontend · impact LOW-MEDIUM · effort MEDIUM.

### Backend — Supabase

**Lens:** two people on two phones see the same thing, in realtime, free, without leaking what they
shouldn't. Owner of Postgres schema, RLS, RPCs, Edge Functions, realtime, push, and the client↔Supabase
adapter (`repo.ts`). `model.ts` is the source of truth: model changes → `schema.sql` + mapper + an
idempotent `migrate-*.sql` left as a TODO for the human (no DDL access). Charter:
[`.claude/agents/convoyar-backend.md`](../.claude/agents/convoyar-backend.md).

**🔴 Now (highest real impact)**

1. **Cross-device notifications — the alert reaches the OTHER person** — lane Backend (+Frontend) ·
   impact HIGH · effort MEDIUM. *What:* today `loadRemote` returns `notifications: []`,
   `subscribeRealtime` doesn't include the table, and `writeAction` doesn't mirror `addNotifs`, so an
   "approved / message" alert is generated locally on the *organizer's* device and never persisted for
   the recipient. Incremental path: (a) auto-generate the recipient's notification on *their* device
   when realtime brings *their* `join_request` → `approved`, a new `assignment`, or a new `message`
   (RLS `notif_all_self` allows self-inserts) — this also triggers the push webhook; (b) load + subscribe
   `notifications` (add it to `subscribeRealtime` in `repo.ts`, already in the `supabase_realtime`
   publication); (c) RPC `push_notification(member_id, title, body)` `security definer` for cases where
   the informer is someone else. Files: `repo.ts`, `store.tsx`, `server/migrate-notify.sql`. *Why:* for
   a product whose growth engine is habit and "the invitation is the product", this is the costliest gap.
   Also QA Q1/B2, PM P0 #2, Frontend #5.
2. **`send-push` Edge Function + FCM token registration** — lane Backend (depends on #1, human
   credentials) · impact HIGH on mobile · effort HIGH. *What:* an Edge Function listening on a Database
   Webhook (INSERT→`notifications`) that sends via FCM respecting `notif_prefs`, plus `registerPush`
   (client) storing the token in `device_tokens` (table + self-only RLS exist). Guide
   [launch/07-push-notifications.md](launch/07-push-notifications.md). *Why:* with the AAB in closed
   testing, push is what brings people back. Blocked on the human's FCM service account + webhook creation.

**🟠 Next (important, not blocking today)**

3. **Harden moderation & consent** — lane Backend · impact MEDIUM-HIGH · effort LOW-MEDIUM.
   *What:* `report_member` currently hard-pauses on a single report (anyone can pause anyone) — count
   *distinct* reports and pause only past N (e.g. 3), or soft-flag. `add_member_by_email` is an
   enumeration oracle (reveals whether an email is registered) and adds without consent — return a
   generic response and evaluate invite-with-acceptance (`pending` row or `org_invites`). File:
   `server/migrate-moderation-hardening.sql`. *Why:* real abuse surfaces as soon as there's volume.
4. **Consolidate `schema.sql` to real v4** — lane Backend · impact MEDIUM (DR/new envs) · effort LOW.
   *What:* rewrite `schema.sql` to canonical v4 (all current columns/tables) with `migrate-*` as
   history, or add `server/APPLY-ORDER.md` + `migrate-all.sql`. *Why:* today a fresh DB from
   `schema.sql`+`rls.sql` alone is broken (columns/tables the migrations added are missing). Prod/dev
   are fine; this is DR and onboarding a third environment.
5. **`decide_request` as an atomic RPC** — lane Backend · impact MEDIUM · effort MEDIUM. *What:* a
   `security definer` transaction that sets `approved`, ensures the accepted rider's leg **using the
   origin they already saved** (never their home from another device), and inserts their notification.
   File: `server/migrate-decide-request.sql`. *Why:* keeps the accept flow consistent cross-device
   without breaking the privacy invariant; ties into #1 and fixes QA Q2 ("approved but no convoy").

**🟡 Later (recurrence, scale, public mode with strangers)**

6. **Real recurrence (generate occurrences)** — see **PM #4** (owner of the decision). Backend side:
   a generator (Edge Function with `pg_cron`/Scheduled, or on-the-fly materialization) creating the
   next N occurrences per `recurrence.days` and `dateISO`. Blocked by the product decision, not effort.
7. **Matching in an Edge Function (public-mode privacy)** — lane Backend (gated by PM) · impact HIGH
   for public mode · effort HIGH. *What:* `server/edge-functions/match/index.ts` is a skeleton that
   throws (`buildInputFromRows` unimplemented). Move `solveMatching(input, provider)` to the Edge
   Function with `service_role`, read origins server-side, return **only meeting points + ETAs**. The
   engine is pure TS → runs as-is in Deno; contract `MatchInput → MatchResult` unchanged. *Why:* for
   strangers, origins must never travel to another browser. Required before opening public mode to
   people who don't know each other; not blocking the trusted-org lane.
8. **Harden `orgs_insert` + `join_code` retry** — lane Backend · impact LOW-MEDIUM · effort LOW.
   *What:* `orgs_insert with check (true)` allows orphan orgs from the client — replace with `with
   check (false)` / force via RPC; add `on conflict`/retry to `join_code` generation (today `md5(random())`
   with no retry). *Why:* hygiene and minor correctness.

### Growth

**Lens:** people discover the app, **activate** (build or join their first org/trip), and **invite**
others. Carpooling is viral by nature — one trip = several people — so the invitation *is* the product.
Optimize, in order: the invitation loop, the onboarding funnel, share messages (localized ×6), funnel
metrics. Charter: [`.claude/agents/convoyar-growth.md`](../.claude/agents/convoyar-growth.md). See also
the **Growth section** below (folded from the old `GROWTH.md`).

The org invitation loop is already complete and in prod. The focus moves to the **public loop**
(share the trip, BlaBlaCar-style), **link previews**, and **measuring** to iterate.

| # | Feature | Impact | Effort | Lane / concrete file |
|---|---|---|---|---|
| **G1** | **Share public trip + `?event=ID` deep link** — "Share" button on each `Explore.tsx` card and on the `publish.done` success screen (localized ×6 + `?event=ID` via Web Share API, fallback clipboard, reusing the `InvitePanel` pattern); `EventDeepLink` handler in `App.tsx` that opens the trip and offers "request a seat". Closes the public viral loop. No new RPC (`event.id` exists). | HIGH | LOW-MED | Frontend + i18n; `App.tsx` |
| **G2** | **Open Graph / Twitter cards** — `og:title/description/image/url`, `twitter:card` in `index.html` (static, `es` default). A pretty preview when any `?join=` / `?event=` link is pasted into WhatsApp/Telegram. | HIGH | LOW | `index.html`. Human: 1200×630 OG image |
| **G3** | **Onboarding that ends in activation** — replace "confetti → void" with a final CTA: "Publish your first trip / Create your group / Paste a code". Pushes the "aha" at peak intent. Add an activation E2E. Overlaps Frontend F1. | HIGH | MEDIUM | Frontend + i18n; uses existing `publishPublicTrip`/`createOrg`/`joinOrgByCode` |
| **G4** | **Funnel analytics** — `src/services/analytics.ts` gated like `billing` (off stub without a key): `onboarding_done`, `trip_published`, `org_created`, `invite_shared`, `join_requested`, `join_accepted`, `first_convoy`. PostHog free tier. Same item as PM P0 #1. | HIGH | MEDIUM | Frontend + [launch/10](launch/10-analytics-monitoring.md). Human: PostHog project + key |
| **G5** | **Share "when the convoy forms" (Results)** — "Share" button in `Results.tsx` when the convoy is built (peak-pride moment); localized text + `?event=ID` (depends on G1). | MEDIUM | LOW | Frontend + i18n |
| **G6** | **ASO / store copy ×6** — title, short/long description, keywords localized for Play/App Store. | MEDIUM | LOW | Growth writes copy; creatives = human |
| **G7** | **Referrals / "bring your group"** — invite several at once when creating an org; count of accepted invitees (gentle Duolingo-style gamification). Amplifies G1–G5. | MEDIUM | HIGH | Frontend + Backend (counter). After G1–G4 measure conversion |
| **G8** | **Landing: download section + install-PWA button** — "Install the app" CTA (`beforeinstallprompt`) and store badges once published. | LOW-MED | LOW | Frontend `Landing.tsx`. Human: official store badges |

**Next 3 moves:** G1 (the missing viral half now that orgs close) → G2 (cheap, multiplies everything
shared, including the existing `?join=`) → G4 (stop guessing; measure whether G1/G3 work).

### QA — Quality

**Lens:** don't confirm things work — try to break them, especially what tests don't catch: the
`hasSupabase=true` (real backend) path that only runs in dev/prod, never in `npm test`. Definition of
green (team invariant): `npm test` + `typecheck` + `build` + `test:e2e`. Charter:
[`.claude/agents/convoyar-qa.md`](../.claude/agents/convoyar-qa.md).

**The uncomfortable truth:** the whole suite runs with `hasSupabase=false`, so zero tests exercise the
live path — `loadRemote`, `writeAction`, `bootstrapMember`, `subscribeRealtime`, the RPCs, RLS, and
realtime are validated only by hand. Pure mappers are now covered (`repo.test.ts`), but integration and
multi-user security are not. That is exactly where the worst bugs live.

**🥇 Now — close the backend safety-net gap**

| # | Item | Lane | Impact | Effort | Notes / file |
|---|---|---|---|---|---|
| B1 | **RLS policy test harness** against a test Supabase project (pgTAP or SQL script): a non-admin can't UPDATE/DELETE others' events; a non-member can't read a private org; nobody reads another's `member_home`/`email`; `share_trip` rejects a stranger's review; `join_org_by_code` validates invalid/already-member. | QA + Backend | HIGH (privacy/security = trust = the whole product) | MED-HIGH | Only way to guarantee permissions without hand-testing each release. Needs test-project creds (human). |
| B2 | **Fix cross-device notifications** (Q1) — persist the recipient's notification (RPC/Edge) + subscribe `notifications` by `member_id`, or make the flow honest. Same as **Backend #1**. | Backend + Front | HIGH (central public-mode loop) | MEDIUM | `repo.ts`, `store.tsx` (`decideRequest`) |
| B3 | **Two-real-user Supabase E2E smoke** — sign up, create group, invite, join, request a seat, accept, see the convoy in two sessions. | QA | HIGH (only hand-tested today) | HIGH | Needs test-project creds (human); run app with `hasSupabase=true`. |

**🥈 Next**

| # | Item | Lane | Impact | Effort | Notes |
|---|---|---|---|---|---|
| B4 | **Resolve "approved but no convoy"** (Q2) — realtime recompute on the organizer, or a "waiting for organizer" state for the passenger. Ties into Backend #5. | Product + Front | MEDIUM | MEDIUM |
| B5 | **`email_verified` from `email_confirmed_at`** (Q3), not unconditional in `bootstrapMember`. | Backend | MEDIUM | LOW | Depends on the email-confirmation toggle decision (human). `repo.ts`. |
| B6 | **Add `orgs` to `subscribeRealtime`** (cheap part of Q4) so common destination + link toggle propagate live. | Backend | MEDIUM | LOW | One line + verify no refetch storm. |

**🥉 Later**

| # | Item | Lane | Impact | Effort | Notes |
|---|---|---|---|---|---|
| B7 | **Selective realtime refetch** (rest of Q4) by table/payload of `postgres_changes`, to cut reads at scale ($0 invariant). | Backend | MEDIUM | MEDIUM |
| B8 | **Bundle code-splitting** (Q5) — lazy map/Explore/Supabase. Same as Frontend #2. | Front / build | MEDIUM | MEDIUM |
| B9 | **Recurrence occurrence-generator tests** (Q6) — once PM defines the model (per-day event vs template). Blocked by the product decision. | QA (follows PM) | MEDIUM | MEDIUM |

---

## Growth (from `GROWTH.md`)

> Direct ask from the owner: *"tell me what else it needs to be a great app, Silicon-Valley level,
> many downloads."* This is that answer — honest and prioritized. Not marketing: the map of what
> separates "a very polished demo" from "a product people download, use, and recommend."

**Where we are:** the data infrastructure is no longer the bottleneck — real Supabase backend
(email+password auth, orgs, personal org per user, realtime sync, active RLS, migrations run in dev
and prod), and **production is live at convoyar.com**. Two people on two phones already see the same
trip. It still runs 100% locally (`hasSupabase` gate) for tests, `build:single`, and offline demos.

### 🔴 P0 — No real product without it

1. ✅ **Real multi-device backend — DONE.** Supabase connected (`supabaseClient.ts`, `repo.ts`,
   `server/schema.sql` + `rls.sql` + migrations in dev/prod). No longer the blocker.
2. ✅ **Real auth — DONE.** Email + password (`services/auth.ts`, `screens/Auth.tsx`); `meId` derives
   from the session.
3. **Trust & personal safety.** An app where you get into a stranger's car lives or dies on this:
   - **Reporting/blocking — DONE** and wired end-to-end (report pauses server-side until human review;
     block is personal). Review/chat moderation: still pending.
   - **Immutable server-side history — DONE** (reputation in Postgres + RLS; `materialize_my_trips`).
   - Identity verification (document/selfie) for drivers, at least optional with a badge — **pending**
     (PM #7).
   - Emergency contact and "share my live trip" with a trusted person — pending.
4. **Real push notifications** — see Backend #2. Without native push, a trip-coordination app doesn't
   retain. FCM credentials pending from the human. Guide [launch/07](launch/07-push-notifications.md).

### 🟠 P1 — No growth without it

5. **Growth / virality loops** — the invitation IS the product. Deep links ("join my trip" opens the
   app on the event — G1), WhatsApp share with a pretty preview (G2), referrals / "bring the whole
   group" (G7). The org loop is done; the public loop is the current focus.
6. **Real routing (OSRM)** — today detour is haversine. For trustworthy ETAs and real meeting points,
   OSRM is needed. Adapter already written; guide [launch/09](launch/09-routing-osrm.md). PM #10.
7. **Geocoding / address search by text** — today you tap the map; people expect to type an address.
   Self-hosted Nominatim (OSM, free). PM #6.
8. **Onboarding that ends in activation** — the "aha" is the first published trip / created group /
   pasted code. Guide that moment. G3 / Frontend F1.
9. **Product analytics** — zero visibility today. Without activation/retention (D1/D7/D30), onboarding
   funnel, and % who get a ride, you can't iterate. G4 / PM P0 #1. Guide [launch/10](launch/10-analytics-monitoring.md).

### 🟡 P2 — What makes it "great"

10. **Recurring trips** ("office Mon–Fri 8am") — high value for the daily use case; modeled as a
    template that materializes occurrences. PM #4.
11. ✅ **Live recompute / realtime — DONE** (Supabase Realtime via `subscribeRealtime`).
12. **Impact metrics** per org and per user: cumulative km/CO₂ saved, gentle ranking, badges
    (Duolingo-style, matching the chosen tone). PM #9.
13. **Audited AA accessibility** — reasonable ARIA/contrast today; formal screen-reader audit pending.
    UX P0 #3–#4, Frontend #6.
14. **Deeper offline mode** — PWA + tile cache exist; an offline action queue that syncs on return is missing.
15. **More languages** — the 6 today cover a lot; add per market (`translate()` scales).

### 🟢 P3 — Business & maturity

16. **Monetization turned on** — rails wired (`services/billing.ts`); plans/gates/ads off. Connect
    Stripe/RevenueCat and decide the model. Guide [launch/08](launch/08-monetization.md). Free for now.
17. ✅ **Compliance — DONE** for launch: privacy policy + terms in 6 languages, delete account (right
    to be forgotten), location-data handling declared honestly.
18. **In-app support & feedback** (report a bug, contact) — cheap, strong quality signal.
19. **CI/CD** — tests run locally today; add GitHub Actions running unit+E2E on every PR and blocking
    merge on failure (`playwright.config` already has `retries` for CI). Guide [launch/11](launch/11-auto-deploy.md).
20. **Observability** — Sentry (errors), uptime, alerts. Guide [launch/10](launch/10-analytics-monitoring.md).

> **In one line:** the product is designed to be great; what remains is mostly *execution of
> infrastructure and trust*, not redesign. The order above is the shortest path from "beautiful demo"
> to "app people download and recommend."

---

## Known open gaps

Not "the app is unusable" — these are what separate *live* from *grows and retains*:

- **Recurrence cloning** — `recurrence.days` is stored and shown (🔁) but occurrences are not
  generated. Blocked by the product decision (PM #4: template + rolling materialization).
- **Real push** (FCM/APNs) — blocked on human credentials (Backend #2).
- **Analytics / funnel** — no instrumentation yet; we iterate blind (PM P0 #1 / Growth G4).
- **Cross-device in-app notifications** — the `notifications` table isn't in `subscribeRealtime`
  (`repo.ts`), so alerts don't travel to the other device (Backend #1 / QA Q1).
- **Real OSRM routing** — mock haversine today; adapter written, 1-line swap + infra (PM #10).
- **Matching in an Edge Function** — runs on the client today; needed for 100+ events and to avoid
  leaking home origins in public mode (Backend #7).
- **Optional identity verification** — trust before pushing public-mode growth; needs a business
  decision (PM #7).
- **Convoy states** (confirmed / en route / arrived) — closes the trip-day loop (PM #5).

Human-only actions (create accounts, run SQL, deliver credentials, provide brand assets, recruit
testers, business decisions on pricing/verification/recurrence) live in
[HUMAN-TODOS.md](HUMAN-TODOS.md). Operational guides for each of the above live in
[`launch/`](launch/).
