-- ============================================================
-- Convoyar — RPC: espacio personal para cada usuario nuevo
-- Correr en Supabase → SQL Editor (PROD y DEV). Idempotente.
--
-- Por qué: un evento (salida) necesita una org (FK). Un usuario recién creado no
-- tiene ninguna, así que sin esto no puede crear salidas y la app queda vacía.
-- Esta función crea, la primera vez, una org personal ("Mis viajes") y suma al
-- usuario como admin — todo del lado servidor (security definer), sin abrir una
-- policy de INSERT en org_members que permitiría auto-unirse a orgs ajenas.
-- La app la llama con supabase.rpc('ensure_personal_org') después del login.
-- ============================================================

create or replace function public.ensure_personal_org()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  mid text;
  oid text;
begin
  mid := public.current_member_id();
  if mid is null then
    return null;
  end if;

  -- ¿ya pertenece a alguna org? entonces no hago nada
  select om.org_id into oid
  from public.org_members om
  where om.member_id = mid
  limit 1;
  if oid is not null then
    return oid;
  end if;

  -- crear la org personal + membresía admin
  oid := 'org-' || mid;
  insert into public.orgs (id, name, join_code)
    values (oid, 'Mis viajes', upper(substr(md5(random()::text), 1, 6)))
    on conflict (id) do nothing;
  insert into public.org_members (org_id, member_id, is_admin)
    values (oid, mid, true)
    on conflict do nothing;

  return oid;
end;
$$;

grant execute on function public.ensure_personal_org() to authenticated;
