# `server/` — Convoyar's database and backend

> **This is live in production.** Convoyar runs at convoyar.com (installable PWA) on a
> real multi-user Supabase backend: email+password auth, RLS, and realtime sync — two
> people on two phones see the same trip. It's gated by `hasSupabase`: locally (and in
> test/e2e) the app still runs 100 % in the browser, on a single device, with state in
> `localStorage` (the deterministic demo, untouched). This directory is the database and
> backend that power the connected mode. The step-by-step guide (with mental screenshots
> of every dashboard) is in **[`../docs/launch/`](../docs/launch/)** — start with its README.

## What's in here

| File | What it is |
|---|---|
| `schema.sql` | The full Postgres schema, derived 1:1 from [`src/state/model.ts`](../src/state/model.ts) (AppState v3). |
| `rls.sql` | Row Level Security: the "everyone sees/touches only their own" rules. **Not optional in production.** |
| `seed.sql` | Minimal smoke seed to test the connection in dev (NOT for production). |
| `edge-functions/match/` | Example Edge Function that runs the matching engine server-side (public-mode privacy). Documented skeleton. |
| `docker-compose.yml` | A local Postgres to develop without touching the cloud. |

## Recommended path: Supabase (managed, free tier)

No need to run a server yourself. Supabase gives you Postgres + Auth + Realtime:

1. Create the project and load the schema → **[docs/launch/01](../docs/launch/01-supabase-database.md)**
   (you can paste `schema.sql` and `rls.sql` into the SQL Editor, or use the CLI: `supabase db push`).
2. Email + password auth → **[docs/launch/02](../docs/launch/02-auth.md)**.
3. Connect the app (replace `services/storage.ts` with a remote repo, without touching the engine)
   → **[docs/launch/03](../docs/launch/03-connect-app.md)**.

The contract a backend must honor is the engine's:
`buildMatchInput(state, eventId) → MatchInput` and back `MatchResult`
(see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)).

## Alternative path: your own Postgres

`schema.sql` and `rls.sql` are standard Postgres — there's no Supabase lock-in on the data:

```bash
# bring up a local Postgres
docker compose -f server/docker-compose.yml up -d

# load schema + rls + seed
psql "postgres://convoyar:convoyar@localhost:5432/convoyar" -f server/schema.sql
psql "postgres://convoyar:convoyar@localhost:5432/convoyar" -f server/rls.sql
psql "postgres://convoyar:convoyar@localhost:5432/convoyar" -f server/seed.sql
```

> Note: `rls.sql` references `auth.users` and `auth.uid()` (Supabase namespace). Against a
> bare Postgres, either create a minimal `auth` schema or adapt the policies to your auth
> layer. For local development without auth you can load just `schema.sql` + `seed.sql`.

## Secrets — golden rule

**Never** commit real keys. The `.gitignore` already ignores `.env` and `server/.env`.
The Supabase `service_role` (and any DB password) go ONLY in server environment variables /
function secrets, never in the front end or the bundle. See the keys table in
[docs/launch/01 (Step 2)](../docs/launch/01-supabase-database.md).
