-- ============================================================
-- Convoyar — Salidas PÚBLICAS en un paso (sin elegir grupo) + recurrencia.
-- Correr en PROD **y** DEV. Idempotente. Después de migrate-personal-org.sql.
--
-- Una salida pública no obliga a elegir un grupo: vive en la org personal del
-- usuario (org-<memberId>, la misma de "Mis viajes"), pero como es visibility=public
-- se descubre en Explorar para todos. `create_public_trip` asegura esa org personal
-- del lado servidor (sin abrir INSERT en org_members) y crea el evento público.
-- ============================================================

-- Recurrencia semanal opcional: { "days": [1,3] } (0=Dom … 6=Sáb). Ausente = una vez.
alter table public.events add column if not exists recurrence jsonb;

create or replace function public.create_public_trip(
  p_title       text,
  p_date        timestamptz,
  p_dest_lat    double precision,
  p_dest_lng    double precision,
  p_dest_name   text,
  p_origin_name text,
  p_recurrence  jsonb
)
returns text language plpgsql security definer set search_path = public as $$
declare mid text; oid text; eid text;
begin
  mid := public.current_member_id();
  if mid is null then raise exception 'no auth'; end if;
  if not public.current_member_active() then raise exception 'cuenta pausada'; end if;

  -- Asegurar la org personal (id determinístico org-<mid>), sin abrir policies.
  oid := 'org-' || mid;
  insert into public.orgs (id, name, join_code)
    values (oid, 'Mis viajes', upper(substr(md5(random()::text), 1, 6)))
    on conflict (id) do nothing;
  insert into public.org_members (org_id, member_id, is_admin)
    values (oid, mid, true) on conflict do nothing;

  -- Crear la salida pública en esa org.
  eid := 'ev' || replace(gen_random_uuid()::text, '-', '');
  insert into public.events
    (id, org_id, title, date, destination_lat, destination_lng, destination_name,
     visibility, created_by, origin_name, recurrence)
  values
    (eid, oid, coalesce(nullif(trim(p_title), ''), 'Viaje'), p_date,
     p_dest_lat, p_dest_lng, nullif(trim(coalesce(p_dest_name, '')), ''),
     'public', mid, nullif(trim(coalesce(p_origin_name, '')), ''), p_recurrence);

  return eid;
end $$;

grant execute on function
  public.create_public_trip(text, timestamptz, double precision, double precision, text, text, jsonb)
  to authenticated;

-- Realtime: la columna nueva viaja sola en las filas de events (ya publicada).
