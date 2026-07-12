# 01 · Supabase — base de datos real

> **Qué vas a lograr:** una base de datos Postgres en la nube, gratis, donde vive el
> estado que hoy está en `localStorage`. Es el cimiento de todo lo demás: sin esto no
> hay multi-dispositivo, ni auth real, ni sync. Al terminar este doc tenés la DB creada,
> el schema cargado y la seguridad (RLS) activada. Todavía no la conectás a la app — eso
> es el **[doc 03](03-conectar-la-app.md)**.

**Antes de empezar leé:** [README de la carpeta](README.md) · Modelo de datos actual en
[`src/state/model.ts`](../../src/state/model.ts) (de ahí sale el schema de abajo).

| | |
|---|---|
| ⏱️ Tiempo | ~45 min |
| 💰 Costo | USD 0 (Free tier) |
| 🧑 / 🤖 | Casi todo **VOS** (dashboard + SQL). El código de conexión es el doc 03. |

---

## ¿Por qué Supabase y no un servidor propio?

El repo tenía planeado un servidor propio (PR7 `feat/server-skeleton`: Fastify + Postgres).
Para **lanzar**, Supabase te da lo mismo sin administrar nada:

- **Postgres** de verdad (no un juguete) → si mañana querés migrar a tu propio Postgres,
  es un `pg_dump` y listo. No hay lock-in de la base.
- **Auth** incluido (doc 02), **Realtime** incluido (doc 03), **Storage** por si subís fotos.
- **Free tier** que aguanta el lanzamiento, y **Pro USD 25/mes** cuando crezcas — mismo
  servicio, sin migrar.

El servidor Fastify propio queda como **plan B** para cuando necesites lógica de backend
pesada (por ejemplo correr el matching de eventos gigantes en un cron). No lo necesitás
para arrancar.

---

## Paso 1 — Crear el proyecto 🧑 ⏱️ 5 min

1. Andá a **[supabase.com](https://supabase.com)** → **Start your project** → logueate con GitHub.
2. **New project**. Completá:
   - **Name:** `convoyar-prod` (después vas a querer también `convoyar-dev` para probar sin romper producción — ver nota abajo).
   - **Database Password:** generá una fuerte y **guardala en tu gestor de contraseñas**. ⚠️ La vas a necesitar para conexiones directas y no se puede ver de nuevo (sí resetear).
   - **Region:** la más cercana a tus usuarios. Para Argentina, **South America (São Paulo)** `sa-east-1` es la de menor latencia.
   - **Plan:** Free.
3. Esperá ~2 minutos a que se aprovisione.

> 💡 **Dos proyectos, no uno.** Lo ideal es tener `convoyar-dev` (para probar migraciones y
> romper cosas) y `convoyar-prod` (real, no lo tocás a mano). En el free tier entran 2
> proyectos activos. Si querés arrancar simple, hacé solo `prod` y sé cuidadoso.

---

## Paso 2 — Entender tus 3 claves 🧑 ⏱️ 5 min

En el dashboard: **Project Settings → API**. Vas a ver:

| Clave | Qué es | Dónde va | ⚠️ |
|---|---|---|---|
| **Project URL** | `https://xxxx.supabase.co` | En el front (`.env`) y en el hosting | Pública, no pasa nada |
| **anon / public key** | Clave para el cliente (navegador/app) | En el front (`.env`) y en el hosting | Pública **a propósito**; la seguridad la da RLS (Paso 4), no esconder esta clave |
| **service_role key** | Clave de superusuario, **saltea RLS** | SOLO en un server/Edge Function o scripts tuyos | ⚠️ **NUNCA** en el front, ni en git, ni en la app compilada. Si se filtra, cualquiera lee/borra todo |

**Copiá `Project URL` y `anon key`**; las usás en el doc 03. La `service_role` guardala
aparte y no la toques todavía.

---

## Paso 3 — Cargar el schema 🧑 ⏱️ 10 min

En el dashboard: **SQL Editor → New query**. Pegá **todo** el bloque de abajo y dale **Run**.
Está derivado 1:1 de [`src/state/model.ts`](../../src/state/model.ts) (`AppState` v3).

> **Decisiones de diseño del schema:**
> - Los `id` son `text` (no uuid) para que coincidan con los ids que ya usa la app (`m0`, etc.)
>   y para no reescribir el modelo. En producción los generás con `crypto.randomUUID()` del lado del cliente.
> - Los *value objects* anidados (`vehicle`, `needs`, `soft`, `meetingPoints`, el `MatchResult`)
>   van como `jsonb`: así el adaptador del doc 03 serializa/deserializa sin fricción.
> - **El domicilio (`home`) vive en su propia tabla `member_home` con RLS self-only.** Es la
>   pieza sensible (invariante de privacidad #6: la casa exacta no se muestra a otros). Ver la
>   nota de privacidad al final.
> - `org_members` reemplaza el array `Org.memberIds` → así RLS puede preguntar "¿sos miembro de esta org?".

```sql
-- ============================================================
-- Convoyar — schema v3  (derivado de src/state/model.ts)
-- Pegar entero en el SQL Editor de Supabase y Run.
-- ============================================================

-- Personas
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

-- Domicilio: tabla aparte, solo la ve su dueño (privacidad)
create table public.member_home (
  member_id text primary key references public.members(id) on delete cascade,
  lat       double precision not null,
  lng       double precision not null
);

-- Preferencias / settings por persona (antes era Settings por dispositivo)
create table public.member_settings (
  member_id        text primary key references public.members(id) on delete cascade,
  lang             text    not null default 'es',
  theme            text    not null default 'system',
  plan             text    not null default 'free',
  onboarded        boolean not null default false,
  notif_permission boolean not null default false,
  notif_prefs      jsonb   not null default '{"assignments":true,"requests":true,"chat":true,"email":false}'
);

-- Organizaciones
create table public.orgs (
  id             text primary key,
  name           text not null,
  join_code      text not null unique,
  meeting_points jsonb not null default '[]',   -- [{id,name,lat,lng}]
  created_at     timestamptz not null default now()
);

-- Miembros de cada org (reemplaza Org.memberIds) + quién es admin
create table public.org_members (
  org_id    text not null references public.orgs(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  is_admin  boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (org_id, member_id)
);

-- Salidas / eventos
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

-- Respuesta de un miembro a una salida (conductor/pasajero/no voy)
create table public.legs (
  id            text primary key,
  event_id      text not null references public.events(id) on delete cascade,
  member_id     text not null references public.members(id) on delete cascade,
  role          text not null check (role in ('driver','passenger','skip')),
  window_start  int  not null,          -- minutos desde 00:00 del día del evento
  window_end    int  not null,
  origin_lat    double precision,       -- si falta, se usa el home
  origin_lng    double precision,
  max_detour_min int,                   -- conductor
  max_walk_min   int,                   -- pasajero
  needs         jsonb,                  -- Feature[]
  soft          jsonb,                  -- {smokeFree?, subgroup?}
  created_at    timestamptz not null default now(),
  unique (event_id, member_id)
);

-- Pedidos de lugar (modo público tipo BlaBlaCar)
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

-- Reseñas 1–5★
create table public.reviews (
  id             text primary key,
  from_member_id text not null references public.members(id) on delete cascade,
  to_member_id   text not null references public.members(id) on delete cascade,
  stars          int  not null check (stars between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);

-- Historial de viajes (perfil público)
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

-- Chat por salida
create table public.messages (
  id             text primary key,
  event_id       text not null references public.events(id) on delete cascade,
  from_member_id text not null references public.members(id) on delete cascade,
  body           text not null,
  created_at     timestamptz not null default now()
);

-- Notificaciones in-app
create table public.notifications (
  id         text primary key,
  member_id  text not null references public.members(id) on delete cascade,
  title      text not null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Resultado del motor por evento (MatchResult serializado)
create table public.assignments (
  event_id    text primary key references public.events(id) on delete cascade,
  result      jsonb not null,
  violations  jsonb not null default '[]',
  computed_at timestamptz not null default now()
);

-- Tokens de push por dispositivo (lo usa el doc 07)
create table public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  member_id  text not null references public.members(id) on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('android','ios','web')),
  created_at timestamptz not null default now()
);
```

Si dice **Success. No rows returned**, quedó. Andá a **Table Editor** y vas a ver las tablas.

---

## Paso 4 — Activar la seguridad (RLS) 🧑 ⏱️ 15 min ⚠️ NO TE LO SALTEES

Sin **Row Level Security**, la `anon key` (que va en el navegador) puede leer y borrar
**toda** la base. RLS son las reglas que dicen "vos solo ves/tocás lo tuyo". Pegá este
segundo bloque y **Run**:

```sql
-- ============================================================
-- Convoyar — Row Level Security (RLS)
-- ============================================================

-- Helper: qué member_id corresponde al usuario logueado
create or replace function public.current_member_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.members where auth_user_id = auth.uid()
$$;

-- Helper: ¿el usuario es miembro de esta org?
create or replace function public.is_org_member(p_org text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and member_id = public.current_member_id()
  )
$$;

-- Helper: ¿puede administrar este evento? (creador ∨ admin de la org)
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

-- Prender RLS en TODAS las tablas (por defecto: nadie ve nada hasta que una policy lo permita)
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

-- ---------- members: perfil público legible, edición solo propia ----------
-- El modo público necesita ver nombre/bio/antigüedad/★ de cualquiera.
-- (El domicilio NO está acá: vive en member_home.)
create policy members_read_all on public.members
  for select to authenticated using (true);
create policy members_update_self on public.members
  for update to authenticated using (auth_user_id = auth.uid());
create policy members_insert_self on public.members
  for insert to authenticated with check (auth_user_id = auth.uid());

-- ---------- member_home: SOLO su dueño ----------
create policy home_all_self on public.member_home
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- member_settings: solo propias ----------
create policy settings_all_self on public.member_settings
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- orgs: las ve quien es miembro ----------
create policy orgs_read_member on public.orgs
  for select to authenticated using (public.is_org_member(id));
-- crear org: cualquiera logueado (después se agrega como miembro/admin)
create policy orgs_insert on public.orgs
  for insert to authenticated with check (true);

-- ---------- org_members: ves las membresías de tus orgs ----------
create policy orgmembers_read on public.org_members
  for select to authenticated using (public.is_org_member(org_id));
-- unirse por joinCode se maneja mejor con una función RPC (ver nota abajo)

-- ---------- events: privados = solo la org; públicos = todos ----------
create policy events_read on public.events
  for select to authenticated
  using (visibility = 'public' or public.is_org_member(org_id));
create policy events_write_admin on public.events
  for all to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- ---------- legs: el dueño edita el suyo; el admin del evento ve todos ----------
create policy legs_read on public.legs
  for select to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id));
create policy legs_write_self on public.legs
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- join_requests: las ve el solicitante y el admin del evento ----------
create policy jr_read on public.join_requests
  for select to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id));
create policy jr_insert_self on public.join_requests
  for insert to authenticated with check (member_id = public.current_member_id());
create policy jr_update_admin on public.join_requests
  for update to authenticated using (public.can_admin_event(event_id));

-- ---------- reviews: lectura pública, escribís como vos ----------
create policy reviews_read on public.reviews
  for select to authenticated using (true);
create policy reviews_insert_self on public.reviews
  for insert to authenticated with check (from_member_id = public.current_member_id());

-- ---------- trip_history: lectura pública (perfil) ----------
create policy trips_read on public.trip_history
  for select to authenticated using (true);

-- ---------- messages: solo participantes del evento ----------
create policy msg_read on public.messages
  for select to authenticated
  using (public.is_org_member((select org_id from public.events where id = event_id))
         or public.can_admin_event(event_id)
         or exists (select 1 from public.legs l where l.event_id = messages.event_id and l.member_id = public.current_member_id()));
create policy msg_insert_self on public.messages
  for insert to authenticated with check (from_member_id = public.current_member_id());

-- ---------- notifications: solo tuyas ----------
create policy notif_all_self on public.notifications
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- ---------- assignments: quien puede ver el evento ----------
create policy asg_read on public.assignments
  for select to authenticated
  using (public.can_admin_event(event_id)
         or exists (select 1 from public.legs l where l.event_id = assignments.event_id and l.member_id = public.current_member_id()));
create policy asg_write_admin on public.assignments
  for all to authenticated
  using (public.can_admin_event(event_id))
  with check (public.can_admin_event(event_id));

-- ---------- device_tokens: solo tuyos ----------
create policy tokens_all_self on public.device_tokens
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());
```

> ⚠️ **Esto es una base sólida, no una auditoría.** Cubre los casos principales y respeta
> los invariantes de privacidad del proyecto. Antes de tener datos sensibles de miles de
> usuarios, corré una revisión de seguridad dedicada (el proyecto ya tiene el comando
> `/security-review`, y el doc [10](10-analytics-y-monitoreo.md) habla de esto).

> 💡 **Unirse a una org por `joinCode`** conviene hacerlo con una **función RPC**
> (`security definer`) que valida el código e inserta en `org_members`, en vez de una
> policy de insert directa (así nadie se auto-agrega a cualquier org). Es un detalle del
> doc 03; lo dejo anotado acá porque es parte del modelo de seguridad.

---

## Paso 5 — Nota de privacidad: domicilios y el motor 🧠

El motor de matching necesita el **origen** (≈ el domicilio) de cada persona para calcular
puntos de encuentro y desvíos. Pero el invariante #6 dice: **la casa exacta de alguien no
se le muestra a los demás**. Por eso `member_home` es self-only.

- **Dentro de tu grupo de confianza** (una org privada, tus amigos del asado): podés correr
  el matching en el cliente si compartís los orígenes dentro de la org. Aceptable para arrancar.
- **En el modo público** (gente que no se conoce): los domicilios **no pueden** viajar al
  navegador de otro. La solución correcta es correr el motor en una **Edge Function** de
  Supabase (el motor es TS puro → corre tal cual con `service_role`) y devolver al cliente
  solo puntos de encuentro + ETAs, nunca las casas. Esto está en el doc [03](03-conectar-la-app.md)
  y en el [ROADMAP fase 2.5](../ROADMAP.md).

No es bloqueante para la Fase 1, pero tenelo en el radar antes de abrir el modo público a desconocidos.

---

## Paso 6 — Backups y límites del free tier 🧑 ⏱️ 2 min

- **Backups:** en Free, Supabase hace backups diarios con **7 días** de retención
  (Project Settings → Database → Backups). Para producción real, Pro sube a backups
  point-in-time. Para arrancar, confirmá que veas el backup diario y listo.
- **Límites Free relevantes:** 500 MB de base, 1 GB de storage, 2 GB de egress/mes,
  50.000 usuarios activos/mes de Auth, **pausa tras 7 días sin actividad**.
- **Export manual de seguridad:** cada tanto, Database → `pg_dump` (o el botón de export).
  Guardar un dump propio nunca está de más.

---

## Escalar cuando crezcas 💰

| Situación | Qué hacer |
|---|---|
| Se te acerca a 500 MB / 50k MAU / el proyecto se pausa | **Supabase Pro, USD 25/mes** (mismo proyecto, sin migrar) |
| Necesitás correr matching de eventos gigantes seguido | Edge Function + posible server propio (el plan B de PR7) |
| Querés salir de Supabase | `pg_dump` → tu propio Postgres (Neon, RDS, Fly). Es Postgres estándar, no hay lock-in de datos |

---

## ✅ Checklist de este doc

- [ ] Proyecto `convoyar-prod` creado en región São Paulo
- [ ] Database Password guardada en el gestor de contraseñas
- [ ] `Project URL` y `anon key` copiadas (las usás en el doc 03)
- [ ] `service_role key` guardada aparte y **fuera** del código
- [ ] Bloque de schema corrido → tablas visibles en Table Editor
- [ ] Bloque de RLS corrido → RLS activo en todas las tablas
- [ ] Entendés por qué `member_home` está separada
- [ ] Backups diarios visibles

---

## 🆘 Problemas comunes

- **"permission denied for table X" al probar desde la app** → te falta una policy, o el
  usuario no tiene member linkeado (`current_member_id()` devuelve null). Revisá que en el
  signup insertes la fila en `members` con `auth_user_id = auth.uid()` (doc 02).
- **"new row violates row-level security policy"** → estás insertando algo cuyo `with check`
  no se cumple (ej. `member_id` distinto al tuyo). Correcto que falle: así funciona RLS.
- **El proyecto aparece pausado** → free tier tras 7 días inactivo; entrá al dashboard y
  reactivalo, o pasá a Pro.

---

**Siguiente:** [02 · Auth real](02-auth-real.md) → que el login mande un email de verdad.
