-- ============================================================
-- Convoyar — Organizaciones (grupos) privadas: crear, unirse, invitar.
-- Correr en Supabase → SQL Editor, en PROD **y** en DEV. Idempotente.
--
-- Modelo de invitación (decidido con el dueño):
--   • Grupos ILIMITADOS y GRATIS.
--   • "Link/código compartible" por grupo, con TOGGLE `link_enabled` (tipo Google Drive):
--       - ON  → cualquiera con el código/link se une solo (self-serve).
--       - OFF → nadie se une solo; SOLO el admin agrega a mano por email (más seguro).
--   • El admin siempre puede agregar por email, esté el link ON u OFF.
-- ============================================================

alter table public.orgs add column if not exists link_enabled boolean not null default false;

create or replace function public.is_org_admin(p_org text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.org_members
    where org_id = p_org and member_id = public.current_member_id() and is_admin = true
  )
$$;

-- Crear un grupo (el creador queda admin). Ilimitado y gratis.
create or replace function public.create_org(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare mid text; oid text;
begin
  mid := public.current_member_id();
  if mid is null then raise exception 'no auth'; end if;
  oid := 'org-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.orgs(id, name, join_code)
    values (oid, coalesce(nullif(trim(p_name), ''), 'Mi grupo'), upper(substr(md5(random()::text), 1, 6)));
  insert into public.org_members(org_id, member_id, is_admin) values (oid, mid, true);
  return oid;
end $$;

-- Unirse por código/link (self-serve). SOLO si el grupo tiene el link habilitado.
create or replace function public.join_org_by_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare mid text; oid text; enabled boolean;
begin
  mid := public.current_member_id();
  if mid is null then raise exception 'no auth'; end if;
  select id, link_enabled into oid, enabled from public.orgs where upper(join_code) = upper(trim(p_code));
  if oid is null then raise exception 'codigo invalido'; end if;
  if not enabled then raise exception 'link deshabilitado'; end if;
  insert into public.org_members(org_id, member_id, is_admin) values (oid, mid, false) on conflict do nothing;
  return oid;
end $$;

-- El admin agrega a alguien por email (camino manual/seguro; NO depende del toggle).
create or replace function public.add_member_by_email(p_org text, p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare tgt text;
begin
  if not public.is_org_admin(p_org) then raise exception 'no admin'; end if;
  select id into tgt from public.members where lower(email) = lower(trim(p_email)) limit 1;
  if tgt is null then raise exception 'no existe usuario con ese email'; end if;
  insert into public.org_members(org_id, member_id, is_admin) values (p_org, tgt, false) on conflict do nothing;
  return tgt;
end $$;

-- Habilitar/deshabilitar el link compartible (admin).
create or replace function public.set_org_link(p_org text, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_admin(p_org) then raise exception 'no admin'; end if;
  update public.orgs set link_enabled = p_enabled where id = p_org;
end $$;

-- Salir de un grupo.
create or replace function public.leave_org(p_org text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.org_members where org_id = p_org and member_id = public.current_member_id();
end $$;

grant execute on function
  public.create_org(text), public.join_org_by_code(text), public.add_member_by_email(text, text),
  public.set_org_link(text, boolean), public.leave_org(text), public.is_org_admin(text)
  to authenticated;
