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

-- (La creación de grupos con el link habilitado la define create_org en
--  migrate-org-destination.sql, que ya lo crea con link_enabled = true. No
--  redefinimos create_org acá para que las migraciones sean independientes del
--  orden en que las corras.)
