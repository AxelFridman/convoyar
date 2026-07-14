# 09 · Real routing with OSRM — detours over real streets

> **What you'll achieve:** having the engine's distances and times come from **real
> streets** (highways, rivers, one-way streets, directions) instead of straight lines. When
> you're done you'll have your own OSRM server running and the app pointing at it with a
> **1-line** change.

> ⚠️ **This is OPTIONAL and it's Phase 3.** By default the app uses `MockRoutingProvider`:
> haversine (straight line) ×1.3 at 26 km/h. **It's more than enough to launch** — you don't
> need it for Phases 1 and 2. Only dive in here once real-street detours start to matter for
> real (areas with rivers, highways, bridges, one-way streets that make the straight line lie
> badly).

**Before you start, read:** [the folder README](README.md) · the **"Real routing with
OSRM"** section of the [root README](../../README.md) (the full Docker commands live there) ·
the adapter already written in [`src/engine/routing.ts`](../../src/engine/routing.ts).

| | |
|---|---|
| ⏱️ Time | ~2–3 h (most of it is waiting for OSRM to process the map) |
| 💰 Cost | USD 0 to ~USD 5/mo depending on the option (see table) |
| 🧑 / 🤖 | Almost all **YOU** (spin up VM + Docker). The code is **1 line** 🤖 |

> ### 📍 Status (2026-07-12): ⏳ pending — Phase 3 (optional)
> Nothing to touch. The app uses the mock (haversine) and **it's enough to launch**. Come
> back only if real-street detours start to matter.

---

## What OSRM improves (and what it doesn't)

The engine asks the `RoutingProvider` for a **matrix** of times and distances between all the
points of an event. Today the mock computes it with a straight line ×1.3. OSRM computes it by
**routing over OpenStreetMap's real street network**:

- Each driver's **detours** are the real ones (going around a river, taking the highway).
- The **ETAs** and walking minutes stop being an optimistic estimate.
- Matching stays the same: what changes is where the numbers come from, not the logic.

What **doesn't** change: you don't need to touch the engine or the UI. The `matrix()` contract
is the same.

---

## ⚠️ The reality of the costs (read this before getting excited)

OSRM is **not** a one-click free tier. It's a server you administer, and the routing graph
eats RAM. For **all of Argentina** you need a VM with **several GB of RAM** (it won't fit in a
tiny 1 GB free tier). Options, from most free to most paid:

1. **Oracle Cloud Free Tier (ARM Ampere)** — the best free option for self-hosting.
   The "Always Free" ARM gives you up to **~24 GB of RAM and 4 vCPU** at no cost, forever.
   More than enough for all of Argentina. ⚠️ You have to create the **ARM (aarch64)** VM by
   hand, and sometimes ARM instance availability is exhausted in your region → keep at it (try
   different availability domains, or retry later; it usually shows up).
2. **Cheap VPS** (Hetzner ~€4–5/mo, or similar) — if you'd rather not fight for availability
   and prefer something stable and predictable. Pick a plan with **≥ 4 GB of RAM**.
3. **Narrow down the region** — if your users are only in, say, Buenos Aires/CABA, you can
   download a **regional extract** from [Geofabrik](https://download.geofabrik.de/south-america/argentina.html)
   that's much smaller. Less RAM, processes faster, fits on humbler machines.

| Option | 💰 Cost | RAM | When it fits |
|---|---|---|---|
| Oracle Cloud Free (ARM Ampere) | **USD 0** | up to ~24 GB | Recommended default; you can wait out ARM availability |
| VPS (Hetzner et al.) | ~**USD 5/mo** | 4–8 GB | You want stability without fighting for availability |
| Regional extract (on any VM) | same as the VM | much less | Your users are all from one area |

---

## Steps

### Step 1 — Spin up the VM with Docker 🧑 ⏱️ ~30 min

Create the VM (Oracle Free ARM or a VPS) with Ubuntu and install Docker. Open the
firewall/security list for the port you'll expose over HTTPS (Step 3), **not** port 5000
directly to the internet.

### Step 2 — Process the map and start OSRM 🧑 ⏱️ ~1–2 h (mostly CPU)

The `osrm-extract` → `osrm-partition` → `osrm-customize` → `osrm-routed` commands are already
**laid out in full in the [root README](../../README.md)** ("Real routing with OSRM" section).
I won't duplicate them here. In short:

1. You download the `.pbf` for your region from [Geofabrik](https://download.geofabrik.de/)
   (`argentina-latest.osm.pbf`, or a sub-region if you're narrowing down).
2. You run the 3 preprocessing steps with the `ghcr.io/project-osrm/osrm-backend` image.
3. You start `osrm-routed --algorithm mld` listening on port 5000.

> ⚠️ `osrm-extract` is what demands the most RAM. If the VM runs out of memory and the process
> dies (OOM), that's the signal to move to a bigger VM **or** narrow down to a regional extract.

### Step 3 — Put it behind HTTPS 🧑 ⏱️ ~30 min ⚠️

⚠️ **OSRM ships with no authentication.** As-is, anyone who knows the IP can use your server.
Your app calls it **from the client** (the user's browser), so the URL is going to be public
no matter what. Bare minimum: put a **reverse proxy** (nginx or Caddy) in front that:

- Terminates **HTTPS** (with Caddy and a domain it's almost automatic; otherwise, your own
  certificate).
- Restricts by **key/token** or by **IP** where possible, and adds a **rate limit**.
- Forwards only `/table/...` to the internal `localhost:5000` (don't expose all of OSRM).

Never publish the raw `:5000` to the internet.

### Step 4 — Swap the provider 🤖 ⏱️ 2 min

A **1-line** change in [`src/state/store.tsx`](../../src/state/store.tsx) (~line 280).
The `OsrmRoutingProvider` adapter already exists in `src/engine/routing.ts`, so there's no
routing code to write:

```ts
// const provider = useMemo(() => new MockRoutingProvider(), []);
const provider = useMemo(
  () => new OsrmRoutingProvider(import.meta.env.VITE_OSRM_URL ?? "http://localhost:5000"),
  []
);
```

Remember to import `OsrmRoutingProvider` alongside `MockRoutingProvider` (up top, ~line 25).
Ideally the URL is **not** hardcoded: it comes from a `VITE_OSRM_URL` env var that you define
in the hosting (see [doc 04](04-deploy-web-pwa.md)), so dev and prod point at different servers.

---

## 🧠 Scale: why this doesn't blow up

The engine makes **a single** `matrix()` call per computation (it uses OSRM's `table` service,
which returns the whole matrix at once). It's not one request per pair of points. Even if the
event has 90 people, it's **one** request per recompute → it scales comfortably, even on the
free VM.

---

## 🗺️ Geocoding down the road (in passing)

Searching for addresses **by text** ("Av. Corrientes 1234") is a different service: you do it
with self-hosted [Nominatim](https://nominatim.org/), same OSM philosophy as OSRM. **You don't
need it today**: in Convoyar the origin is chosen by **tapping the map** (`MapPicker`), not by
typing an address. I'm leaving this noted for whenever you want the address search box.

---

## ⚠️ Don't use the public demo server

`router.project-osrm.org` is **for testing only**: it has a rate limit, no SLA, and they can
cut you off whenever they want. It's fine for a 5-minute test; in production **host it
yourself**.

---

## ✅ Checklist for this doc

- [ ] You understand this is **optional** and that the mock is enough to launch
- [ ] You picked an infra option (Oracle Free ARM / VPS / regional extract) based on your RAM and area
- [ ] VM with Docker up and running
- [ ] Geofabrik `.pbf` processed (extract → partition → customize) and `osrm-routed` running
- [ ] OSRM behind a reverse proxy with **HTTPS** + restriction (key/IP) + rate limit
- [ ] Raw `:5000` **not** exposed to the internet
- [ ] 1-line swap in `store.tsx` (~280) using `VITE_OSRM_URL`
- [ ] Tested a real recompute and the detours/ETAs come out by street

---

## 🆘 Common problems

- **`osrm-extract` dies before finishing (Killed / OOM)** → you ran out of RAM. Move to a
  bigger VM or narrow down to a smaller regional extract.
- **No ARM instances available on Oracle** → a free-tier classic. Retry in another
  availability domain or later; it eventually shows up. If you don't want to wait, cheap VPS.
- **The app throws a CORS or mixed-content error when calling OSRM** → your site is HTTPS and
  you're calling `http://`. That's what Step 3 is for: OSRM has to be behind **HTTPS**.
- **`OSRM code=NoTable` / weird responses** → points outside the area of the `.pbf` you
  downloaded. You grabbed a regional extract but have users outside it → use the extract for
  all of Argentina.

---

**Next:** [10 · Analytics and monitoring](10-analytics-monitoring.md) → find out what's
happening in production.
