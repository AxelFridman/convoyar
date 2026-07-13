-- ============================================================
-- Convoyar — Privacidad (email) + permisos de eventos. Correr en PROD **y** DEV.
-- Correr DESPUÉS de schema.sql + rls.sql + migrate-orgs.sql + migrate-moderation.sql.
-- Idempotente.
--
-- Arregla 2 hallazgos de la revisión de seguridad:
--
-- (1) FUGA DE PII: la policy members_read_all es `using(true)`. RLS es a nivel de
--     FILA, no de columna, así que exponía TODAS las columnas de members —incluido
--     el EMAIL— a cualquier usuario logueado (supabase.from('members').select('email')).
--     Eso contradice la Política de Privacidad (§5: el email nunca es visible para
--     otros). Fix: privilegios SELECT por columna → authenticated NO puede leer email.
--     El email propio lo toma el front de la sesión (auth), no de la tabla.
--     add_member_by_email (security definer, corre como owner) sigue viendo el email.
--
-- (2) ESCALADA DE PRIVILEGIOS: events_write_admin era `for all using(is_org_member)`,
--     así cualquier miembro (no solo admin/creador) podía UPDATE/DELETE cualquier
--     evento de la org, o cambiar visibility a 'public'. Fix: INSERT para miembro
--     activo; UPDATE/DELETE solo para can_admin_event (creador ∨ admin de la org).
-- ============================================================

-- ── (1) Email fuera del alcance de lectura de 'authenticated' ────────────────
-- Quitamos el SELECT amplio y concedemos SELECT solo a las columnas del perfil
-- público (todas menos email). La policy members_read_all (row-level) sigue igual.
revoke select on public.members from authenticated;
grant select
  (id, auth_user_id, name, subgroup, vehicles, defaults, joined_at, bio,
   email_verified, status, created_at)
  on public.members to authenticated;

-- Realtime: no difundir la columna email por el WAL (defensa en profundidad).
-- Requiere Postgres 15+ (listas de columnas en publicaciones). Best-effort.
do $$
begin
  begin
    alter publication supabase_realtime drop table public.members;
  exception when others then null;
  end;
  alter publication supabase_realtime add table public.members
    (id, auth_user_id, name, subgroup, vehicles, defaults, joined_at, bio,
     email_verified, status, created_at);
exception when others then
  raise notice 'No se pudo ajustar la publicación de realtime para members (¿PG < 15?). El grant por columna ya bloquea la fuga por API; revisá la publicación a mano si querés cerrar también el WAL.';
end $$;

-- ── (2) Eventos: crear = miembro activo; editar/borrar = solo admin/creador ──
drop policy if exists events_write_admin on public.events;
drop policy if exists events_insert_member on public.events;
drop policy if exists events_modify_admin on public.events;

-- Crear una salida: cualquier miembro activo de la org, y creándola como uno mismo.
create policy events_insert_member on public.events
  for insert to authenticated
  with check (
    public.current_member_active()
    and public.is_org_member(org_id)
    and created_by = public.current_member_id()
  );

-- Editar/borrar una salida: solo el creador o un admin de la org (y activo).
create policy events_modify_admin on public.events
  for update to authenticated
  using (public.current_member_active() and public.can_admin_event(id))
  with check (public.current_member_active() and public.can_admin_event(id));
create policy events_delete_admin on public.events
  for delete to authenticated
  using (public.current_member_active() and public.can_admin_event(id));
