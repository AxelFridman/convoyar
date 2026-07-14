# 03 · Connect the app to the backend (and delete the mocks)

> **What you'll achieve:** wire the Convoyar front end to Supabase. When you're done, what
> today lives in a single device's `localStorage` moves into the shared database, login uses
> the real auth from [doc 02](02-auth.md), and **the simulation disappears** — the
> "organizer who answers all by itself." Two people on two phones see the same trip.

**Before this:** docs [01](01-supabase-database.md) (DB + RLS) and [02](02-auth.md) (auth).

| | |
|---|---|
| ⏱️ Time | Done. Convoyar is **live in production at [convoyar.com](https://convoyar.com)**. |
| 💰 Cost | USD 0 |
| 🧑 / 🤖 | The code is **done** 🤖. Env vars are set in the hosting and it's been verified with two real devices — this is live. |

> ### 📍 Status (2026-07-13): ✅ DONE
> The app **is connected to Supabase**: `@supabase/supabase-js` installed, `supabaseClient.ts`
> (with `hasSupabase`), `repo.ts` (AppState ⇄ tables + realtime) and **email + password** auth. It's
> real multi-user: two people on two devices see the same trip (in tests, E2E and
> `build:single` it stays 100% local). This doc remains as a **reference for how it was done** and
> what's left to polish. Env vars `VITE_SUPABASE_*` live in [`.env`](../../.env) (dev) and `.env.production.local`.

> 🧩 **Note on PR7 (`feat/server-skeleton`).** The original plan had a
> dedicated server with Postgres. With Supabase **you don't need it**: the "remote adapter" this doc
> describes talks straight to the DB via RLS. The Fastify server is kept for whenever you want
> heavy backend logic (see [01](01-supabase-database.md)); it's not a blocker.

---

## The map of the change (what this PR touches)

```
+ src/services/supabaseClient.ts   client + hasSupabase                                    ✅
+ src/services/repo.ts             adapter: AppState ⇄ tables + realtime                   ✅
~ src/services/auth.ts             email + password against Supabase Auth                  ✅
+ src/screens/Auth.tsx             sign-up / login / recovery screen                       ✅
~ src/services/storage.ts          became a local CACHE (offline), not the source of truth ✅
~ src/state/store.tsx              session (onAuthStateChange) + loadRemote + writeAction + subscribeRealtime  ✅
~ src/state/store.tsx              scheduleSimulatedReply + sweep + chat auto-reply: GATED with `if (hasSupabase) return` (not deleted)  ✅
```

The **local-first** philosophy isn't lost: `storage.ts` still exists as a **cache** so the
app opens instantly and works without signal; Supabase is the source of truth that syncs.

---

## Step 1 — Install the client 🤖 ✅ done

```bash
npm i @supabase/supabase-js   # ✅ already installed (^2.110)
```

---

## Step 2 — Environment variables 🧑 ⏱️ 10 min

The values come from [doc 01](01-supabase-database.md) (Project URL + anon key).

1. Create `.env.local` at the root (for development):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

> ✅ **It's already in your `.env`.** I added those two lines (pointing at **dev** for local) plus
> `VITE_SENTRY_DSN`. Remember: the "anon key" in the new format is your **`sb_publishable_...`**,
> NOT the `sb_secret_...`. Vite reads both `.env` and `.env.local`, so you don't need to
> move anything. For production, the same two variables go in Cloudflare with the **prod**
> values (see [doc 04](04-deploy-web-pwa.md)).

2. ⚠️ **Confirm that `.env*` is in `.gitignore`** (never commit keys — even though the anon
   one is public, it's good hygiene). If it isn't, add a `.env*` line (keeping out an
   `.env.example` with the names but no values, to document them).
3. In Vite, the variables **must start with `VITE_`** to reach the client. They end up
   **embedded in the bundle** → that's why only the `anon` (public) one goes, **never** the `service_role`.
4. The same two variables are loaded in the web hosting ([doc 04](04-deploy-web-pwa.md)) and
   get baked into the mobile app builds.

---

## Step 3 — The client 🤖

Create `src/services/supabaseClient.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** If there are no env vars, the app runs in local demo mode (like today). */
export const hasSupabase = Boolean(url && anon);

export const supabase = hasSupabase
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : (null as never);
```

`hasSupabase` is the switch: with env vars → real backend; without them (or in tests/`build:single`)
→ the local demo continues. [Doc 02](02-auth.md) uses it to turn on real auth (email + password).

> 📱 **Session on mobile:** in Capacitor it's better to store the session with `@capacitor/preferences`
> instead of `localStorage`, passing a custom `storage` to `createClient`. That's a detail of
> docs [05](05-google-play.md)/[06](06-app-store-ios.md); on web it works with the default.

---

## Step 4 — The adapter (`repo.ts`): AppState ⇄ tables 🤖

This is the heart of the PR. The idea is to **not rewrite the store**: keep the shape of
`AppState` and the actions, and slot in a layer that:

- **On load**, builds the `AppState` from the tables (a `loadRemote()` function that queries
  members, orgs, events, legs, join_requests, etc. within the user's scope and assembles them).
- **On mutation**, writes the matching table (upserts/inserts) instead of only saving the
  local blob.

Skeleton:

```ts
import { supabase } from "./supabaseClient";
import type { AppState } from "../state/model";

/** Pulls everything visible to the logged-in user and builds the AppState. */
export async function loadRemote(meId: string): Promise<Partial<AppState>> {
  const [members, orgs, events, legs, joinRequests, reviews, tripHistory, messages, notifications] =
    await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("orgs").select("*, org_members(*)"),
      supabase.from("events").select("*"),
      supabase.from("legs").select("*"),
      supabase.from("join_requests").select("*"),
      supabase.from("reviews").select("*"),
      supabase.from("trip_history").select("*"),
      supabase.from("messages").select("*"),
      supabase.from("notifications").select("*").eq("member_id", meId),
    ]);
  // ⇩ map snake_case (DB) → camelCase (model). E.g.: window_start/window_end → window:{start,end}
  return mapRowsToAppState({ members, orgs, events, legs, joinRequests, reviews, tripHistory, messages, notifications });
}

/** Targeted writes that replace the global saveState. */
export const repo = {
  upsertLeg: (leg) => supabase.from("legs").upsert(toLegRow(leg)),
  insertJoinRequest: (r) => supabase.from("join_requests").insert(toJrRow(r)),
  decideRequest: (id, status) =>
    supabase.from("join_requests").update({ status, decided_at: new Date().toISOString() }).eq("id", id),
  saveAssignment: (eventId, a) => supabase.from("assignments").upsert(toAsgRow(eventId, a)),
  sendMessage: (m) => supabase.from("messages").insert(toMsgRow(m)),
  // ...one per action that mutates AppState today
};
```

> 💡 **RPC for sensitive actions.** "Join an org by `joinCode`" and "decide a request" are
> better done with **`security definer` RPC functions** in Supabase (they validate on the
> server side) instead of a direct update from the client. [Doc 01](01-supabase-database.md)
> notes this. It's optional to start within your trusted group, recommended before opening
> up public mode. (Both `join_org_by_code` and moderation actions already ship as server-side RPCs.)

In `store.tsx` (today ~line 276 uses `loadState`, ~line 286 does `saveState` with debounce):
the initial load becomes `loadRemote(meId)` with a fallback to `loadState()` (cache) if there's
no network; and each store action, besides dispatching, calls the matching `repo.*`. The local
`saveState(state)` is kept as a **cache** (for offline), not as the truth.

---

## Step 5 — Realtime: goodbye to the simulation (with a backend) 🤖

With Supabase Realtime, the "other human" is real. The simulation **wasn't deleted**: it's **gated**
with `if (hasSupabase) return`, so it stays alive for local demo mode (tests, `build:single`) and
turns itself off with a backend. The three gated pieces in `store.tsx`:

- `scheduleSimulatedReply` (the automatic reply from the other person's organizer).
- The **on-mount sweep** that resolved old requests.
- The simulated **chat auto-reply**.

With a backend, the real subscription lives in `services/repo.ts` (`subscribeRealtime`), which the
store uses to reload state on changes. The idea (reference):

```ts
useEffect(() => {
  if (!hasSupabase || !meId) return;
  const ch = supabase
    .channel("convoyar")
    .on("postgres_changes", { event: "*", schema: "public", table: "join_requests" },
        () => refetch("joinRequests"))
    .on("postgres_changes", { event: "*", schema: "public", table: "assignments" },
        () => refetch("assignments"))
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" },
        () => refetch("messages"))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `member_id=eq.${meId}` },
        (p) => pushNotification(p.new))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [meId]);
```

✅ **Realtime is enabled**: the `migrate-v3-to-v4.sql` migration adds the shared tables
to the `supabase_realtime` publication. (If you add a new table you want to listen to, add it
to that publication.) Note: cross-device in-app notifications are still a known gap — the
`notifications` table isn't wired into `subscribeRealtime` yet (see the [ROADMAP](../ROADMAP.md)),
so the `notifications` branch above is a reference for how it'll look, not shipped behavior.

When the real organizer (another person) accepts your request, Realtime fires the event →
your app refetches → you see "you're in!" without reloading. **Identical to the demo's UX, but for real.**

---

## Step 6 — Matching and home-address privacy 🧠 ⚠️

Remember from [doc 01](01-supabase-database.md): the engine needs origins, but home addresses
can't leak to other clients.

- **Trusted org:** running matching on the client is acceptable to start.
- **Public mode (strangers):** move `solveMatching` into a Supabase **Edge Function**
  (the engine is pure TS → it runs as-is with `service_role`) and return only meeting points
  + ETAs. It's phase 2.5 of the [ROADMAP](../ROADMAP.md). It doesn't block Phase 1.

---

## Step 7 — Test it for real 🧑 ⏱️ 10 min

1. `npm run dev` with `.env.local` loaded.
2. Sign up with name + email + password → (if "Confirm email" is ON) confirm by email → you're in ([doc 02](02-auth.md)).
3. Open the app on **another device/browser** (or incognito), sign up with **another** email.
4. From one, request a seat on a public trip; from the other (the organizer), accept it.
5. ✅ The first one gets the approval **without reloading**. If that happens, the simulation is dead and the
   backend is alive.

---

## ✅ This doc's checklist

- [x] `@supabase/supabase-js` installed
- [x] Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env`; `.env*` in `.gitignore`
- [x] `supabaseClient.ts` with `hasSupabase`
- [x] `auth.ts` (email + password) + `screens/Auth.tsx` (doc 02)
- [x] `repo.ts` maps AppState ⇄ tables; store loads with `loadRemote` (fallback to cache)
- [x] The 3 simulation pieces in `store.tsx` **gated** with `if (hasSupabase) return` (not deleted)
- [x] Realtime enabled (`supabase_realtime` publication, v4 migration) + subscription in the store
- [x] `npm test` (129 unit) + `npm run typecheck` + `npm run test:e2e` (31 Playwright) green
- [x] **Tested with two real users on two devices** (live in production at convoyar.com)

---

## 🆘 Common problems

- **Changes don't show up on the other device** → Realtime isn't enabled on that table
  (Step 5), or the RLS policy won't let you see that row (correct that it filters it out; check the scope).
- **`permission denied` / `row-level security`** → the user has no linked member
  (`ensureMemberRow` from doc 02) or you're writing something that isn't yours. It's RLS doing its job.
- **Everything works in dev but not in production** → you didn't load the env vars in the hosting
  ([doc 04](04-deploy-web-pwa.md)); the build came out without `VITE_SUPABASE_URL` → `hasSupabase=false`
  → it fell back to demo mode.
- **The tests break** → tests run without env → `hasSupabase=false` → they use the local mock.
  Good. Don't add `supabase` calls without checking `hasSupabase` on paths you test.

---

**Next:** [04 · Web deploy / PWA](04-deploy-web-pwa.md) → put the app out on the internet.
