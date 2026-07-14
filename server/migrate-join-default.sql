-- ============================================================
-- Convoyar — Unirse por código: habilitado POR DEFECTO. Correr en PROD **y** DEV.
-- Correr DESPUÉS de migrate-orgs.sql. Idempotente.
--
-- Problema: el código de invitación se muestra grande en Inicio, pero unirse fallaba
-- ("link deshabilitado") porque `orgs.link_enabled` venía en false por defecto y el
-- toggle estaba escondido. Ahora: compartir el código FUNCIONA solo (como esperás).
-- El admin igual puede apagar el link desde el panel de invitar si quiere cerrar el grupo.
-- ============================================================

-- Nuevo default: los grupos nuevos aceptan self-serve por código.
alter table public.orgs alter column link_enabled set default true;

-- Habilitar en los grupos YA creados (los que nadie tocó el toggle).
update public.orgs set link_enabled = true where link_enabled is distinct from true;

-- create_org ahora crea el grupo con el link habilitado explícitamente.
create or replace function public.create_org(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare mid text; oid text;
begin
  mid := public.current_member_id();
  if mid is null then raise exception 'no auth'; end if;
  oid := 'org-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.orgs(id, name, join_code, link_enabled)
    values (oid, coalesce(nullif(trim(p_name), ''), 'Mi grupo'),
            upper(substr(md5(random()::text), 1, 6)), true);
  insert into public.org_members(org_id, member_id, is_admin) values (oid, mid, true);
  return oid;
end $$;
