-- ============================================================
-- Convoyar — Moderación: reportar y bloquear usuarios.
-- Correr en Supabase → SQL Editor, en PROD **y** en DEV. Idempotente.
-- Correr DESPUÉS de schema.sql + rls.sql + migrate-v3-to-v4.sql.
--
-- Decisiones del dueño:
--   • Bloquear = personal: el que bloquea deja de ver al bloqueado (no lo ve nadie más).
--   • Reportar = pone un flag y PAUSA al reportado (no puede operar) hasta que un humano
--     revise. Des-pausar es una acción humana (ver el final del archivo).
--   • (Verificación de identidad de conductores: NO por ahora; quizás más adelante.)
-- ⚠️ Nota: hoy un solo reporte pausa al reportado (como pediste). Es agresivo y
--    abusable; cuando haya volumen conviene requerir varios reportes o revisión previa.
-- ============================================================

-- Estado del miembro
alter table public.members add column if not exists status text not null default 'active'
  check (status in ('active', 'paused'));

-- Reportes (los revisa un humano)
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id text not null references public.members(id) on delete cascade,
  reported_id text not null references public.members(id) on delete cascade,
  reason      text,
  status      text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
  for insert to authenticated with check (reporter_id = public.current_member_id());
drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select to authenticated using (reporter_id = public.current_member_id());
-- La revisión la hace un humano (service_role / dashboard): no hay UPDATE para authenticated.

-- Bloqueos personales
create table if not exists public.member_blocks (
  blocker_id text not null references public.members(id) on delete cascade,
  blocked_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.member_blocks enable row level security;
drop policy if exists blocks_all_self on public.member_blocks;
create policy blocks_all_self on public.member_blocks
  for all to authenticated
  using (blocker_id = public.current_member_id())
  with check (blocker_id = public.current_member_id());

-- helper: ¿el usuario que actúa está activo (no pausado)?
create or replace function public.current_member_active()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'active' from public.members where id = public.current_member_id()), false)
$$;

-- Reportar: crea el reporte y PAUSA al reportado hasta revisión humana.
create or replace function public.report_member(p_reported text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare mid text;
begin
  mid := public.current_member_id();
  if mid is null then raise exception 'no auth'; end if;
  insert into public.reports(reporter_id, reported_id, reason) values (mid, p_reported, p_reason);
  update public.members set status = 'paused' where id = p_reported;
end $$;

-- Bloquear / desbloquear (personal).
create or replace function public.block_member(p_blocked text) returns void
language sql security definer set search_path = public as $$
  insert into public.member_blocks(blocker_id, blocked_id)
  values (public.current_member_id(), p_blocked) on conflict do nothing;
$$;
create or replace function public.unblock_member(p_blocked text) returns void
language sql security definer set search_path = public as $$
  delete from public.member_blocks where blocker_id = public.current_member_id() and blocked_id = p_blocked;
$$;

grant execute on function
  public.current_member_active(), public.report_member(text, text),
  public.block_member(text), public.unblock_member(text)
  to authenticated;

-- ── Gating: un miembro PAUSADO no puede operar (escribir). Re-creamos las policies clave. ──
drop policy if exists legs_write_self on public.legs;
create policy legs_write_self on public.legs for all to authenticated
  using (public.current_member_active() and (member_id = public.current_member_id() or public.can_admin_event(event_id)))
  with check (public.current_member_active() and (member_id = public.current_member_id() or public.can_admin_event(event_id)));

drop policy if exists jr_insert_self on public.join_requests;
create policy jr_insert_self on public.join_requests for insert to authenticated
  with check (public.current_member_active() and member_id = public.current_member_id());

drop policy if exists msg_insert_self on public.messages;
create policy msg_insert_self on public.messages for insert to authenticated
  with check (public.current_member_active() and from_member_id = public.current_member_id());

drop policy if exists reviews_insert_self on public.reviews;
create policy reviews_insert_self on public.reviews for insert to authenticated
  with check (public.current_member_active() and from_member_id = public.current_member_id());

drop policy if exists events_write_admin on public.events;
create policy events_write_admin on public.events for all to authenticated
  using (public.current_member_active() and public.is_org_member(org_id))
  with check (public.current_member_active() and public.is_org_member(org_id));

-- Para DES-PAUSAR tras revisar un reporte (lo corre un humano):
--   update public.members set status = 'active' where id = 'MEMBER_ID';
--   update public.reports  set status = 'reviewed' where reported_id = 'MEMBER_ID' and status = 'pending';
