-- ============================================================
-- Convoyar — Row Level Security (RLS)
-- Correr DESPUÉS de server/schema.sql.
-- Sin esto, la anon key (que va en el navegador) puede leer/borrar toda la base.
-- Guía comentada: docs/lanzamiento/01-supabase-base-de-datos.md (Paso 4).
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
alter table public.members         enable row level security;
alter table public.member_home     enable row level security;
alter table public.member_settings enable row level security;
alter table public.orgs            enable row level security;
alter table public.org_members     enable row level security;
alter table public.events          enable row level security;
alter table public.legs            enable row level security;
alter table public.join_requests   enable row level security;
alter table public.reviews         enable row level security;
alter table public.trip_history    enable row level security;
alter table public.messages        enable row level security;
alter table public.notifications   enable row level security;
alter table public.assignments     enable row level security;
alter table public.device_tokens   enable row level security;

-- members: perfil público legible (nombre/bio/★/antigüedad), edición solo propia.
-- El domicilio NO está acá: vive en member_home.
create policy members_read_all on public.members
  for select to authenticated using (true);
create policy members_update_self on public.members
  for update to authenticated using (auth_user_id = auth.uid());
create policy members_insert_self on public.members
  for insert to authenticated with check (auth_user_id = auth.uid());

-- member_home: SOLO su dueño
create policy home_all_self on public.member_home
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- member_settings: solo propias
create policy settings_all_self on public.member_settings
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- orgs: las ve quien es miembro; crear = cualquiera logueado
create policy orgs_read_member on public.orgs
  for select to authenticated using (public.is_org_member(id));
create policy orgs_insert on public.orgs
  for insert to authenticated with check (true);

-- org_members: ves las membresías de tus orgs
create policy orgmembers_read on public.org_members
  for select to authenticated using (public.is_org_member(org_id));
-- unirse por joinCode: usar una RPC security-definer (ver docs/lanzamiento/03), no insert directo.

-- events: privados = solo la org; públicos = todos
create policy events_read on public.events
  for select to authenticated
  using (visibility = 'public' or public.is_org_member(org_id));
create policy events_write_admin on public.events
  for all to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- legs: el dueño edita el suyo; el admin del evento los ve todos Y puede escribir/borrar
-- los de su evento (aprobar pedidos crea el leg del aceptado; cancelar conductor lo borra).
create policy legs_read on public.legs
  for select to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id));
create policy legs_write_self on public.legs
  for all to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id))
  with check (member_id = public.current_member_id() or public.can_admin_event(event_id));

-- join_requests: las ve el solicitante y el admin del evento
create policy jr_read on public.join_requests
  for select to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id));
create policy jr_insert_self on public.join_requests
  for insert to authenticated with check (member_id = public.current_member_id());
create policy jr_update_admin on public.join_requests
  for update to authenticated using (public.can_admin_event(event_id));

-- reviews: lectura pública, escribís como vos
create policy reviews_read on public.reviews
  for select to authenticated using (true);
create policy reviews_insert_self on public.reviews
  for insert to authenticated with check (from_member_id = public.current_member_id());
create policy reviews_update_self on public.reviews
  for update to authenticated using (from_member_id = public.current_member_id());

-- trip_history: lectura pública (perfil)
create policy trips_read on public.trip_history
  for select to authenticated using (true);

-- messages: solo participantes del evento
create policy msg_read on public.messages
  for select to authenticated
  using (public.is_org_member((select org_id from public.events where id = event_id))
         or public.can_admin_event(event_id)
         or exists (select 1 from public.legs l where l.event_id = messages.event_id and l.member_id = public.current_member_id()));
create policy msg_insert_self on public.messages
  for insert to authenticated with check (from_member_id = public.current_member_id());

-- notifications: solo tuyas
create policy notif_all_self on public.notifications
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

-- assignments: quien puede ver el evento
create policy asg_read on public.assignments
  for select to authenticated
  using (public.can_admin_event(event_id)
         or exists (select 1 from public.legs l where l.event_id = assignments.event_id and l.member_id = public.current_member_id()));
create policy asg_write_admin on public.assignments
  for all to authenticated
  using (public.can_admin_event(event_id))
  with check (public.can_admin_event(event_id));

-- device_tokens: solo tuyos
create policy tokens_all_self on public.device_tokens
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());
