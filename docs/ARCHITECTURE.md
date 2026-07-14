# Convoyar Architecture

> For the operational guide (commands, invariants, gotchas) see [../AGENTS.md](../AGENTS.md).
> This document explains the **design**: why the pieces are the way they are and how they talk to each other.

## The 10,000-meter view

```
┌─────────────────────────────── UI (React) ───────────────────────────────┐
│  screens/  Home · Explore · MyTrip · Results · Admin · Profile           │
│  components/  People · RideCard · MapPicker(Leaflet) · UI kit            │
└──────────────┬────────────────────────────────────────────────────────────┘
               │ useStore() — context + useReducer
┌──────────────▼────────────────── state/ ──────────────────────────────────┐
│  model.ts   AppState v4 (orgs, members, events, legs, assignments,        │
│             joinRequests, reviews, tripHistory, notifications, settings)  │
│  store.tsx  reducer + actions  + runMatch/manualMove/cancelDriver         │
│             + public flow:   requestJoin/decideRequest/rateMember         │
│  reputation.ts  pure helpers (rating, history, permissions)               │
└──────┬──────────────────────────────┬─────────────────────────────────────┘
       │ persist (debounce 250ms)     │ buildMatchInput(state, eventId)
┌──────▼──────┐              ┌────────▼──────────── engine/ ────────────────┐
│ services/   │              │  types.ts     MatchInput → MatchResult       │
│ storage     │              │  matching.ts  greedy + local search + warm   │
│ notify      │              │  routing.ts   RoutingProvider (Mock | OSRM)  │
│ billing     │              │  geo.ts       haversine, walking,  RNG       │
│ export      │              └──────────────────────────────────────────────┘
└─────────────┘
```

Three layers with dependencies flowing in a single direction: **UI → state → engine**.
The engine doesn't know React exists; the UI doesn't know how matching is solved.

## The engine (src/engine)

**Contract** — the only thing a future backend must honor:

```ts
solveMatching(
  { drivers: DriverLeg[], passengers: PassengerLeg[], meetingPoints?, options? },
  provider: RoutingProvider
) → { rides: Ride[], unassigned: Unassigned[], stats: MatchStats }
```

- It's a **small-scale CVRPTW** (vehicles with capacity + time windows).
  For the target size (≤ ~100 people per event) a greedy insertion-cost heuristic
  + local-improvement passes is enough; 90 pax + 20 cars < 1 s with the mock provider.
- `options.warmStart` receives the previous result and the solver tries to keep
  valid assignments → **incremental recompute** (a driver cancels, a passenger
  joins: it moves the minimum). Used by `cancelDriver` and `decideRequest`.
- `validateMatch` re-checks every hard constraint on a result; the UI
  always runs it and shows `Violation[]` (these can only appear after a manual override).
- `applyManualMove` implements the admin's "move by hand" without recomputing everything.
- **RoutingProvider** isolates routing: `MockRoutingProvider` (haversine ×1.3 at 26 km/h)
  for development/demo, `OsrmRoutingProvider` (OSRM's `table` service) for
  production. The engine requests **a single matrix** of distances per computation, so
  network cost doesn't blow up with event size.

### Non-assignment reasons

`UnassignedReason` is a closed enum (`sin_conductores | necesidades | capacidad |
desvio | ventana | caminata | manual`) and every value has a translation. The product
rule "if there's no match, say clearly why" is wired into the type.

## The state (src/state)

- **A single source of truth** (`AppState`) in a `useReducer`; screens hold no
  domain state of their own, only ephemeral UI state (open sheets, forms).
- **Persistence**: two modes depending on `hasSupabase` (`services/supabaseClient.ts`).
  - **With backend:** the truth lives in Postgres (Supabase). `services/repo.ts` does `loadRemote`
    (builds the `AppState` from the tables) and `writeAction` (writes per action); localStorage
    stays a **cache** for fast, offline startup. Sync via Realtime.
  - **Local/demo:** 250 ms debounce to localStorage with an in-memory fallback (iframes/incognito),
    versioned key `convoyar:v4`; hydrate requires `version === 4` and re-seeds otherwise.
  A model change bumps key+version **and** requires its Postgres migration in `server/`.
- **`stateRef`**: store callbacks read `stateRef.current` so they don't capture
  stale state, but a `dispatch` isn't reflected until the next render. That's why
  every "modify legs then compute" sequence passes the legs explicitly via
  `legsOverride` (see `cancelDriver`, `decideRequest`, `scheduleSimulatedReply`).
- **Diff-based notifications**: `diffNotifs(prev, next)` compares assignments and generates
  "you were assigned / your trip changed / you lost your seat (reason)" alerts. There's no
  real push yet; `services/notify.ts` uses the browser's Notification API when permission is granted.

## Backend (Supabase) — how it connects

The backend is **connected**. `services/supabaseClient.ts` exposes `supabase` (the client) and
`hasSupabase` (true with env vars in dev/prod; false in tests, E2E and `build:single`). That single
switch decides everything: with it on, `store.tsx` starts the session (`onAuthStateChange`),
creates the new user's personal org (RPC `ensure_personal_org`), loads via `loadRemote` and
subscribes to Realtime (`subscribeRealtime`); with it off, the usual local demo runs.

- **Auth**: email + password (`services/auth.ts`). `meId` = member linked to `auth.uid()`.
- **Data**: `services/repo.ts` maps `AppState` ⇄ tables (snake_case ⇄ camelCase) and writes per
  action (`writeAction`). Schema and policies in `server/` (`schema.sql`, `rls.sql`); the migrations
  (`migrate-v3-to-v4`, `-personal-org`, `-orgs`, `-moderation`, `-review-gate`, `-trip-history`) have already run in dev and prod.
  RLS active on every table.
- **Realtime**: the shared tables are in the `supabase_realtime` publication; a change in
  the database reloads the client's state without reloading the page.
- **Engine privacy**: home addresses (`member_home`) are self-only via RLS. For the public
  mode with strangers, matching should run in an Edge Function (the pure TS engine) and
  return only meeting points + ETAs, never the homes (pending; see the launch/ docs 01 and 03).

## Public mode (BlaBlaCar-style)

Design decisions:

- **`visibility` lives on the event, not on the org.** A private org can publish
  a one-off trip (e.g. "Delta getaway") without exposing anything else.
- **`JoinRequest` is append-only** with a `status`; "the latest request wins"
  (`myRequestFor` orders by `at`). This allows re-requesting after a rejection without
  erasing history.
- **Reputation is derived, never stored**: `ratingOf`/`tripCountOf` walk
  `reviews`/`tripHistory` on the fly. There are no cached counters that can
  drift out of sync. Reviews are gated to co-travelers only (`canReview` on the client plus the `share_trip` RLS check on the server), and the real trip history is materialized in the backend via the `materialize_my_trips` RPC, not computed on the client.
- **On accepting** a request: a reasonable passenger `Leg` is created
  (`defaultPassengerLeg`: origin = their home, 10' walk, window [event time − 90',
  event time]) and, if an assignment had already been computed, it's re-run with `warmStart`
  to move the minimum. The accepted person can then edit their leg from MyTrip
  (they're now a participant).
- **Permissions**: `canAdminEvent` = event creator ∨ org admin (other people's public
  events don't show you Admin). `isParticipant` = org member ∨
  approved request (the MyTrip gate).
- **Someone else's organizer — real with the backend, simulated without it.** With Supabase, the
  request, the decision and the approval are real between different people and arrive via Realtime.
  In local/demo mode (`!hasSupabase`), `scheduleSimulatedReply` auto-approves after ~4 s (leg + matching
  + notification) and an on-mount sweep resolves pending requests from earlier sessions. The simulation
  wasn't deleted: it's **gated with `if (hasSupabase) return`**, and the UI states so in demo mode
  ("the organizer replies on its own").

## i18n

Flat dictionaries in `src/i18n/` — **6 languages** (es/en/pt/de/it/fr) with the type
`TKey = keyof typeof es`: a key missing in any language is a compile error.
`{var}` interpolation via split/join (no dependencies). Plurals: if `vars.n === 1` and a
`clave_one` key exists, `translate` uses it automatically. Enough for the current 6; if one day
there are languages with complex plurals, swap in `Intl.PluralRules` inside `translate` (a single
point of change).

## Monetization (off, wired)

`services/billing.ts`: `free/pro/org` plans with limits and `can(plan, feature)`;
`AdSlot` renders null unless `ADS_ENABLED=true`; `purchase()` is a stub with the
integration points documented (Stripe on web / RevenueCat in the stores). The only gate active
today is `metricsExport` (CSV/JSON export in Admin) so the rail can be exercised.

## Distribution

- **Web/PWA**: static `dist/` with a manifest + service worker (shell and tile cache,
  limit 250) → installable, tolerant of poor signal. **Live in production at convoyar.com**
  (installable PWA). Deploy is via Cloudflare Pages direct upload (project `convoyar-web`):
  `npm run deploy` → `wrangler pages deploy dist --project-name convoyar-web --branch main`.
- **Single file**: `dist-single/index.html` (~400 KB) via vite-plugin-singlefile (always local).
- **Stores**: Capacitor 8 (`app.convoyar`). **Android: signed AAB v3** (versionCode 3 / 1.0.2)
  built and synced with the prod build, in Google Play **closed testing** (the 12 testers × 14 days
  requirement is in progress). iOS still pending. Native push: hook `@capacitor/push-notifications`
  where `services/notify.ts` sits today (blocked on human FCM/APNs credentials).

## Testing

| Layer | Tool | What it covers |
|---|---|---|
| Engine | vitest (`engine/matching.test.ts`) | hard constraints, warmStart, 90+20 scale, determinism |
| State/domain | vitest (`state/public.test.ts`) | reputation, permissions, v4 seed consistency |
| Integration | vitest (`state/integration.test.ts`) | seed → buildMatchInput → engine with no violations |
| Render | vitest (`state/smoke.test.tsx`) | every screen renders with the seed |
| Real flows | Playwright (`e2e/app.spec.ts`) | matching, explore→request→accepted, admin requests, ratings, theme/language |
| Visual | Playwright (`e2e/screenshots.spec.ts`) | dark/light screenshots to docs/screenshots |

**Suite:** 129 unit tests + 31 Playwright e2e, green alongside `npm run typecheck` and `npm run build`. The web bundle is a single ~945 KB chunk (~280 KB gzip).
