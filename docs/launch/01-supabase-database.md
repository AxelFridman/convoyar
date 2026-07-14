# 01 · Supabase — the real database

> **What you'll achieve:** a Postgres database in the cloud, free, where the state that
> today lives in `localStorage` will live. It's the foundation for everything else: without
> it there's no multi-device, no real auth, no sync. By the end of this doc you'll have the
> DB created, the schema loaded and security (RLS) turned on. You won't connect it to the app
> yet — that's **[doc 03](03-connect-app.md)**.

**Before you start read:** [the folder README](README.md) · the current data model in
[`src/state/model.ts`](../../src/state/model.ts) (that's where the schema below comes from).

|             |                                                                                 |
| ----------- | ------------------------------------------------------------------------------- |
| ⏱️ Time   | ~45 min                                                                         |
| 💰 Cost     | USD 0 (Free tier)                                                               |
| 🧑 / 🤖     | Mostly **YOU** (dashboard + SQL). The connection code is doc 03. |

> ### 📍 Status (2026-07-14): ✅ done
> - ✅ Projects **`convoyar-prod`** (`qlcwluvhrbkwjkjigsog`) and **`convoyar-dev`** created.
> - ✅ **Schema + migrations applied in prod AND dev**: `schema.sql` + `migrate-v3-to-v4`
>   (garage v4 + realtime), `migrate-personal-org`, `migrate-orgs`, `migrate-moderation`,
>   `migrate-account-deletion` (RPC `delete_my_account()` for account deletion — required by
>   Privacy Policy §11 and by Google Play / App Store), `migrate-review-gate` (reviews only
>   between co-travelers) and `migrate-trip-history` (materialized real trip history).
> - ✅ **RLS active** on every table and **Realtime enabled** (`supabase_realtime` publication).
> - ✅ Keys saved in `.env` (**new** Supabase format — see Step 2).
>
> The canonical schema and the migrations live in [`server/`](../../server/) (`schema.sql`,
> `rls.sql`, `migrate-*.sql`) as executable, idempotent files. **The schema block below is the
> v3 base**; the migrations run on top of it (v4 with garage + realtime, personal org,
> orgs/invitations, moderation, account deletion, review gate, trip history). If you ever need
> to re-run something, use **those files** so you don't keep two copies that drift apart.

---

## Why Supabase and not your own server?

The repo originally planned its own server (PR7 `feat/server-skeleton`: Fastify + Postgres).
To **launch**, Supabase gives you the same thing without administering anything:

- Real **Postgres** (not a toy) → if tomorrow you want to migrate to your own Postgres,
  it's a `pg_dump` and you're done. No lock-in on the database.
- **Auth** included (doc 02), **Realtime** included (doc 03), **Storage** in case you upload photos.
- A **Free tier** that holds up for launch, and **Pro USD 25/mo** when you grow — same
  service, no migration.

The Fastify server stays as **plan B** for when you need heavy backend logic (for example
running matching for gigantic events in a cron). You don't need it to get started.

---

## Step 1 — Create the project 🧑 ⏱️ 5 min

1. Go to **[supabase.com](https://supabase.com)** → **Start your project** → log in with GitHub.
2. **New project**. Fill in:
   - **Name:** `convoyar-prod` (later you'll also want `convoyar-dev` to test without breaking production — see the note below).
   - **Database Password:** generate a strong one and **save it in your password manager**. ⚠️ You'll need it for direct connections and it can't be viewed again (it can be reset).
   - **Region:** the closest to your users. For Argentina, **South America (São Paulo)** `sa-east-1` has the lowest latency.
   - **Plan:** Free.
3. Wait ~2 minutes for it to provision.

> 💡 **Two projects, not one.** Ideally you have `convoyar-dev` (to test migrations and break
> things) and `convoyar-prod` (real, don't touch it by hand). The free tier allows 2 active
> projects. If you want to start simple, do just `prod` and be careful.

---

## Step 2 — Understand your 3 keys 🧑 ⏱️ 5 min

In the dashboard: **Project Settings → API**. You'll see:

| Key                         | What it is                                 | Where it goes                                   | ⚠️                                                                                                        |
| --------------------------- | ------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Project URL**       | `https://xxxx.supabase.co`               | In the front end (`.env`) and in hosting          | Public, no problem                                                                                      |
| **anon / public key** | Key for the client (browser/app)      | In the front end (`.env`) and in hosting          | Public **on purpose**; security comes from RLS (Step 4), not from hiding this key                     |
| **service_role key**  | Superuser key, **bypasses RLS** | ONLY in a server/Edge Function or your own scripts | ⚠️ **NEVER** in the front end, in git, or in the compiled app. If it leaks, anyone can read/delete everything |

**Copy `Project URL` and `anon key`**; you use them in doc 03. Store the `service_role`
separately and don't touch it yet.

> ⚠️ **NEW key format (what you have in your `.env`).** Supabase renamed the keys.
> The mapping is direct — it's the same thing under a different name:
>
> | Old name (in these docs) | New name (in your `.env`) | Where it goes |
> |---|---|---|
> | Project URL | `SUPABASE_LINK_PROD` | front + hosting (public) |
> | **anon key** | **`sb_publishable_...`** (`SUPABASE_PUBLISHABLE_KEY_PROD`) | front + hosting (public) |
> | **service_role key** | **`sb_secret_...`** (`SUPABASE_SECRET_KEY_PROD`) | ⚠️ ONLY server/Edge Function, NEVER in the front end |
>
> Whenever you read "anon key" in any doc, use your **`sb_publishable_...`**. When you read
> "service_role", it's your **`sb_secret_...`**. In [`.env`](../../.env) I also left the
> aliases `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (= publishable), which is what the
> front end reads — see [doc 03](03-connect-app.md) and [doc 04](04-deploy-web-pwa.md).

---

## Step 3 — Load the schema 🧑 ⏱️ 10 min

In the dashboard: **SQL Editor → New query**. Paste the **whole** block below and hit **Run**.
It's derived from [`src/state/model.ts`](../../src/state/model.ts): this block is the **v3** base;
the current model is **v4** and `server/migrate-v3-to-v4.sql` (already run) updates it (garage + realtime).

> **Schema design decisions:**
>
> - The `id`s are `text` (not uuid) so they match the ids the app already uses (`m0`, etc.)
>   and to avoid rewriting the model. In production you generate them with `crypto.randomUUID()` on the client side.
> - The nested *value objects* (`vehicle`, `needs`, `soft`, `meetingPoints`, the `MatchResult`)
>   go as `jsonb`: that way the adapter in doc 03 serializes/deserializes without friction.
> - **The home address (`home`) lives in its own table `member_home` with self-only RLS.** It's the
>   sensitive piece (privacy invariant #6: the exact home is not shown to others). See the
>   privacy note at the end.
> - `org_members` replaces the `Org.memberIds` array → so RLS can ask "are you a member of this org?".

```sql
-- ============================================================
-- Convoyar — schema v3  (derived from src/state/model.ts)
-- Paste the whole thing into the Supabase SQL Editor and Run.
-- ============================================================

-- People
create table public.members (
  id             text primary key,
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  name           text not null,
  subgroup       text,
  vehicle        jsonb,                 -- {capacity,features[],smokeFree,plate} | null
  joined_at      timestamptz not null default now(),
  bio            text,
  email          text,
  email_verified boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Home address: separate table, only its owner can see it (privacy)
create table public.member_home (
  member_id text primary key references public.members(id) on delete cascade,
  lat       double precision not null,
  lng       double precision not null
);

-- Preferences / settings per person (was Settings per device)
create table public.member_settings (
  member_id        text primary key references public.members(id) on delete cascade,
  lang             text    not null default 'es',
  theme            text    not null default 'system',
  plan             text    not null default 'free',
  onboarded        boolean not null default false,
  notif_permission boolean not null default false,
  notif_prefs      jsonb   not null default '{"assignments":true,"requests":true,"chat":true,"email":false}'
);

-- Organizations
create table public.orgs (
  id             text primary key,
  name           text not null,
  join_code      text not null unique,
  meeting_points jsonb not null default '[]',   -- [{id,name,lat,lng}]
  created_at     timestamptz not null default now()
);

-- Members of each org (replaces Org.memberIds) + who is admin
create table public.org_members (
  org_id    text not null references public.orgs(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  is_admin  boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (org_id, member_id)
);

-- Trips / events
create table public.events (
  id               text primary key,
  org_id           text not null references public.orgs(id) on delete cascade,
  title            text not null,
  date             timestamptz not null,
  destination_lat  double precision not null,
  destination_lng  double precision not null,
  destination_name text,
  visibility       text not null default 'private' check (visibility in ('private','public')),
  created_by       text references public.members(id) on delete set null,
  origin_name      text,
  created_at       timestamptz not null default now()
);
create index on public.events (visibility) where visibility = 'public';

-- A member's response to a trip (driver/passenger/skip)
create table public.legs (
  id            text primary key,
  event_id      text not null references public.events(id) on delete cascade,
  member_id     text not null references public.members(id) on delete cascade,
  role          text not null check (role in ('driver','passenger','skip')),
  window_start  int  not null,          -- minutes since 00:00 on the event day
  window_end    int  not null,
  origin_lat    double precision,       -- if missing, the home is used
  origin_lng    double precision,
  max_detour_min int,                   -- driver
  max_walk_min   int,                   -- passenger
  needs         jsonb,                  -- Feature[]
  soft          jsonb,                  -- {smokeFree?, subgroup?}
  created_at    timestamptz not null default now(),
  unique (event_id, member_id)
);

-- Seat requests (public BlaBlaCar-style mode)
create table public.join_requests (
  id         text primary key,
  event_id   text not null references public.events(id) on delete cascade,
  member_id  text not null references public.members(id) on delete cascade,
  role       text not null check (role in ('driver','passenger','skip')),
  message    text,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- Reviews 1–5★
create table public.reviews (
  id             text primary key,
  from_member_id text not null references public.members(id) on delete cascade,
  to_member_id   text not null references public.members(id) on delete cascade,
  stars          int  not null check (stars between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);

-- Trip history (public profile)
create table public.trip_history (
  id             text primary key,
  member_id      text not null references public.members(id) on delete cascade,
  title          text not null,
  date           timestamptz not null,
  role           text not null check (role in ('driver','passenger')),
  with_member_id text references public.members(id) on delete set null,
  with_name      text,
  created_at     timestamptz not null default now()
);

-- Per-trip chat
create table public.messages (
  id             text primary key,
  event_id       text not null references public.events(id) on delete cascade,
  from_member_id text not null references public.members(id) on delete cascade,
  body           text not null,
  created_at     timestamptz not null default now()
);

-- In-app notifications
create table public.notifications (
  id         text primary key,
  member_id  text not null references public.members(id) on delete cascade,
  title      text not null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Engine result per event (serialized MatchResult)
create table public.assignments (
  event_id    text primary key references public.events(id) on delete cascade,
  result      jsonb not null,
  violations  jsonb not null default '[]',
  computed_at timestamptz not null default now()
);

-- Push tokens per device (used by doc 07)
create table public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  member_id  text not null references public.members(id) on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('android','ios','web')),
  created_at timestamptz not null default now()
);
```

If it says **Success. No rows returned**, it worked. Go to **Table Editor** and you'll see the tables.

---

## Step 4 — Turn on security (RLS) 🧑 ⏱️ 15 min ⚠️ DON'T SKIP THIS

Without **Row Level Security**, the `anon key` (which ships in the browser) can read and delete
**the whole** database. RLS is the set of rules that say "you only see/touch your own stuff". Paste this
second block and **Run**:

```sql
-- ============================================================
-- Convoyar — Row Level Security (RLS)
-- ============================================================

-- Helper: which member_id corresponds to the logged-in user
create or replace function public.current_member_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.members where auth_user_id = auth.uid()
$$;

-- Helper: is the user a member of this org?
create or replace function public.is_org_member(p_org text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and member_id = public.current_member_id()
  )
$$;

-- Helper: can they administer this event? (creator ∨ org admin)
create or replace function public.can_admin_event(p_event text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
    left join public.org_members om
      on om.org_id = e.org_id and om.member_id = public.current_member_id()
    where e.id = p_event
      and (e.created_by = public.current_member_id() or om.is_admin = true)
  )
$$;

-- Turn on RLS on ALL tables (default: nobody sees anything until a policy allows it)
alter table public.members        enable row level security;
alter table public.member_home    enable row level security;
alter table public.member_settings enable row level security;
alter table public.orgs           enable row level security;
alter table public.org_members    enable row level security;
alter table public.events         enable row level security;
alter table public.legs           enable row level security;
alter table public.join_requests  enable row level security;
alter table public.reviews        enable row level security;
alter table public.trip_history   enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;
alter table public.assignments    enable row level security;
alter table public.device_tokens  enable row level security;

-- ---------- members: public profile readable, edit only your own ----------
-- Public mode needs to see anyone's name/bio/seniority/★.
-- (The home address is NOT here: it lives in member_home.)
create policy members_read_all on public.members
  for select to authenticated using (true);
create policy members_update_self on public.members
  for update to authenticated using (auth_user_id = auth.uid());
create policy members_insert_self on public.members
  for insert to authenticated with check (auth_user_id = auth.uid());

-- ---------- member_home: ONLY its owner ----------
create policy home_all_self on public.member_home
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- member_settings: only your own ----------
create policy settings_all_self on public.member_settings
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- orgs: visible to members ----------
create policy orgs_read_member on public.orgs
  for select to authenticated using (public.is_org_member(id));
-- create org: anyone logged in (later added as member/admin)
create policy orgs_insert on public.orgs
  for insert to authenticated with check (true);

-- ---------- org_members: you see the memberships of your orgs ----------
create policy orgmembers_read on public.org_members
  for select to authenticated using (public.is_org_member(org_id));
-- joining by joinCode is better handled with an RPC function (see note below)

-- ---------- events: private = org only; public = everyone ----------
create policy events_read on public.events
  for select to authenticated
  using (visibility = 'public' or public.is_org_member(org_id));
create policy events_write_admin on public.events
  for all to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- ---------- legs: the owner edits theirs; the event admin sees all ----------
create policy legs_read on public.legs
  for select to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id));
create policy legs_write_self on public.legs
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- join_requests: seen by the requester and the event admin ----------
create policy jr_read on public.join_requests
  for select to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id));
create policy jr_insert_self on public.join_requests
  for insert to authenticated with check (member_id = public.current_member_id());
create policy jr_update_admin on public.join_requests
  for update to authenticated using (public.can_admin_event(event_id));

-- ---------- reviews: public read, you write as yourself ----------
create policy reviews_read on public.reviews
  for select to authenticated using (true);
create policy reviews_insert_self on public.reviews
  for insert to authenticated with check (from_member_id = public.current_member_id());

-- ---------- trip_history: public read (profile) ----------
create policy trips_read on public.trip_history
  for select to authenticated using (true);

-- ---------- messages: only event participants ----------
create policy msg_read on public.messages
  for select to authenticated
  using (public.is_org_member((select org_id from public.events where id = event_id))
         or public.can_admin_event(event_id)
         or exists (select 1 from public.legs l where l.event_id = messages.event_id and l.member_id = public.current_member_id()));
create policy msg_insert_self on public.messages
  for insert to authenticated with check (from_member_id = public.current_member_id());

-- ---------- notifications: only yours ----------
create policy notif_all_self on public.notifications
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- assignments: whoever can see the event ----------
create policy asg_read on public.assignments
  for select to authenticated
  using (public.can_admin_event(event_id)
         or exists (select 1 from public.legs l where l.event_id = assignments.event_id and l.member_id = public.current_member_id()));
create policy asg_write_admin on public.assignments
  for all to authenticated
  using (public.can_admin_event(event_id))
  with check (public.can_admin_event(event_id));

-- ---------- device_tokens: only yours ----------
create policy tokens_all_self on public.device_tokens
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());
```

> ⚠️ **This is a solid baseline, not an audit.** It covers the main cases and respects the
> project's privacy invariants. Before you have sensitive data from thousands of users, run a
> dedicated security review (the project already has the `/security-review` command, and
> doc [10](10-analytics-monitoring.md) talks about this).

### ✅ Verify RLS is turned on 🧑 ⏱️ 2 min

It's already **active** (left by `rls.sql` + the migrations). If you want to re-check it, two ways:

- **In the dashboard (quick):** Table Editor → open any table (e.g. `members`) → top right
  it should say **"RLS enabled"** with the green lock. If any says
  "RLS disabled" / red lock, that table is **open to anyone** → re-run
  [`server/rls.sql`](../../server/rls.sql).
- **With SQL (definitive):** SQL Editor → Run:
  ```sql
  select tablename, rowsecurity
  from pg_tables where schemaname = 'public'
  order by rowsecurity, tablename;
  ```
  **All** of them must have `rowsecurity = true`. Any at `false` is a hole.

> 💡 I verified from the outside (without logging in) that `GET /rest/v1/members` and `/orgs` return `[]`
> with the public key, which is consistent with "RLS on". But the check above is the one that
> gives you certainty table by table.

> 💡 **Joining an org by `joinCode`** is better done with an **RPC function**
> (`security definer`) that validates the code and inserts into `org_members`, instead of a
> direct insert policy (so nobody can add themselves to any org). It's a detail from
> doc 03; I note it here because it's part of the security model.

---

## Step 5 — Privacy note: home addresses and the engine 🧠

The matching engine needs the **origin** (≈ the home address) of each person to compute
meeting points and detours. But invariant #6 says: **someone's exact home is not shown to the
others**. That's why `member_home` is self-only.

- **Within your circle of trust** (a private org, your friends from the asado): you can run
  matching on the client if you share origins within the org. Acceptable to start.
- **In public mode** (people who don't know each other): home addresses **cannot** travel to
  someone else's browser. The correct solution is to run the engine in a Supabase **Edge
  Function** (the engine is pure TS → it runs as-is with `service_role`) and return to the
  client only meeting points + ETAs, never the homes. This is in doc [03](03-connect-app.md)
  and in the [ROADMAP phase 2.5](../ROADMAP.md).

It's not a blocker for Phase 1, but keep it on the radar before opening public mode to strangers.

---

## Step 6 — Backups and free tier limits 🧑 ⏱️ 2 min

- **Backups:** on Free, Supabase does daily backups with **7 days** of retention
  (Project Settings → Database → Backups). For real production, Pro moves up to point-in-time
  backups. To get started, confirm you see the daily backup and you're set.
- **Relevant Free limits:** 500 MB of database, 1 GB of storage, 2 GB of egress/month,
  50,000 monthly active Auth users, **pause after 7 days without activity**.
- **Manual safety export:** every now and then, Database → `pg_dump` (or the export button).
  Keeping your own dump never hurts.

---

## Scaling as you grow 💰

| Situation                                             | What to do                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| You approach 500 MB / 50k MAU / the project pauses | **Supabase Pro, USD 25/mo** (same project, no migration)                                    |
| You need to run matching for gigantic events often | Edge Function + possibly your own server (PR7's plan B)                                           |
| You want to leave Supabase                              | `pg_dump` → your own Postgres (Neon, RDS, Fly). It's standard Postgres, no data lock-in |

---

## ✅ Checklist for this doc

- [ ] `convoyar-prod` project created in the São Paulo region
- [ ] Database Password saved in the password manager
- [ ] `Project URL` and `anon key` copied (you use them in doc 03)
- [ ] `service_role key` stored separately and **outside** the code
- [ ] Schema block run → tables visible in Table Editor
- [ ] RLS block run → RLS active on all tables
- [ ] You understand why `member_home` is separate
- [ ] Daily backups visible

---

## 🆘 Common problems

- **"permission denied for table X" when testing from the app** → you're missing a policy, or the
  user has no linked member (`current_member_id()` returns null). Check that on signup you
  insert the row into `members` with `auth_user_id = auth.uid()` (doc 02).
- **"new row violates row-level security policy"** → you're inserting something whose `with check`
  isn't satisfied (e.g. a `member_id` different from yours). It's correct that it fails: that's how RLS works.
- **The project shows as paused** → free tier after 7 days idle; open the dashboard and
  reactivate it, or move to Pro.

---

**Next:** [02 · Real auth](02-auth.md) → make login send a real email.
