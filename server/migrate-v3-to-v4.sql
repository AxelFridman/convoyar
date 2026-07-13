-- ============================================================
-- Convoyar — migración de schema v3 → v4
-- Correr en Supabase → SQL Editor, en PROD **y** en DEV.
-- Es idempotente (podés correrlo más de una vez sin romper nada).
--
-- Por qué: el código del cliente ya usa el modelo v4 (garage de vehículos,
-- vehículo por viaje, defaults por persona, formato de hora, aporte de nafta),
-- pero la base tiene el schema v3. Esto la pone al día.
-- ============================================================

-- 1) members.vehicles (Vehicle[]) reemplaza a members.vehicle (uno solo)
alter table public.members add column if not exists vehicles jsonb not null default '[]';

-- migrar el vehículo viejo → array con id estable, y dropear la columna vieja
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'members' and column_name = 'vehicle'
  ) then
    update public.members
      set vehicles = case
        when vehicle is null then '[]'::jsonb
        else jsonb_build_array(
          vehicle || jsonb_build_object('id', coalesce(vehicle->>'id', 'veh-' || id))
        )
      end
      where vehicles = '[]'::jsonb;
    alter table public.members drop column vehicle;
  end if;
end $$;

-- 2) members.defaults (TripDefaults) — precarga de viajes nuevos
alter table public.members add column if not exists defaults jsonb;

-- 3) legs.vehicle_id — qué vehículo del garage se ofrece en ESA salida
alter table public.legs add column if not exists vehicle_id text;

-- 4) member_settings: formato de hora + precio de nafta (aporte sugerido)
alter table public.member_settings add column if not exists hour12 boolean not null default false;
alter table public.member_settings add column if not exists fuel_price_per_l numeric;

-- 5) RLS: el admin de un evento puede escribir/borrar legs de SU evento
--    (necesario para aprobar pedidos y cancelar conductores; antes solo el dueño del leg).
drop policy if exists legs_write_self on public.legs;
create policy legs_write_self on public.legs
  for all to authenticated
  using (member_id = public.current_member_id() or public.can_admin_event(event_id))
  with check (member_id = public.current_member_id() or public.can_admin_event(event_id));

-- 6) Realtime: las tablas compartidas tienen que estar en la publicación para emitir cambios.
do $$
declare t text;
begin
  foreach t in array array['events','legs','join_requests','assignments','messages','reviews','org_members','members','notifications']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Listo. Si NO tenías todavía el schema base v3, corré antes server/schema.sql y server/rls.sql.
-- Verificá que RLS siga activo:  select tablename, rowsecurity from pg_tables where schemaname='public';
