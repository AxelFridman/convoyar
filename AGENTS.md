# AGENTS.md — Guide for AI agents working on Convoyar

> Read this whole thing before touching code. It's 5 minutes and saves you from breaking
> invariants that the tests don't always catch. Sibling docs: [docs/ROADMAP.md](docs/ROADMAP.md)
> (**live state of the work + what's left, plus the code-PR tracker — start here to pick up**),
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (in-depth design) and
> [docs/launch/](docs/launch/) (**step-by-step operational guide to actually ship**:
> Supabase, auth, web deploy, Play Store, App Store, push, monetization, OSRM,
> analytics). The executable Postgres schema and its migrations (already run in dev+prod) live in [server/](server/).
>
> Working method: one `feat/*` branch per block of work → PR → merge.
> Every half-finished feature gets noted in docs/ROADMAP.md before closing the session.
>
> **Secrets:** `.env` and `server/.env` are gitignored. NEVER commit real keys
> (Supabase `service_role`, passwords). GitHub push protection is active and rejects the push.

## What this is

Mobile-first PWA for **collaborative logistics**: organizations (barbecues, offices, clubs)
coordinate "who drives whom" with a home-grown matching engine (small-scale CVRPTW),
plus a **public BlaBlaCar-style mode**: discoverable trips where people request a seat
and the organizer accepts/rejects based on reputation, history, and seniority.

Stack: React 18 + TypeScript + Vite + Leaflet/OSM + **Supabase** (Postgres + Auth + Realtime).
**Zero paid map/routing APIs** (hard requirement): OSM maps, mock routing or self-hosted OSRM.

**Real backend connected.** The `hasSupabase` switch (`services/supabaseClient.ts`) picks the mode:
- **With backend** (dev/prod, `VITE_SUPABASE_*` env vars present): **email + password** auth,
  data in Supabase, sync via **Realtime**, `meId` derived from the session, and every user
  starts with their **personal org** ("My trips", `ensure_personal_org` RPC).
- **Local/demo** (`npm test`, E2E, `build:single`, or no env vars): state in localStorage
  (`convoyar:v4`) with an in-memory fallback, single device, fixed `meId` (`m0`), no login, with
  the simulated third-party organizer. This mode is kept on purpose (tests and offline demos).

## Commands

```bash
npm run dev          # dev server (Vite, port 5173)
npm test             # vitest: engine + integration + smoke + public mode
npm run test:e2e     # Playwright (spins up its own server on :5199)
npm run typecheck    # tsc --noEmit
npm run build        # → dist/ (web/PWA/Capacitor)
npm run build:single # → dist-single/index.html self-contained
```

**Definition of "done": the first four commands green.** If you add
screens, add a smoke test; if you add state logic, add a unit test; if you add a
user flow, add an E2E test.

## Code map (where everything lives)

```
src/
  engine/       ★ THE ENGINE. Pure, no React/DOM/UI imports. Do NOT add deps to it.
    types.ts      MatchInput → MatchResult contract. Read it before anything else.
    matching.ts   solveMatching / validateMatch / applyManualMove (warmStart = incremental)
    routing.ts    RoutingProvider: Mock (haversine) + real OSRM (1-line swap in store)
    geo.ts        haversine, walking minutes, deterministic RNG
  state/
    model.ts      ALL of the data model (AppState v4). Changes here = version bump + migration.
    store.tsx     Context + useReducer. Actions, runMatch, public flow; with backend: session
                  bootstrap (onAuthStateChange), loadRemote, realtime subscription; demo timers (local only).
    reputation.ts Pure reputation/permission helpers (ratingOf, canAdminEvent, …)
    seed.ts       (in src/) Deterministic demo: private org + public community
  screens/      Home · Explore (public) · MyTrip · Results · Admin · Profile · Auth (login)
  components/   People (Avatar/Stars/MemberProfile) · RideCard · Chat · MapPicker · UI kit · Icons
  services/     supabaseClient (hasSupabase + client) · repo (AppState ⇄ Supabase + realtime) ·
                auth (email+password) · storage (local cache + fallback) · billing (off) · notify · export
  i18n/         es/en/pt/de/it/fr. Plural: a key with the `_one` suffix is used alone when vars.n === 1.
server/         schema.sql · rls.sql · migrations (v3→v4, personal org, orgs, moderation, review-gate, trip-history) · edge-functions
e2e/            Playwright: real flows + screenshots.spec (captures to docs/screenshots)
```

## Invariants that DON'T get broken

1. **The engine doesn't know the UI.** `src/engine/` doesn't import React, state/, or services/.
   Everything it needs comes in through `MatchInput` and the `RoutingProvider`.
2. **Hard vs soft constraints.** Capacity, max detour, time window,
   walking, and needs (wheelchair, etc.) are NEVER violated automatically;
   soft preferences (subgroup, smoke-free) only break ties. An admin can
   force by hand, but the UI shows the violation (`validateMatch`).
3. **Nobody gets assigned outside their limits.** If there's no feasible match, the person
   stays `unassigned` with a human-readable `UnassignedReason`. Nothing gets "stretched".
4. **Determinism.** The seed and the engine (with a fixed `seed`) are reproducible; the tests
   depend on it. Don't drop in `Math.random()` without going through the RNG in `geo.ts`.
5. **Complete i18n.** Zero hardcoded UI strings: every new key goes in all six locales
   (`es`, `en`, `pt`, `de`, `it`, `fr`) — the `TKey` type enforces it; if TypeScript complains
   about a key, you're missing a language.
6. **Privacy by design.** A member's exact home is never shown to others; the computed
   meeting point is what's shared. Keep that when adding screens.
7. **$0 to operate.** No Google Maps / paid APIs. Maps = OSM + Leaflet;
   routing = mock or self-hosted OSRM.

## Data model in 30 seconds (state/model.ts)

- `Org` (members, `adminIds`, `joinCode`, meeting points) → `EventDoc` (**`visibility:
  "private" | "public"`**, `createdBy`) → `Leg` (a member's response to an event:
  driver with max detour / passenger with max walk + time window; `vehicleId?` = which
  garage vehicle they bring). `Member.home?` is **optional**; the real origin travels per trip (`Leg`).
- Garage: `Member.vehicles: Vehicle[]` (each with `id`, `alias?`, `capacity`, `features[]`, `smokeFree`).
- Public mode: `JoinRequest` (pending/approved/rejected) + `Review` (1–5★, only between
  co-travelers via `canReview` + the `share_trip` RLS) + `TripRecord` (real trip history,
  materialized by the `materialize_my_trips` RPC) + `Member.joinedISO` (seniority).
- `Assignment` = the engine's result per event (`state.assignments[eventId]`).
- **Migration**: `AppState.version === 4` and the `convoyar:v4` key. In local mode, if you change the
  model you bump the version+key (old state is discarded and re-seeded). **With the backend now
  connected**, every model change ALSO needs its Postgres migration in `server/` (see
  `migrate-v3-to-v4.sql`, `migrate-personal-org.sql`, `migrate-orgs.sql`, `migrate-moderation.sql`,
  `migrate-review-gate.sql`, `migrate-trip-history.sql`), run in dev **and** prod. Shared tables
  go into the `supabase_realtime` publication.

## Public flow (BlaBlaCar-style) — how it works today

- `Explore.tsx` lists events with `visibility === "public"`. Request a seat → `store.requestJoin()`.
- **With backend (Supabase):** the request, the organizer's decision and approval are **real**
  between different people and sync via **Realtime** (`services/repo.ts` `subscribeRealtime`);
  the store reloads with `loadRemote` when it receives the change. The UX is identical to the demo's.
- **In local/demo mode (`!hasSupabase`):** there's no other human, so the "organizer" of
  someone else's event is simulated: `scheduleSimulatedReply` (store.tsx, **gated with
  `if (hasSupabase) return`**) approves after ~4s, creates the accepted person's `Leg`
  (`defaultPassengerLeg`), runs matching, and notifies. An on-mount sweep resolves pending
  requests from another session. This simulation only runs without a backend (it wasn't deleted:
  it's switched off by the gate).
- Organizer side (your events): `RequestsPanel` in Admin — shows the requester's rating, trips,
  seniority, and message; `decideRequest()` accepts (creates a leg + recomputes with
  `warmStart` if there was already an assignment) or rejects. The affected person is always notified.
- Gates: `canAdminEvent` (organizer or org admin) for Admin;
  `isParticipant` (org member or approved request) for MyTrip.

## Known gotchas (they'll bite you if you don't know them)

- **`stateRef.current` in store callbacks**: `dispatch` doesn't update `stateRef`
  until the next render. If you chain dispatch + a state read in the same tick
  (e.g. create a leg and run matching), pass the data through `legsOverride`, don't read
  the state. `runMatch`, `cancelDriver`, `decideRequest` and the simulated reply already
  do it this way — copy that pattern.
- **Time windows are in minutes from 00:00 of the event day** (750 = 12:30).
  `defaultPassengerLeg` derives the window from `event.dateISO`. If the seed defines
  drivers with a [390,435] window, a passenger with [330,420] DOES overlap.
- **Port 5173 may be taken by another app of the user's** — that's why Playwright
  uses 5199 with `--strictPort`. Don't "simplify" it back to 5173.
- **`Sheet` closes when you click the backdrop**; in E2E, close it with
  `page.locator(".sheetBack").click({ position: { x: 10, y: 10 } })`.
- **npm blocks esbuild's postinstall** on this machine (`allowScripts` in package.json
  already permits it; if a clean install fails, `npm approve-scripts esbuild`).

## How to extend without breaking

- **New matching rule** → types in `engine/types.ts`, logic in `matching.ts`,
  test in `matching.test.ts`. The UI exposes it later; the engine first.
- **New screen** → screens/ + a tab in `App.tsx` + i18n keys (all six languages) + a smoke test.
- **Real routing** → stand up OSRM (README §OSRM) and swap `MockRoutingProvider` for
  `OsrmRoutingProvider` in `store.tsx` (~line 230). A single `matrix()` call per computation.
- **Real backend** → **already connected (Supabase).** Writes live in `services/repo.ts`
  (`writeAction`) and loading in `loadRemote`; auth in `services/auth.ts`. If you add an action
  that mutates `AppState`, besides the `dispatch` add its write in `repo.ts` and, if it's a new
  table, its migration in `server/` + an RLS policy + (if shared) the realtime publication.
- **Monetization** → `services/billing.ts` has the rails (plans, gates, `AdSlot`,
  `purchase()` stub). Don't invent another system: turn that one on.

## Style

- Rioplatense Spanish in UI copy and comments (the code itself is in English). Comments only for
  invariants / non-obvious whys, not to narrate the code.
- Handcrafted CSS in `styles.css` with variables (`--bg`, `--accent`, …) and an
  "Argentine road-signage" aesthetic. No CSS frameworks; respect the tokens and dark mode
  (`data-theme` on `<html>`).
- Small, typed components; no `any` (the `tsconfig` is strict).
