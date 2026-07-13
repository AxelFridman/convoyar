-- ============================================================
-- Convoyar — Borrar cuenta (derecho al olvido + requisito de las tiendas).
-- Correr en Supabase → SQL Editor, en PROD **y** en DEV. Idempotente.
-- Correr DESPUÉS de schema.sql + rls.sql + migrate-orgs.sql + migrate-moderation.sql.
--
-- Por qué existe:
--   • La Política de Privacidad (sección 11) promete borrado directo desde la app.
--   • Google Play y App Store lo EXIGEN para apps con cuentas.
--
-- Cómo funciona:
--   El grueso del borrado lo hace el esquema: casi todas las tablas referencian
--   members(id) con ON DELETE CASCADE (home, settings, legs, join_requests, reviews,
--   trip_history, messages, notifications, device_tokens, org_members, reports,
--   member_blocks). Así que basta con:
--     1) resolver las orgs donde el usuario es el único miembro → borrarlas
--        (cascade → events/legs); esto cubre la org personal "Mis viajes".
--     2) en orgs compartidas donde era el único admin, promover al miembro más
--        antiguo para no dejarlas acéfalas.
--     3) borrar la fila members (cascade elimina todo lo suyo).
--     4) borrar el usuario de auth.users (libera el email y corta el login).
--   Los eventos que creó en orgs ajenas NO se borran: events.created_by es
--   ON DELETE SET NULL, así el viaje de los demás no desaparece.
-- ============================================================

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  mid                text;
  uid                uuid;
  solo_orgs          text[];
  admin_orphan_orgs  text[];
begin
  uid := auth.uid();
  if uid is null then raise exception 'no auth'; end if;
  mid := public.current_member_id();

  if mid is not null then
    -- (1) Orgs donde soy el ÚNICO miembro (incluye la org personal).
    select array_agg(om.org_id) into solo_orgs
    from public.org_members om
    where om.member_id = mid
      and not exists (
        select 1 from public.org_members o2
        where o2.org_id = om.org_id and o2.member_id <> mid
      );

    -- (2) Orgs compartidas donde soy el único admin (quedarían sin admin).
    select array_agg(om.org_id) into admin_orphan_orgs
    from public.org_members om
    where om.member_id = mid and om.is_admin
      and exists (
        select 1 from public.org_members o2
        where o2.org_id = om.org_id and o2.member_id <> mid
      )
      and not exists (
        select 1 from public.org_members o3
        where o3.org_id = om.org_id and o3.is_admin and o3.member_id <> mid
      );

    -- Promuevo al miembro más antiguo de esas orgs para que no queden acéfalas.
    if admin_orphan_orgs is not null then
      update public.org_members t set is_admin = true
      from (
        select distinct on (org_id) org_id, member_id
        from public.org_members
        where org_id = any(admin_orphan_orgs) and member_id <> mid
        order by org_id, joined_at asc
      ) pick
      where t.org_id = pick.org_id and t.member_id = pick.member_id;
    end if;

    -- Borro las orgs donde era el único (cascade → events, legs, org_members).
    if solo_orgs is not null then
      delete from public.orgs where id = any(solo_orgs);
    end if;

    -- (3) Borro el miembro: cascade elimina todo lo suyo en las demás tablas.
    delete from public.members where id = mid;
  end if;

  -- (4) Borro el usuario de auth (libera el email, corta el login).
  delete from auth.users where id = uid;
end $$;

grant execute on function public.delete_my_account() to authenticated;
