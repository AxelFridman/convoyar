-- ============================================================
-- Convoyar — Destino COMÚN del grupo privado. Correr en PROD **y** DEV.
-- Correr DESPUÉS de migrate-orgs.sql + migrate-join-default.sql. Idempotente.
--
-- Un grupo privado tiene un "nodo común": el destino al que todos van (el club, el
-- colegio, la cancha). Las salidas/ramas del grupo heredan ese destino por defecto.
-- ============================================================

alter table public.orgs add column if not exists destination_lat  double precision;
alter table public.orgs add column if not exists destination_lng  double precision;
alter table public.orgs add column if not exists destination_name text;

-- create_org ahora acepta (opcional) el destino común del grupo.
-- Dropeamos la versión de 1 argumento (de migrate-orgs / migrate-join-default) para
-- que no quede un overload ambiguo que PostgREST no pueda resolver.
drop function if exists public.create_org(text);
create or replace function public.create_org(
  p_name text,
  p_dest_lat double precision default null,
  p_dest_lng double precision default null,
  p_dest_name text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare mid text; oid text;
begin
  mid := public.current_member_id();
  if mid is null then raise exception 'no auth'; end if;
  oid := 'org-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.orgs(id, name, join_code, link_enabled, destination_lat, destination_lng, destination_name)
    values (oid, coalesce(nullif(trim(p_name), ''), 'Mi grupo'),
            upper(substr(md5(random()::text), 1, 6)), true,
            p_dest_lat, p_dest_lng, nullif(trim(coalesce(p_dest_name, '')), ''));
  insert into public.org_members(org_id, member_id, is_admin) values (oid, mid, true);
  return oid;
end $$;

-- Editar el destino común (solo admin del grupo).
create or replace function public.set_org_destination(
  p_org text, p_lat double precision, p_lng double precision, p_name text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_admin(p_org) then raise exception 'no admin'; end if;
  update public.orgs
    set destination_lat = p_lat, destination_lng = p_lng,
        destination_name = nullif(trim(coalesce(p_name, '')), '')
    where id = p_org;
end $$;

grant execute on function
  public.create_org(text, double precision, double precision, text),
  public.set_org_destination(text, double precision, double precision, text)
  to authenticated;
