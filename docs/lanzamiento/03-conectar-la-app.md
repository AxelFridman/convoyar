# 03 · Conectar la app al backend (y borrar los mocks)

> **Qué vas a lograr:** enchufar el front de Convoyar a Supabase. Al terminar, lo que hoy
> se guarda en `localStorage` de un solo dispositivo pasa a vivir en la base compartida, el
> login usa el auth real del [doc 02](02-auth-real.md), y **desaparece la simulación** del
> "organizador que responde solo". Dos personas en dos teléfonos ven la misma salida.

**Antes:** docs [01](01-supabase-base-de-datos.md) (DB + RLS) y [02](02-auth-real.md) (auth).

| | |
|---|---|
| ⏱️ Tiempo | La config (env) son 15 min 🧑. El código es una PR grande 🤖. |
| 💰 Costo | USD 0 |
| 🧑 / 🤖 | **Mayormente CÓDIGO** (esto lo puede hacer Claude en una PR). Vos ponés las env vars y decidís el alcance. |

> ### 📍 Estado (2026-07-12): ❌ ESTE ES EL PASO QUE FALTA
> Verifiqué el repo: **no hay `@supabase/supabase-js` ni `supabaseClient.ts`**. O sea, la app
> **todavía es 100% local** — no habla con la base de Supabase que ya creaste. Todo lo demás
> (login real, ver lo mismo en dos teléfonos, borrar la simulación) **depende de esta PR**.
> Es código, lo puedo hacer yo: decime "dale con el doc 03" y lo armo (branch → PR → verde).
>
> **Ya te dejé listo:** en [`.env`](../../.env) están los aliases `VITE_SUPABASE_URL` y
> `VITE_SUPABASE_ANON_KEY` (= tu `sb_publishable_...`) que el cliente de abajo va a leer.

> 🧩 **Nota sobre la PR7 (`feat/server-skeleton`).** El plan original tenía un servidor
> propio con Postgres. Con Supabase **no lo necesitás**: el "adaptador remoto" que este doc
> describe habla directo con la DB vía RLS. El server Fastify queda para cuando quieras
> lógica pesada de backend (ver [01](01-supabase-base-de-datos.md)); no es un bloqueante.

---

## El mapa del cambio (qué toca esta PR)

```
+ src/services/supabaseClient.ts   (nuevo)  cliente + hasSupabase
+ src/services/authSupabase.ts     (doc 02) provider de auth real
+ src/services/repo.ts             (nuevo)  adaptador: AppState ⇄ tablas de Supabase
~ src/services/auth.ts             elige provider según hasSupabase
~ src/services/storage.ts          pasa a ser CACHE local (offline), no la verdad
~ src/state/store.tsx              carga desde repo, escribe al repo, se suscribe a realtime
- src/state/store.tsx              BORRAR scheduleSimulatedReply + sweep on-mount + auto-reply de chat
```

La filosofía **local-first no se pierde**: `storage.ts` sigue existiendo como **cache** para
que la app abra al toque y funcione sin señal; Supabase es la fuente de verdad que sincroniza.

---

## Paso 1 — Instalar el cliente 🤖 ⏱️ 2 min

```bash
npm i @supabase/supabase-js
```

---

## Paso 2 — Variables de entorno 🧑 ⏱️ 10 min

Los valores salen del [doc 01](01-supabase-base-de-datos.md) (Project URL + anon key).

1. Creá `.env.local` en la raíz (para desarrollo):

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

> ✅ **Ya está en tu `.env`.** Te agregué esas dos líneas (apuntando a **dev** para local) más
> `VITE_SENTRY_DSN`. Recordá: el "anon key" en el formato nuevo es tu **`sb_publishable_...`**,
> NO el `sb_secret_...`. Vite lee tanto `.env` como `.env.local`, así que no hace falta que
> muevas nada. Para producción, las mismas dos variables van en Cloudflare con los valores
> **prod** (ver [doc 04](04-deploy-web-pwa.md)).

2. ⚠️ **Confirmá que `.env*` esté en `.gitignore`** (nunca commitees claves, aunque la anon
   sea pública, es buena higiene). Si no está, agregá una línea `.env*` (dejando afuera un
   `.env.example` con los nombres sin valores, para documentar).
3. En Vite, las variables **tienen que empezar con `VITE_`** para llegar al cliente. Quedan
   **embebidas en el bundle** → por eso solo va la `anon` (pública), **jamás** la `service_role`.
4. Las mismas dos variables se cargan en el hosting web ([doc 04](04-deploy-web-pwa.md)) y
   quedan horneadas en el build de las apps móviles.

---

## Paso 3 — El cliente 🤖

Creá `src/services/supabaseClient.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Si no hay env vars, la app corre en modo demo local (como hoy). */
export const hasSupabase = Boolean(url && anon);

export const supabase = hasSupabase
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : (null as never);
```

`hasSupabase` es el interruptor: con env vars → backend real; sin ellas → sigue la demo
local (útil para tests y para `build:single`). El [doc 02](02-auth-real.md) ya lo usa para
elegir el `AuthProvider`.

> 📱 **Sesión en móvil:** en Capacitor conviene guardar la sesión con `@capacitor/preferences`
> en vez de `localStorage`, pasándole un `storage` custom al `createClient`. Es un detalle de
> los docs [05](05-google-play.md)/[06](06-app-store-ios.md); en web funciona con el default.

---

## Paso 4 — El adaptador (`repo.ts`): AppState ⇄ tablas 🤖

Este es el corazón de la PR. La idea es **no reescribir el store**: mantener la forma de
`AppState` y las acciones, y meter una capa que:

- **Al cargar** arma el `AppState` desde las tablas (una función `loadRemote()` que consulta
  members, orgs, events, legs, join_requests, etc. del scope del usuario y las ensambla).
- **Al mutar** escribe la tabla que corresponde (upserts/inserts), en vez de solo guardar el
  blob local.

Esqueleto:

```ts
import { supabase } from "./supabaseClient";
import type { AppState } from "../state/model";

/** Trae todo lo visible para el usuario logueado y arma el AppState. */
export async function loadRemote(meId: string): Promise<Partial<AppState>> {
  const [members, orgs, events, legs, joinRequests, reviews, tripHistory, messages, notifications] =
    await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("orgs").select("*, org_members(*)"),
      supabase.from("events").select("*"),
      supabase.from("legs").select("*"),
      supabase.from("join_requests").select("*"),
      supabase.from("reviews").select("*"),
      supabase.from("trip_history").select("*"),
      supabase.from("messages").select("*"),
      supabase.from("notifications").select("*").eq("member_id", meId),
    ]);
  // ⇩ mapear snake_case (DB) → camelCase (modelo). Ej.: window_start/window_end → window:{start,end}
  return mapRowsToAppState({ members, orgs, events, legs, joinRequests, reviews, tripHistory, messages, notifications });
}

/** Escrituras puntuales que reemplazan al saveState global. */
export const repo = {
  upsertLeg: (leg) => supabase.from("legs").upsert(toLegRow(leg)),
  insertJoinRequest: (r) => supabase.from("join_requests").insert(toJrRow(r)),
  decideRequest: (id, status) =>
    supabase.from("join_requests").update({ status, decided_at: new Date().toISOString() }).eq("id", id),
  saveAssignment: (eventId, a) => supabase.from("assignments").upsert(toAsgRow(eventId, a)),
  sendMessage: (m) => supabase.from("messages").insert(toMsgRow(m)),
  // ...una por cada acción que hoy muta AppState
};
```

> 💡 **RPC para acciones sensibles.** "Unirse a una org por `joinCode`" y "decidir una
> solicitud" conviene hacerlas con **funciones RPC `security definer`** en Supabase (validan
> del lado del server) en vez de un update directo desde el cliente. El [doc 01](01-supabase-base-de-datos.md)
> lo deja anotado. Es opcional para arrancar dentro de tu grupo de confianza, recomendado
> antes de abrir el modo público.

En `store.tsx` (hoy línea ~276 usa `loadState`, línea ~286 hace `saveState` con debounce):
la carga inicial pasa a `loadRemote(meId)` con fallback a `loadState()` (cache) si no hay
red; y cada acción del store, además de despachar, llama al `repo.*` correspondiente. El
`saveState(state)` local se mantiene como **cache** (para offline), no como verdad.

---

## Paso 5 — Realtime: adiós a la simulación 🤖 ⚠️

Hoy, como no hay backend, el "otro humano" es falso. Con Supabase Realtime, es real. En
`store.tsx` **borrá** estas tres piezas de simulación (confirmadas en el código):

- `scheduleSimulatedReply` (definición en **store.tsx ~386**) y sus llamadas (~444 y ~456).
- El **sweep on-mount** que resolvía solicitudes viejas (~454–464).
- La **auto-respuesta de chat** simulada (~530).

Y en su lugar, suscribite a los cambios que te importan:

```ts
useEffect(() => {
  if (!hasSupabase || !meId) return;
  const ch = supabase
    .channel("convoyar")
    .on("postgres_changes", { event: "*", schema: "public", table: "join_requests" },
        () => refetch("joinRequests"))
    .on("postgres_changes", { event: "*", schema: "public", table: "assignments" },
        () => refetch("assignments"))
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" },
        () => refetch("messages"))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `member_id=eq.${meId}` },
        (p) => pushNotification(p.new))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [meId]);
```

⚠️ **Habilitá Realtime en cada tabla** que quieras escuchar: en el dashboard, Database →
Replication (o Table → habilitar Realtime). Sin eso, no llegan los eventos.

Cuando el organizador real (otra persona) acepta tu pedido, Realtime dispara el evento →
tu app refetchea → ves "¡te aceptaron!" sin recargar. **Idéntico a la UX de la demo, pero de verdad.**

---

## Paso 6 — Matching y privacidad de domicilios 🧠 ⚠️

Recordá del [doc 01](01-supabase-base-de-datos.md): el motor necesita orígenes, pero los
domicilios no pueden filtrarse a otros clientes.

- **Org de confianza:** correr el matching en el cliente es aceptable para arrancar.
- **Modo público (desconocidos):** mové `solveMatching` a una **Edge Function** de Supabase
  (el motor es TS puro → corre tal cual con `service_role`) y devolvé solo puntos de encuentro
  + ETAs. Es la fase 2.5 del [ROADMAP](../ROADMAP.md). No bloquea la Fase 1.

---

## Paso 7 — Probar de verdad 🧑 ⏱️ 10 min

1. `npm run dev` con `.env.local` cargado.
2. Registrate con tu email real → llega el código ([doc 02](02-auth-real.md)) → entrás.
3. Abrí la app en **otro dispositivo/navegador** (o incógnito), registrate con **otro** email.
4. Desde uno pedí lugar en una salida pública; desde el otro (el organizador) aceptá.
5. ✅ El primero recibe la aprobación **sin recargar**. Si eso pasa, la simulación murió y el
   backend está vivo.

---

## ✅ Checklist de este doc

- [ ] `@supabase/supabase-js` instalado
- [ ] `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; `.env*` en `.gitignore`
- [ ] `supabaseClient.ts` con `hasSupabase`
- [ ] `authSupabase.ts` activo (doc 02) y `auth.ts` eligiendo provider
- [ ] `repo.ts` mapea AppState ⇄ tablas; store carga con `loadRemote` (fallback a cache)
- [ ] **Borradas** las 3 piezas de simulación en `store.tsx` (`scheduleSimulatedReply`, sweep, auto-reply chat)
- [ ] Realtime habilitado en las tablas y suscripción en el store
- [ ] `npm test` + `npm run typecheck` en verde
- [ ] **Probado con dos usuarios reales en dos dispositivos** ✅

---

## 🆘 Problemas comunes

- **Los cambios no aparecen en el otro dispositivo** → falta habilitar Realtime en esa tabla
  (Paso 5), o la policy RLS no te deja ver esa fila (correcto que la filtre; revisá el scope).
- **`permission denied` / `row-level security`** → el usuario no tiene member linkeado
  (`ensureMemberRow` del doc 02) o estás escribiendo algo que no es tuyo. Es RLS haciendo su trabajo.
- **Todo anda en dev pero en producción no** → no cargaste las env vars en el hosting
  ([doc 04](04-deploy-web-pwa.md)); el build salió sin `VITE_SUPABASE_URL` → `hasSupabase=false`
  → volvió al modo demo.
- **Los tests se rompen** → los tests corren sin env → `hasSupabase=false` → usan el mock local.
  Bien. No metas llamadas a `supabase` sin chequear `hasSupabase` en caminos que testeás.

---

**Siguiente:** [04 · Deploy web / PWA](04-deploy-web-pwa.md) → sacar la app a internet.
