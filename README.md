# Convoyar 🚗

**Collaborative logistics for organizations**: coordinate who drives whom to barbecues, offices, communities and events of 10 to 90+ people. Optimal matching with real constraints, OpenStreetMap maps and zero paid APIs. Plus, **BlaBlaCar-style public trips**: open departures where people request a seat and the organizer accepts or rejects based on ★ reputation, history and seniority.

Factory demo included: *La Banda del Asado* (26 people, 8 cars, 5 meeting points in CABA) with the "Saturday asado" ready to compute, plus the *Comunidad Convoyar* community with public trips to Mar del Plata and La Plata, and 3 requests awaiting your decision on the "Escapada al Delta".

| Home | Explore | Onboarding | My trip |
|---|---|---|---|
| ![Home](docs/screenshots/01-home.png) | ![Explore](docs/screenshots/02-explore.png) | ![Onboarding](docs/screenshots/12-onboarding-bienvenida.png) | ![My trip](docs/screenshots/05b-ventana-horaria.png) |

| Requests | Results + confetti | Convoy chat | Profile |
|---|---|---|---|
| ![Requests](docs/screenshots/04-solicitudes.png) | ![Results](docs/screenshots/07-resultados.png) | ![Chat](docs/screenshots/15-chat.png) | ![Profile](docs/screenshots/08-perfil.png) |

> 🤖 **Are you an AI agent?** Start with [AGENTS.md](AGENTS.md). Design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); live status and scale backlog in [docs/ROADMAP.md](docs/ROADMAP.md).
>
> 🚀 **Launch status:** **LIVE in production at [convoyar.com](https://convoyar.com)** (installable PWA). The real backend is **connected** (Supabase: sign-up/login with **email + password**, orgs, realtime, RLS active, migrations run in dev and prod). Deploy is a direct Cloudflare Pages upload (`npm run deploy`). Android: a **signed AAB (v3)** is in Google Play **closed testing**. Step-by-step operational guide in [docs/launch/](docs/launch/); SQL migrations in [server/](server/).

---

## Run in 3 commands

```bash
npm install
npm run dev        # opens http://localhost:5173
npm test           # unit + integration (engine · public · i18n · auth · garage · smoke)
```

Other commands:

```bash
npm run test:e2e      # 31 E2E flows with Playwright (spins up its own server on :5199)
npm run typecheck     # tsc --noEmit
npm run build         # → dist/         (web / PWA / Capacitor deploy)
npm run build:single  # → dist-single/  (a SINGLE self-contained index.html)
npm run preview       # serves dist/ locally
npm run deploy        # wrangler → Cloudflare Pages (convoyar-web)
```

---

## What it does

- **Guided onboarding**: a welcome wizard (language → name → email → your home → car? → notifications) so a new user understands everything in a minute.
- **Roles per event**: each member picks driver / passenger / not going, with a time window.
- **Garage**: add several vehicles (with nicknames like "el Gol"/"la moto") and pick **which one you drive on each departure** — the engine takes the chosen vehicle's capacity.
- **Hard constraints** (never violated): car capacity, driver's max detour, passenger's walking radius, time windows, needs (♿ wheelchair, 🐕 pets, 👶 child seat).
- **Configurable in space AND time**: the **walking radius** is drawn live as a circle on the map; the **time window** as a timeline with the event time marked. Both move with sliders.
- **Soft preferences** (only break ties, never discard): same subgroup, smoke-free car.
- **Meeting points**: if it suits a passenger to walk to a known stop (station, square), the engine proposes it with walking minutes.
- **Public or private departures (BlaBlaCar-style)**: a private event belongs to the org only; a public one appears in **Explore** (with date filters: today / this weekend / next 7 days) for the whole community. A public trip is published **in one step** from Explore ("Publish trip"). You request a seat with a tap; the organizer sees your **★ score, how many trips you've done, how long ago you joined, your reviews and your message**, and accepts or rejects. On acceptance, you enter the computation automatically.
- **Reputation, reviews & achievements**: 1–5 star reviews **only between people who actually shared a trip** (materialized real trip history), public profile with seniority, **badges** (first trip, five stars, garage…) and a "complete your profile" bar.
- **Simple outside, powerful inside**: the core is always visible; advanced config (account, language, theme, time format, default trip preferences) lives in **Settings**, one tap away.
- **Real accounts**: sign-up and login with **email + password** (Supabase Auth) and password recovery, plus sign out and **delete account** (right to be forgotten). Every new user starts with their **personal org** ("My trips"); in local demo mode (no backend) the app opens straight into the factory org, no login.
- **Private groups**: unlimited and free. Share an **invite code**, invite by **email**, or turn on a **self-serve invite link with a toggle** (Drive-style, off by default); **deep links** (`?join=CODE`), an **org switcher**, leave org and admins are all shipped, in 6 languages.
- **Communications**: **per-convoy chat** between participants and per-type notification preferences (assignments / requests / chat / email).
- **Moderation**: **report** (pauses the reported person server-side until a human reviews) and **block** (personal: you stop seeing whoever you block), **wired end-to-end**. No identity verification yet.
- **Recurring trips**: private groups share a **common destination** (trips inherit the node) and can set **weekly recurrence** days, shown in the UI (cloning each occurrence is on the roadmap).
- **Admin**: build/rebuild convoys, move passengers by hand (with a warning if it breaks a constraint), accept/reject requests, cancel a driver (incremental recompute with `warmStart`), metrics (assigned, cars, detour, CO₂) and CSV/JSON export.
- **Duolingo-style celebrations**: confetti when you get a convoy and when you build them, micro-interactions, illustrated empty states.
- **6 languages** (🇦🇷 es · 🇺🇸 en · 🇧🇷 pt · 🇩🇪 de · 🇮🇹 it · 🇫🇷 fr), dark/light mode, mobile-first.

## What's real and what's mock

| Area | Status |
|---|---|
| Matching engine (small-scale CVRPTW) | **Real.** Standalone module in `src/engine/`, no UI dependencies. 90 pax + 20 cars in <1 s. |
| Backend / multi-device | **Real and connected (Supabase).** Client in `src/services/supabaseClient.ts`; read/write and realtime in `src/services/repo.ts`. The `hasSupabase` switch turns the backend on in dev/prod and off in tests, E2E and `build:single` (which stay 100% local). |
| Auth | **Real: email + password** (Supabase Auth), in `src/services/auth.ts` (sign-up, login, reset). In local demo mode there's no login: starts with `meId "m0"`. |
| Public mode: requests, accept/reject, reputation, history | **Real** (logic and UI complete). With the backend, requests between real people sync over **Realtime**. In local demo mode, the other organizer "replies" on its own after ~4 s (`scheduleSimulatedReply` in `store.tsx`, **only active if `!hasSupabase`**). |
| Reviews & trip history | **Real, gated to co-travelers only** (`canReview` + `share_trip` RLS); real trip history materialized via the `materialize_my_trips` RPC. Migrations `migrate-review-gate.sql` and `migrate-trip-history.sql` are run in dev and prod. |
| Routing | **Mock by default** (`MockRoutingProvider`: haversine ×1.3 at 26 km/h). A real **OSRM adapter is already written** (`OsrmRoutingProvider`), 1-line swap (see below). |
| Maps | **Real**: Leaflet + OpenStreetMap tiles (attribution included, mandatory). |
| Convoy chat | **Real** (UI + state; with the backend it syncs over Realtime). The simulated auto-reply only runs in local demo mode. |
| Persistence | With the backend: **Postgres on Supabase** (multi-device). In demo mode: localStorage (key `convoyar:v4`) with in-memory fallback, single device. |
| Moderation (report / block) | **Real, wired end-to-end** (`server/migrate-moderation.sql`): a report pauses the reported person server-side until human review; block/unblock is personal. No identity verification yet. |
| Push notifications | **Pending.** Today: in-app alerts + browser Notification API (app open). Native push blocked on human-provided FCM/APNs credentials → [docs/launch/07](docs/launch/07-push-notifications.md). |
| Monetization | **Wired and off** (100% free, see below). |

## Architecture

```
src/
  engine/       ← THE ENGINE. Zero React/DOM imports. Portable to a worker or backend.
    types.ts      contract: MatchInput → MatchResult (+ Violation[])
    matching.ts   solveMatching / validateMatch / applyManualMove (incremental warmStart)
    routing.ts    RoutingProvider interface + Mock + OSRM (one matrix() call per event)
    geo.ts        haversine, walking, deterministic RNG
  state/        store (context + useReducer), v4 model, reputation, garage, achievements, debounced persistence
  screens/      Home · Explore (public) · My trip · Results · Admin · Profile · Auth (login)
  components/   People (avatar/stars/profile), MapPicker (Leaflet), RideCard, Chat, UI kit, icons
  services/     supabaseClient (hasSupabase) · repo (AppState ⇄ Supabase + realtime) · auth (email+pass) · storage (local cache) · billing · notify · export
  i18n/         6 languages (es/en/pt/de/it/fr) with {var} interpolation and plurals (_one)
  seed.ts       deterministic demo: private org + public community (Buenos Aires)
server/         executable SQL: schema · rls · migrations (v3→v4, personal org, orgs, moderation, review gate, trip history) · edge-functions
e2e/            Playwright: real flows + screenshot generator
docs/           ARCHITECTURE.md · ROADMAP.md · HUMAN-TODOS.md · BRAND.md · launch/ · legal/ · screenshots/
```

**Engine contract** (the only thing a future backend must respect):
`solveMatching({ drivers, passengers, meetingPoints?, options? }, provider) → { rides, unassigned }`, where each `Ride` carries ordered stops with ETA and detour, and each unassigned entry carries a readable `UnassignedReason` (`capacidad`, `desvio`, `ventana`, `caminata`, `necesidades`, `sin_conductores`, `manual`).

## Real routing with OSRM (self-hosted, free)

1. Spin up OSRM with data for your region (Argentina example):

```bash
wget https://download.geofabrik.de/south-america/argentina-latest.osm.pbf
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/argentina-latest.osm.pbf
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-partition /data/argentina-latest.osrm
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-customize /data/argentina-latest.osrm
docker run -t -i -p 5000:5000 -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/argentina-latest.osrm
```

2. Swap the provider in `src/state/store.tsx` (line ~418):

```ts
// const provider = useMemo(() => new MockRoutingProvider(), []);
const provider = useMemo(() => new OsrmRoutingProvider("http://localhost:5000"), []);
```

The engine makes a **single** `matrix()` call per computation (OSRM's `table` service), so it scales well.

Future geocoding (search addresses by text): self-hosted [Nominatim](https://nominatim.org/), same OSM spirit. Today the origin is picked by tapping the map, so it's not needed.

## Deploy

**Web (static):** `npm run build` and upload `dist/` to any static host (Netlify / Vercel / GitHub Pages / plain nginx). It's a PWA: manifest + service worker caching the shell and tiles (limit 250) → installable and usable on a poor connection. In production it's **LIVE at convoyar.com**, deployed via a direct Cloudflare Pages upload (`npm run deploy` → `wrangler pages deploy dist --project-name convoyar-web --branch main`).

**Single file:** `npm run build:single` generates a self-contained `dist-single/index.html` (~520 KB). Handy for emailing/Drive or demos. Only needs internet for map tiles.

**Android (Capacitor):** a **signed AAB (v3, versionCode 3 / 1.0.2, package `convoyar.app`)** is in Google Play **closed testing** (12 testers × 14 days requirement in progress). Capacitor 8 (`@capacitor/core|cli|android`) is installed, the `android/` platform is synced with the production build, icons/splash are generated, and release signing is configured via `android/keystore.properties`. Step-by-step in [docs/launch/05](docs/launch/05-google-play.md).

```bash
npm run build && npx cap sync android   # rebuild the web (prod) and copy it into the native project
npx cap open android                     # Android Studio → sign → .aab for the Play Store
```

**iOS:** pending (requires macOS/Xcode). `npx cap add ios` when the time comes → [docs/launch/06](docs/launch/06-app-store-ios.md).

For native push: `@capacitor/push-notifications` + FCM/APNs, hooking in where `services/notify.ts` is today → [docs/launch/07](docs/launch/07-push-notifications.md).

## Monetization (off by design)

The whole rail lives in `src/services/billing.ts`:

- `free / pro / org` plans with limits (`maxOrgs`, `maxMembersPerOrg`, `metricsExport`) and a `can(plan, feature)` gate. In Admin, exporting metrics on the free plan shows the upsell (you can try it today).
- `ADS_ENABLED = false` → the `AdSlot` component renders nothing. Flip the flag and pick a network (AdMob via Capacitor on mobile, or whatever web provider you want).
- `purchase(plan)` is a stub with the integration points annotated: **Stripe** (web) or **RevenueCat** (cross-platform in-app purchases).

None of this affects current functionality: today it's 100% free and ad-free.

## Roadmap

1. **Local MVP** ✅ — engine + full UI + BlaBlaCar-style public mode + onboarding + 6 languages + chat + visual delight. Single device, mock routing with the OSRM adapter ready.
2. **Real sync (Supabase)** ✅ **connected** — orgs, **email + password auth**, realtime, per-user personal org, requests between real people; migrations run in dev+prod, RLS active, the engine moved over respecting the contract. **LIVE at convoyar.com.** Still pending: **native push**. Guide in [docs/launch/](docs/launch/).
3. **Stores & scale** — Android AAB v3 signed and in Google Play closed testing (iOS pending); native push; then self-hosted OSRM, Nominatim geocoding, recurrence cloning, analytics/funnel, matching in an Edge Function, convoy states, cross-device in-app notifications, and optional identity verification later. Moderation is already shipped end-to-end.

Technical detail in [docs/ROADMAP.md](docs/ROADMAP.md) · how to launch in [docs/launch/](docs/launch/).

## Decisions I made differently from the spec (and why)

- **"Move passenger" with a picker instead of drag-and-drop**: on small touch screens dragging between long cards is frustrating; a sheet with the list of cars (capacity visible) is faster and more accessible. The logic (`applyManualMove` + violation warning) is the same.
- **Local-first first, backend later (done)**: the MVP started 100% client-side (free to run, no blockers), and the engine contract let it **move to Supabase without touching the UI** — which is exactly what happened. Local mode is still alive (`hasSupabase` switch) for tests, `build:single` and offline demos.
- **PWA first, stores later**: same code; `dist/` is already installable as a PWA and **LIVE at convoyar.com**, and Android ships as a **signed AAB (v3)** in Google Play closed testing.

## License

MIT. Tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (the on-map attribution stays).
