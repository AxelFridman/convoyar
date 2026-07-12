-- ============================================================
-- Convoyar — seed mínimo de humo para una DB nueva.
-- OJO: esto es SOLO para probar la conexión en un entorno de dev.
-- Los datos ricos de la demo se generan en el cliente (src/seed.ts) y NO
-- deberían cargarse en una base de producción.
-- Correr después de schema.sql (con RLS podés necesitar service_role o correrlo
-- desde el SQL Editor de Supabase, que saltea RLS).
-- ============================================================

insert into public.orgs (id, name, join_code) values
  ('org1', 'La Banda del Asado', 'ASADO-2611')
on conflict (id) do nothing;

insert into public.members (id, name, subgroup) values
  ('m0', 'Vos', 'amigos'),
  ('m2', 'Diego R.', 'amigos')
on conflict (id) do nothing;

insert into public.org_members (org_id, member_id, is_admin) values
  ('org1', 'm0', true),
  ('org1', 'm2', false)
on conflict do nothing;

insert into public.events (id, org_id, title, date, destination_lat, destination_lng, destination_name, visibility, created_by)
values ('ev1', 'org1', 'Asado del sábado', now() + interval '3 days', -34.6417, -58.6803, 'Quinta de Ituzaingó', 'private', 'm0')
on conflict (id) do nothing;
