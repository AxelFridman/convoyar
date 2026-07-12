-- ============================================================
-- Convoyar — schema v3  (derivado 1:1 de src/state/model.ts, AppState v3)
-- Uso:
--   • Supabase: pegar en SQL Editor y Run (guía: docs/lanzamiento/01-supabase-base-de-datos.md)
--   • Postgres propio:  psql "$DATABASE_URL" -f server/schema.sql
-- Después correr server/rls.sql (seguridad) — NO te lo saltees en producción.
-- ============================================================

-- Personas
create table if not exists public.members (
  id             text primary key,
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  name           text not null,
  subgroup       text,
  vehicles       jsonb not null default '[]', -- Vehicle[]: [{id,alias?,capacity,features[],smokeFree,plate?}]
  joined_at      timestamptz not null default now(),
  bio            text,
  email          text,
  email_verified boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Domicilio: tabla aparte, solo la ve su dueño (invariante de privacidad #6)
create table if not exists public.member_home (
  member_id text primary key references public.members(id) on delete cascade,
  lat       double precision not null,
  lng       double precision not null
);

-- Preferencias / settings por persona
create table if not exists public.member_settings (
  member_id        text primary key references public.members(id) on delete cascade,
  lang             text    not null default 'es',
  theme            text    not null default 'system',
  plan             text    not null default 'free',
  onboarded        boolean not null default false,
  notif_permission boolean not null default false,
  notif_prefs      jsonb   not null default '{"assignments":true,"requests":true,"chat":true,"email":false}'
);

-- Organizaciones
create table if not exists public.orgs (
  id             text primary key,
  name           text not null,
  join_code      text not null unique,
  meeting_points jsonb not null default '[]',   -- [{id,name,lat,lng}]
  created_at     timestamptz not null default now()
);

-- Miembros de cada org (reemplaza Org.memberIds) + quién es admin
create table if not exists public.org_members (
  org_id    text not null references public.orgs(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  is_admin  boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (org_id, member_id)
);

-- Salidas / eventos
create table if not exists public.events (
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
create index if not exists events_public_idx on public.events (visibility) where visibility = 'public';

-- Respuesta de un miembro a una salida (conductor/pasajero/no voy)
create table if not exists public.legs (
  id             text primary key,
  event_id       text not null references public.events(id) on delete cascade,
  member_id      text not null references public.members(id) on delete cascade,
  role           text not null check (role in ('driver','passenger','skip')),
  window_start   int  not null,          -- minutos desde 00:00 del día del evento
  window_end     int  not null,
  origin_lat     double precision,       -- si falta, se usa el home
  origin_lng     double precision,
  vehicle_id     text,                   -- conductor: qué vehículo del garage usa (id dentro de members.vehicles)
  max_detour_min int,                    -- conductor
  max_walk_min   int,                    -- pasajero
  needs          jsonb,                  -- Feature[]
  soft           jsonb,                  -- {smokeFree?, subgroup?}
  created_at     timestamptz not null default now(),
  unique (event_id, member_id)
);

-- Pedidos de lugar (modo público tipo BlaBlaCar)
create table if not exists public.join_requests (
  id         text primary key,
  event_id   text not null references public.events(id) on delete cascade,
  member_id  text not null references public.members(id) on delete cascade,
  role       text not null check (role in ('driver','passenger','skip')),
  message    text,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- Reseñas 1–5★
create table if not exists public.reviews (
  id             text primary key,
  from_member_id text not null references public.members(id) on delete cascade,
  to_member_id   text not null references public.members(id) on delete cascade,
  stars          int  not null check (stars between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now(),
  unique (from_member_id, to_member_id)      -- una reseña por par (coincide con el reducer addReview)
);

-- Historial de viajes (perfil público)
create table if not exists public.trip_history (
  id             text primary key,
  member_id      text not null references public.members(id) on delete cascade,
  title          text not null,
  date           timestamptz not null,
  role           text not null check (role in ('driver','passenger')),
  with_member_id text references public.members(id) on delete set null,
  with_name      text,
  created_at     timestamptz not null default now()
);

-- Chat por salida
create table if not exists public.messages (
  id             text primary key,
  event_id       text not null references public.events(id) on delete cascade,
  from_member_id text not null references public.members(id) on delete cascade,
  body           text not null,
  created_at     timestamptz not null default now()
);

-- Notificaciones in-app
create table if not exists public.notifications (
  id         text primary key,
  member_id  text not null references public.members(id) on delete cascade,
  title      text not null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Resultado del motor por evento (MatchResult serializado)
create table if not exists public.assignments (
  event_id    text primary key references public.events(id) on delete cascade,
  result      jsonb not null,
  violations  jsonb not null default '[]',
  computed_at timestamptz not null default now()
);

-- Tokens de push por dispositivo (lo usa docs/lanzamiento/07-push-notifications.md)
create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  member_id  text not null references public.members(id) on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('android','ios','web')),
  created_at timestamptz not null default now()
);
