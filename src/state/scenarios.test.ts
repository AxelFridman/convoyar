// Escenarios multiusuario de punta a punta del CAMINO REAL de la app:
//   AppState (varios miembros + legs) → buildMatchInput (store) → solveMatching (motor).
// Complementa engine/matching.test.ts (que prueba el motor puro): acá probamos que
// la traducción estado→motor arme bien la entrada en combinaciones y casos límite,
// incluido el que confundió al dueño (1 conductor, 0 pasajeros → NO es un error).
import { describe, it, expect } from "vitest";
import { buildSeed } from "../seed";
import { buildMatchInput, unlocatablePassengerLegIds } from "./store";
import { solveMatching, validateMatch } from "../engine/matching";
import { MockRoutingProvider } from "../engine/routing";
import type { AppState, EventDoc, Leg, Member, Org, Vehicle } from "./model";
import type { Feature, LatLng } from "../engine/types";

const provider = new MockRoutingProvider();
const BA: LatLng = { lat: -34.6037, lng: -58.4416 };
const at = (dLat: number, dLng: number): LatLng => ({ lat: BA.lat + dLat, lng: BA.lng + dLng });
const DEST: LatLng = at(-0.09, -0.06);

function veh(id: string, over: Partial<Vehicle> = {}): Vehicle {
  return { id, capacity: 4, features: [], smokeFree: false, ...over };
}
function member(id: string, over: Partial<Member> = {}): Member {
  return { id, name: id, vehicles: [], joinedISO: "2026-01-01T00:00:00.000Z", ...over };
}
function driverLeg(memberId: string, over: Partial<Leg> = {}): Leg {
  return {
    id: `leg-${memberId}-e1`,
    memberId,
    eventId: "e1",
    role: "driver",
    window: { start: 480, end: 540 },
    origin: at(0, 0),
    vehicleId: "v1",
    maxDetourMin: 30,
    ...over
  };
}
function paxLeg(memberId: string, over: Partial<Leg> = {}): Leg {
  return {
    id: `leg-${memberId}-e1`,
    memberId,
    eventId: "e1",
    role: "passenger",
    window: { start: 460, end: 560 },
    origin: at(0.005, 0.005),
    maxWalkMin: 10,
    needs: [],
    ...over
  };
}

/** AppState válido (settings del seed) con los miembros/legs/evento dados. meId = primer miembro. */
function stateWith(
  members: Member[],
  legs: Leg[],
  eventOver: Partial<EventDoc> = {},
  orgOver: Partial<Org> = {}
): AppState {
  const base = buildSeed();
  const org: Org = {
    id: "o1",
    name: "Club",
    joinCode: "AAAAAA",
    linkEnabled: false,
    memberIds: members.map((m) => m.id),
    adminIds: [members[0].id],
    meetingPoints: [],
    ...orgOver
  };
  const ev: EventDoc = {
    id: "e1",
    orgId: "o1",
    title: "Salida",
    dateISO: "2026-08-01T09:00:00.000Z",
    destination: DEST,
    visibility: "private",
    createdBy: members[0].id,
    ...eventOver
  };
  return { ...base, meId: members[0].id, orgs: [org], members, events: [ev], legs, assignments: {} };
}

async function solve(state: AppState) {
  const input = buildMatchInput(state, "e1");
  expect(input).not.toBeNull();
  const res = await solveMatching(input!, provider);
  const violations = await validateMatch(input!, res, provider);
  return { input: input!, res, violations };
}

describe("escenarios multiusuario: estado → buildMatchInput → motor", () => {
  it("1 conductor con auto y 0 pasajeros → 1 viaje sin pasajeros, sin errores (el caso del dueño)", async () => {
    const me = member("m0", { vehicles: [veh("v1", { capacity: 4 })] });
    const { input, res, violations } = await solve(stateWith([me], [driverLeg("m0")]));
    expect(input.drivers).toHaveLength(1);
    expect(input.passengers).toHaveLength(0);
    expect(res.rides).toHaveLength(1);
    expect(res.rides[0].passengerLegIds).toEqual([]);
    expect(res.unassigned).toEqual([]);
    expect(violations).toEqual([]);
  });

  it("conductor SIN vehículo en el garage → se excluye del cálculo (nunca 'conductor fantasma')", async () => {
    const noCar = member("m0", { vehicles: [] });
    const { input } = await solve(stateWith([noCar], [driverLeg("m0", { vehicleId: undefined })]));
    expect(input.drivers).toHaveLength(0);
  });

  it("2 conductores + 4 pasajeros factibles → todos con lugar", async () => {
    const members = [
      member("m0", { vehicles: [veh("v1", { capacity: 3 })] }),
      member("m1", { vehicles: [veh("v1", { capacity: 3 })] }),
      member("p2"),
      member("p3"),
      member("p4"),
      member("p5")
    ];
    const legs = [
      driverLeg("m0", { origin: at(0.01, 0.01) }),
      driverLeg("m1", { origin: at(-0.01, -0.01) }),
      paxLeg("p2", { origin: at(0.008, 0.008) }),
      paxLeg("p3", { origin: at(-0.008, -0.006) }),
      paxLeg("p4", { origin: at(0.004, -0.004) }),
      paxLeg("p5", { origin: at(-0.004, 0.006) })
    ];
    const { res, violations } = await solve(stateWith(members, legs));
    expect(res.stats.assigned).toBe(4);
    expect(res.unassigned).toEqual([]);
    expect(violations).toEqual([]);
  });

  it("capacidad total insuficiente → sobrantes 'sin asignar' por 'capacidad'", async () => {
    const members = [
      member("m0", { vehicles: [veh("v1", { capacity: 1 })] }),
      member("p1"),
      member("p2"),
      member("p3")
    ];
    const legs = [
      driverLeg("m0", { maxDetourMin: 60 }),
      paxLeg("p1"),
      paxLeg("p2"),
      paxLeg("p3")
    ];
    const { res } = await solve(stateWith(members, legs));
    expect(res.rides[0].passengerLegIds.length).toBeLessThanOrEqual(1);
    expect(res.unassigned.length).toBe(2);
    for (const u of res.unassigned) expect(u.reason).toBe("capacidad");
  });

  it("legs 'skip' (no voy) no entran al cálculo", async () => {
    const members = [member("m0", { vehicles: [veh("v1")] }), member("p1")];
    const legs = [
      driverLeg("m0"),
      { id: "leg-p1-e1", memberId: "p1", eventId: "e1", role: "skip" as const, window: { start: 0, end: 0 } }
    ];
    const { input } = await solve(stateWith(members, legs));
    expect(input.passengers).toHaveLength(0);
    expect(input.drivers).toHaveLength(1);
  });

  it("pasajero SIN origen ni casa → excluido del cálculo y listado como no-ubicable", async () => {
    const members = [member("m0", { vehicles: [veh("v1")] }), member("p1")];
    // pax sin origin y el miembro sin home → no se puede ubicar
    const legs = [driverLeg("m0"), paxLeg("p1", { origin: undefined })];
    const state = stateWith(members, legs);
    const { input } = await solve(state);
    expect(input.passengers).toHaveLength(0);
    expect(unlocatablePassengerLegIds(state, "e1")).toEqual(["leg-p1-e1"]);
  });

  it("pasajero sin origin PERO con casa → usa la casa como origen", async () => {
    const members = [
      member("m0", { vehicles: [veh("v1")] }),
      member("p1", { home: at(0.006, 0.004) })
    ];
    const legs = [driverLeg("m0"), paxLeg("p1", { origin: undefined })];
    const state = stateWith(members, legs);
    const { input } = await solve(state);
    expect(input.passengers).toHaveLength(1);
    expect(input.passengers[0].origin).toEqual(at(0.006, 0.004));
    expect(unlocatablePassengerLegIds(state, "e1")).toEqual([]);
  });

  it("garage con 2 autos: el leg elige el vehículo (capacidad y features correctas)", async () => {
    const me = member("m0", {
      vehicles: [veh("v1", { capacity: 2 }), veh("moto", { capacity: 5, features: ["bikes"] })]
    });
    const { input } = await solve(stateWith([me], [driverLeg("m0", { vehicleId: "moto" })]));
    expect(input.drivers).toHaveLength(1);
    expect(input.drivers[0].capacity).toBe(5);
    expect(input.drivers[0].features).toContain("bikes");
  });

  it("vehicleId inexistente → cae al primer vehículo del garage (no rompe)", async () => {
    const me = member("m0", { vehicles: [veh("v1", { capacity: 3 })] });
    const { input } = await solve(stateWith([me], [driverLeg("m0", { vehicleId: "no-existe" })]));
    expect(input.drivers).toHaveLength(1);
    expect(input.drivers[0].capacity).toBe(3);
  });

  it("necesidad silla de ruedas: solo entra al auto adaptado; si ninguno lo es, queda 'necesidades'", async () => {
    const withAdapted = [
      member("m0", { vehicles: [veh("v1", { capacity: 4, features: [] })] }),
      member("m1", { vehicles: [veh("v1", { capacity: 2, features: ["wheelchair"] as Feature[] })] }),
      member("p2")
    ];
    const legsA = [
      driverLeg("m0", { origin: at(0.01, 0.0) }),
      driverLeg("m1", { origin: at(0.0, 0.01) }),
      paxLeg("p2", { needs: ["wheelchair"], origin: at(0.004, 0.004) })
    ];
    const { res } = await solve(stateWith(withAdapted, legsA));
    const ride = res.rides.find((r) => r.passengerLegIds.includes("leg-p2-e1"));
    expect(ride?.driverLegId).toBe("leg-m1-e1"); // el adaptado

    // ningún auto apto → 'necesidades'
    const noneApt = [member("m0", { vehicles: [veh("v1")] }), member("p1")];
    const legsB = [driverLeg("m0"), paxLeg("p1", { needs: ["wheelchair"] })];
    const { res: res2 } = await solve(stateWith(noneApt, legsB));
    expect(res2.unassigned).toEqual([{ passengerLegId: "leg-p1-e1", reason: "necesidades" }]);
  });

  it("ventanas sin superposición → 'ventana'", async () => {
    const members = [member("m0", { vehicles: [veh("v1")] }), member("p1")];
    const legs = [
      driverLeg("m0", { window: { start: 480, end: 500 } }),
      paxLeg("p1", { window: { start: 700, end: 720 } })
    ];
    const { res } = await solve(stateWith(members, legs));
    expect(res.unassigned[0]?.reason).toBe("ventana");
  });

  it("evento sin ningún conductor (todos pasajeros) → 'sin_conductores'", async () => {
    const members = [member("m0"), member("p1")];
    const legs = [paxLeg("m0"), paxLeg("p1")];
    const { input, res } = await solve(stateWith(members, legs));
    expect(input.drivers).toHaveLength(0);
    for (const u of res.unassigned) expect(u.reason).toBe("sin_conductores");
    expect(res.unassigned.length).toBe(2);
  });

  it("legs de OTRO evento no contaminan el cálculo de este", async () => {
    const members = [member("m0", { vehicles: [veh("v1")] }), member("p1"), member("p2")];
    const legs = [
      driverLeg("m0"),
      paxLeg("p1"),
      // leg de p2 en otro evento: no debe aparecer en e1
      { ...paxLeg("p2"), id: "leg-p2-eX", eventId: "eX" }
    ];
    const { input } = await solve(stateWith(members, legs));
    expect(input.passengers.map((p) => p.id).sort()).toEqual(["leg-p1-e1"]);
  });

  it("preferencia de subgrupo desempata pero no descarta (blanda)", async () => {
    const members = [
      member("m0", { vehicles: [veh("v1", { capacity: 3 })], subgroup: "banda" }),
      member("m1", { vehicles: [veh("v1", { capacity: 3 })] }),
      member("p2", { subgroup: "banda" })
    ];
    const legs = [
      driverLeg("m0", { origin: at(0.004, 0.004) }),
      driverLeg("m1", { origin: at(0.004, 0.0042) }),
      paxLeg("p2", { origin: at(0.004, 0.0041), soft: { subgroup: "banda" } })
    ];
    const { res } = await solve(stateWith(members, legs));
    const ride = res.rides.find((r) => r.passengerLegIds.includes("leg-p2-e1"));
    expect(ride?.driverLegId).toBe("leg-m0-e1"); // el de su subgrupo
  });

  it("mezcla realista: 3 conductores (cap 2/3/4) + 9 pasajeros → asigna la mayoría, sin violaciones", async () => {
    const members: Member[] = [
      member("m0", { vehicles: [veh("v1", { capacity: 2 })] }),
      member("m1", { vehicles: [veh("v1", { capacity: 3 })] }),
      member("m2", { vehicles: [veh("v1", { capacity: 4 })] })
    ];
    const legs: Leg[] = [
      driverLeg("m0", { origin: at(0.02, 0.0), maxDetourMin: 35 }),
      driverLeg("m1", { origin: at(-0.02, 0.0), maxDetourMin: 35 }),
      driverLeg("m2", { origin: at(0.0, 0.02), maxDetourMin: 35 })
    ];
    for (let i = 0; i < 9; i++) {
      members.push(member(`p${i}`));
      legs.push(paxLeg(`p${i}`, { origin: at((i % 3) * 0.006 - 0.006, Math.floor(i / 3) * 0.006 - 0.006) }));
    }
    const { res, violations } = await solve(stateWith(members, legs));
    expect(violations).toEqual([]);
    // 9 asientos exactos para 9 pasajeros bien distribuidos → todos o casi todos
    expect(res.stats.assigned).toBeGreaterThanOrEqual(7);
    expect(res.stats.assigned + res.unassigned.length).toBe(9);
  });
});
