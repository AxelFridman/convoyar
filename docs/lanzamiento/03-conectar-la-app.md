# 03 · Conectar la app al backend (y borrar los mocks)

> **Qué vas a lograr:** enchufar el front de Convoyar a Supabase. Al terminar, lo que hoy
> se guarda en `localStorage` de un solo dispositivo pasa a vivir en la base compartida, el
> login usa el auth real del [doc 02](02-auth-real.md), y **desaparece la simulación** del
> "organizador que responde solo". Dos personas en dos teléfonos ven la misma salida.

**Antes:** docs [01](01-supabase-base-de-datos.md) (DB + RLS) y [02](02-auth-real.md) (auth).

| | |
|---|---|
| ⏱️ Tiempo | Ya hecho. Lo que queda: 2 env vars en el hosting (15 min 🧑). |
| 💰 Costo | USD 0 |
| 🧑 / 🤖 | El código **ya está** 🤖. Vos ponés las env vars en el hosting y probás con 2 dispositivos. |

> ### 📍 Estado (2026-07-13): ✅ HECHO
> La app **ya está conectada a Supabase**: `@supabase/supabase-js` instalado, `supabaseClient.ts`
> (con `hasSupabase`), `repo.ts` (AppState ⇄ tablas + realtime) y auth **email + contraseña**. Es
> multiusuario real: dos personas en dos dispositivos ven la misma salida (en tests, E2E y
> `build:single` sigue 100 % local). Este doc queda como **referencia de cómo se hizo** y qué
> falta pulir. Env vars `VITE_SUPABASE_*` en [`.env`](../../.env) (dev) y `.env.production.local`.

> 🧩 **Nota sobre la PR7 (`feat/server-skeleton`).** El plan original tenía un servidor
> propio con Postgres. Con Supabase **no lo necesitás**: el "adaptador remoto" que este doc
> describe habla directo con la DB vía RLS. El server Fastify queda para cuando quieras
> lógica pesada de backend (ver [01](01-supabase-base-de-datos.md)); no es un bloqueante.

---

## El mapa del cambio (qué toca esta PR)

```
+ src/services/supabaseClient.ts   cliente + hasSupabase                                   ✅
+ src/services/repo.ts             adaptador: AppState ⇄ tablas + realtime                 ✅
~ src/services/auth.ts             email + contraseña contra Supabase Auth                 ✅
+ src/screens/Auth.tsx             pantalla de alta / login / recovery                     ✅
~ src/services/storage.ts          quedó como CACHE local (offline), no la verdad          ✅
~ src/state/store.tsx              sesión (onAuthStateChange) + loadRemote + writeAction + subscribeRealtime  ✅
~ src/state/store.tsx              scheduleSimulatedReply + sweep + auto-reply de chat: GATEADOS con `if (hasSupabase) return` (no borrados)  ✅
```

La filosofía **local-first no se pierde**: `storage.ts` sigue existiendo como **cache** para
que la app abra al toque y funcione sin señal; Supabase es la fuente de verdad que sincroniza.

---

## Paso 1 — Instalar el cliente 🤖 ✅ hecho

```bash
npm i @supabase/supabase-js   # ✅ ya instalado (^2.110)
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

`hasSupabase` es el interruptor: con env vars → backend real; sin ellas (o en tests/`build:single`)
→ sigue la demo local. El [doc 02](02-auth-real.md) lo usa para prender la auth real (email + contraseña).

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

## Paso 5 — Realtime: adiós a la simulación (con backend) 🤖

Con Supabase Realtime, el "otro humano" es real. La simulación **no se borró**: quedó **gateada**
con `if (hasSupabase) return`, así sigue viva para el modo demo local (tests, `build:single`) y se
apaga sola con backend. Las tres piezas gateadas en `store.tsx`:

- `scheduleSimulatedReply` (la respuesta automática del organizador ajeno).
- El **sweep on-mount** que resolvía solicitudes viejas.
- La **auto-respuesta de chat** simulada.

Con backend, la suscripción real vive en `services/repo.ts` (`subscribeRealtime`), que el store
usa para recargar el estado ante cambios. La idea (referencia):

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

✅ **Realtime ya está habilitado**: la migración `migrate-v3-to-v4.sql` agrega las tablas
compartidas a la publicación `supabase_realtime`. (Si agregás una tabla nueva que quieras
escuchar, sumala a esa publicación.)

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
2. Registrate con nombre + email + contraseña → (si "Confirm email" está ON) confirmás por email → entrás ([doc 02](02-auth-real.md)).
3. Abrí la app en **otro dispositivo/navegador** (o incógnito), registrate con **otro** email.
4. Desde uno pedí lugar en una salida pública; desde el otro (el organizador) aceptá.
5. ✅ El primero recibe la aprobación **sin recargar**. Si eso pasa, la simulación murió y el
   backend está vivo.

---

## ✅ Checklist de este doc

- [x] `@supabase/supabase-js` instalado
- [x] Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en `.env`; `.env*` en `.gitignore`
- [x] `supabaseClient.ts` con `hasSupabase`
- [x] `auth.ts` (email + contraseña) + `screens/Auth.tsx` (doc 02)
- [x] `repo.ts` mapea AppState ⇄ tablas; store carga con `loadRemote` (fallback a cache)
- [x] Las 3 piezas de simulación en `store.tsx` **gateadas** con `if (hasSupabase) return` (no borradas)
- [x] Realtime habilitado (publicación `supabase_realtime`, migración v4) + suscripción en el store
- [ ] `npm test` + `npm run typecheck` en verde (correlo vos)
- [ ] **Probado con dos usuarios reales en dos dispositivos**

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
