/**
 * Supabase Edge Function — `match`  (EJEMPLO / esqueleto, no desplegado)
 * =====================================================================
 * Corre el motor de matching EN EL SERVIDOR. Es el camino correcto para el
 * modo público: los domicilios (member_home) nunca viajan al navegador de otro
 * usuario — entran acá con service_role, se resuelve el convoy, y al cliente
 * solo vuelven puntos de encuentro + ETAs (invariante de privacidad #6).
 *
 * Por qué es trivial: el motor (../../src/engine) es TypeScript PURO, sin React
 * ni DOM. Corre tal cual en Deno (runtime de las Edge Functions de Supabase).
 *
 * Deploy (cuando lo quieras usar de verdad):
 *   supabase functions deploy match
 *   # requiere: proyecto Supabase linkeado + service_role en los secrets de la función
 *
 * Contrato (idéntico al del cliente, ver docs/ARCHITECTURE.md):
 *   POST { eventId }  →  { rides, unassigned, stats }   (sin domicilios)
 *
 * Este archivo está deliberadamente como ESQUELETO: las líneas marcadas TODO se
 * completan al conectar Supabase (docs/lanzamiento/03-conectar-la-app.md). Se deja
 * fuera del `tsc` del front (no está en src/) a propósito: usa APIs de Deno.
 */

// @ts-nocheck — este archivo corre en Deno (Edge Functions), no en el tsconfig del front.
import { createClient } from "jsr:@supabase/supabase-js@2";
// El motor se importa tal cual desde el front (mismo contrato MatchInput→MatchResult):
import { solveMatching } from "../../../src/engine/matching.ts";
import { MockRoutingProvider } from "../../../src/engine/routing.ts";
// Producción: cambiar por OsrmRoutingProvider apuntando a tu OSRM (docs/lanzamiento/09).

Deno.serve(async (req: Request) => {
  try {
    const { eventId } = await req.json();
    if (!eventId) return json({ error: "eventId requerido" }, 400);

    // service_role: saltea RLS para poder leer los domicilios de todos los legs.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Cargar el evento, sus legs y los domicilios (server-side, privado).
    const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (!ev) return json({ error: "evento inexistente" }, 404);
    const { data: legs } = await supabase.from("legs").select("*").eq("event_id", eventId);
    const { data: homes } = await supabase.from("member_home").select("*");
    const { data: org } = await supabase.from("orgs").select("meeting_points").eq("id", ev.org_id).single();

    // 2) Armar el MatchInput (mismo shape que buildMatchInput del cliente).
    //    TODO: mapear filas SQL → DriverLeg[]/PassengerLeg[] (ver src/state/store.tsx:buildMatchInput).
    const input = buildInputFromRows(ev, legs ?? [], homes ?? [], org?.meeting_points ?? []);

    // 3) Resolver y persistir. Al cliente solo vuelven paradas + ETAs, nunca homes.
    const result = await solveMatching(input, new MockRoutingProvider());
    await supabase.from("assignments").upsert({
      event_id: eventId,
      result,
      computed_at: new Date().toISOString()
    });

    return json(result);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

// TODO(doc 03): implementar el mapeo fila→leg. Se deja stub para que el esqueleto
// exprese la intención sin fingir que está terminado.
function buildInputFromRows(_ev: unknown, _legs: unknown[], _homes: unknown[], _mps: unknown[]) {
  throw new Error("buildInputFromRows: completar al conectar Supabase (docs/lanzamiento/03).");
}
