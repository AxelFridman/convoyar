# `server/` — base de datos y backend de Convoyar

> **Convoyar arranca sin esto.** Hoy la app corre 100 % en el navegador, un dispositivo,
> con el estado en `localStorage`. Este directorio es para cuando quieras **multi-dispositivo
> real**: que dos personas en dos teléfonos vean la misma salida, login con email de verdad,
> sync en vivo. La guía paso a paso (con capturas mentales de cada dashboard) está en
> **[`../docs/lanzamiento/`](../docs/lanzamiento/)** — empezá por su README.

## Qué hay acá

| Archivo | Qué es |
|---|---|
| `schema.sql` | El schema Postgres completo, derivado 1:1 de [`src/state/model.ts`](../src/state/model.ts) (AppState v3). |
| `rls.sql` | Row Level Security: las reglas de "cada uno ve/toca lo suyo". **No es opcional en producción.** |
| `seed.sql` | Seed mínimo de humo para probar la conexión en dev (NO para producción). |
| `edge-functions/match/` | Ejemplo de Edge Function que corre el motor de matching server-side (privacidad del modo público). Esqueleto documentado. |
| `docker-compose.yml` | Un Postgres local para desarrollar sin tocar la nube. |

## Camino recomendado: Supabase (gestionado, free tier)

No hace falta administrar un servidor. Supabase te da Postgres + Auth + Realtime:

1. Creá el proyecto y cargá el schema → **[docs/lanzamiento/01](../docs/lanzamiento/01-supabase-base-de-datos.md)**
   (podés pegar `schema.sql` y `rls.sql` en el SQL Editor, o usar la CLI: `supabase db push`).
2. Auth por email/OTP → **[docs/lanzamiento/02](../docs/lanzamiento/02-auth-real.md)**.
3. Conectar la app (reemplazar `services/storage.ts` por un repo remoto, sin tocar el motor)
   → **[docs/lanzamiento/03](../docs/lanzamiento/03-conectar-la-app.md)**.

El contrato que un backend debe respetar es el del motor:
`buildMatchInput(state, eventId) → MatchInput` y de vuelta `MatchResult`
(ver [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)).

## Camino alternativo: Postgres propio

`schema.sql` y `rls.sql` son Postgres estándar — no hay lock-in de Supabase en los datos:

```bash
# levantar un Postgres local
docker compose -f server/docker-compose.yml up -d

# cargar schema + rls + seed
psql "postgres://convoyar:convoyar@localhost:5432/convoyar" -f server/schema.sql
psql "postgres://convoyar:convoyar@localhost:5432/convoyar" -f server/rls.sql
psql "postgres://convoyar:convoyar@localhost:5432/convoyar" -f server/seed.sql
```

> Nota: `rls.sql` referencia `auth.users` y `auth.uid()` (namespace de Supabase). Contra un
> Postgres pelado, o creás un esquema `auth` mínimo o adaptás las policies a tu capa de auth.
> Para desarrollo local sin auth podés cargar solo `schema.sql` + `seed.sql`.

## Secretos — regla de oro

**Nunca** commitees claves reales. El `.gitignore` ya ignora `.env` y `server/.env`.
La `service_role` de Supabase (y cualquier password de DB) va SOLO en variables de entorno
del servidor / secrets de la función, jamás en el front ni en el bundle. Ver la tabla de
claves en [docs/lanzamiento/01 (Paso 2)](../docs/lanzamiento/01-supabase-base-de-datos.md).
