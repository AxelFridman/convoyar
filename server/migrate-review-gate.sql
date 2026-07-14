-- ============================================================
-- Convoyar — Reseñas solo entre co-viajeros (anti ★-bombing).
-- Correr en Supabase → SQL Editor, en PROD **y** en DEV. Idempotente.
-- Correr DESPUÉS de schema.sql + rls.sql + migrate-moderation.sql
-- (usa current_member_id / current_member_active de esas migraciones).
-- ⚠️ ORDEN: esta migración debe correr SIEMPRE ÚLTIMA de las de reviews. Si por
--    cualquier motivo re-corrés migrate-moderation.sql (que redefine
--    reviews_insert_self SIN share_trip), volvé a correr ESTA después: si no, el
--    gate anti-★-bombing queda pisado por la versión permisiva.
--
-- Problema que arregla: la política vieja `reviews_insert_self` solo chequeaba
-- `from_member_id = current_member_id()`, así que CUALQUIER usuario podía dejarle
-- una reseña (★1..★5) a CUALQUIER otro sin haber viajado nunca con él. Es un
-- agujero de integridad de reputación (bombardeo de estrellas). Ahora una reseña
-- solo se acepta si los dos **viajaron juntos**.
--
-- Definición de "viajaron juntos" (share_trip): hay un registro en `trip_history`
-- que los vincula (co-viajeros, cuando el historial se materialice) O comparten un
-- auto (`ride`) en alguna asignación calculada (conductor + sus pasajeros del mismo
-- ride). Coincide 1:1 con el helper del cliente `canReview` en src/state/reputation.ts.
-- ============================================================

-- ¿`p_a` y `p_b` viajaron juntos? security definer: lee assignments/legs/trip_history
-- sin importar RLS (solo devuelve un boolean, no filtra ni expone filas).
create or replace function public.share_trip(p_a text, p_b text)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    -- Solo respondemos sobre viajes PROPIOS (uno de los dos tiene que ser el que
    -- pregunta): evita que la función se use como oráculo para espiar si dos
    -- terceros viajaron juntos. La policy de reviews siempre pasa from=yo, así que
    -- no la afecta.
    (p_a = public.current_member_id() or p_b = public.current_member_id())
    and (
    -- (1) vínculo ya registrado en el historial de viajes (en cualquier dirección)
    exists (
      select 1 from public.trip_history th
      where (th.member_id = p_a and th.with_member_id = p_b)
         or (th.member_id = p_b and th.with_member_id = p_a)
    )
    -- (2) o comparten un auto (ride) en alguna asignación calculada
    or exists (
      select 1
      from public.assignments asg
      cross join lateral jsonb_array_elements(coalesce(asg.result -> 'rides', '[]'::jsonb)) ride
      where
        exists (
          select 1 from public.legs l
          where l.member_id = p_a
            and ( l.id = ride ->> 'driverLegId'
               or l.id in (
                    select jsonb_array_elements_text(coalesce(ride -> 'passengerLegIds', '[]'::jsonb))
                  ) )
        )
        and exists (
          select 1 from public.legs l
          where l.member_id = p_b
            and ( l.id = ride ->> 'driverLegId'
               or l.id in (
                    select jsonb_array_elements_text(coalesce(ride -> 'passengerLegIds', '[]'::jsonb))
                  ) )
        )
    ));
$$;

grant execute on function public.share_trip(text, text) to authenticated;

-- ── Endurecer las policies de reviews: además de ser vos y estar activo, tenés
--    que haber viajado con el destinatario. Reemplaza las de migrate-moderation. ──
drop policy if exists reviews_insert_self on public.reviews;
create policy reviews_insert_self on public.reviews for insert to authenticated
  with check (
    from_member_id = public.current_member_id()
    and public.current_member_active()
    and public.share_trip(from_member_id, to_member_id)
  );

drop policy if exists reviews_update_self on public.reviews;
create policy reviews_update_self on public.reviews for update to authenticated
  using (from_member_id = public.current_member_id())
  with check (
    from_member_id = public.current_member_id()
    and public.current_member_active()
    and public.share_trip(from_member_id, to_member_id)
  );

-- La lectura de reseñas sigue pública (reviews_read en rls.sql): no se toca.
