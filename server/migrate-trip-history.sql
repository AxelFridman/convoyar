-- ============================================================
-- Convoyar — Historial real de viajes (materialización de TripRecord).
-- Correr en Supabase → SQL Editor, en PROD **y** en DEV. Idempotente.
-- Correr DESPUÉS de schema.sql + rls.sql.
--
-- Problema que arregla: `trip_history` se LEÍA (perfil público, contador de
-- viajes, logros, gate de reseñas) pero NUNCA se escribía fuera del seed. En
-- producción, el historial de todo usuario real quedaba vacío para siempre.
--
-- Solución: una RPC idempotente que, para los eventos YA PASADOS con una
-- asignación calculada donde el usuario participó, materializa un TripRecord por
-- miembro que viajó (conductor y pasajeros del mismo auto). El cliente la llama
-- al hidratar (best-effort). Como es `security definer`, un solo participante que
-- entre materializa el evento para todos sus co-viajeros. `on conflict do nothing`
-- la hace repetible sin duplicar (id determinístico por evento+miembro).
--
-- Nota: el gate de reseñas (share_trip, migrate-review-gate.sql) NO depende de
-- esto — ya cubre el caso vía la asignación. Esto es para que el PERFIL muestre
-- viajes reales.
-- ============================================================

create or replace function public.materialize_my_trips()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  mid            text;
  inserted       int := 0;
  ev             record;
  ride           jsonb;
  driver_mid     text;
  pax_mids       text[];
  pax            text;
  companion      text;
  companion_name text;
  driver_name    text;
begin
  mid := public.current_member_id();
  if mid is null then return 0; end if;

  -- Eventos pasados, con asignación, donde YO tengo un leg (participé).
  for ev in
    select e.id as event_id, e.title, e.date, a.result
    from public.events e
    join public.assignments a on a.event_id = e.id
    where e.date < now()
      and exists (select 1 from public.legs l where l.event_id = e.id and l.member_id = mid)
  loop
    for ride in
      select value from jsonb_array_elements(coalesce(ev.result -> 'rides', '[]'::jsonb))
    loop
      -- Conductor de este auto.
      select l.member_id into driver_mid
      from public.legs l where l.id = ride ->> 'driverLegId';

      -- Pasajeros de este auto. `order by` fija el compañero visible del
      -- conductor de forma determinística (si no, array_agg no garantiza orden).
      select coalesce(array_agg(l.member_id order by l.member_id), '{}') into pax_mids
      from public.legs l
      where l.id in (
        select jsonb_array_elements_text(coalesce(ride -> 'passengerLegIds', '[]'::jsonb))
      );

      if driver_mid is not null then
        select name into driver_name from public.members where id = driver_mid;
        -- Fila del conductor (compañero visible = primer pasajero, si hay).
        companion := (select p from unnest(pax_mids) p limit 1);
        companion_name := (select name from public.members where id = companion);
        insert into public.trip_history(id, member_id, title, date, role, with_member_id, with_name)
        values ('th-' || ev.event_id || '-' || driver_mid, driver_mid, ev.title, ev.date,
                'driver', companion, companion_name)
        on conflict (id) do nothing;
        if found then inserted := inserted + 1; end if;

        -- Una fila por pasajero (compañero visible = el conductor).
        foreach pax in array pax_mids loop
          insert into public.trip_history(id, member_id, title, date, role, with_member_id, with_name)
          values ('th-' || ev.event_id || '-' || pax, pax, ev.title, ev.date,
                  'passenger', driver_mid, driver_name)
          on conflict (id) do nothing;
          if found then inserted := inserted + 1; end if;
        end loop;
      end if;
    end loop;
  end loop;

  return inserted;
end $$;

grant execute on function public.materialize_my_trips() to authenticated;

-- La escritura la hace SOLO esta función (security definer). No hace falta policy
-- de INSERT para `authenticated`: la lectura pública (trips_read en rls.sql) alcanza.
