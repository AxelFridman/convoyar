import { describe, it, expect } from "vitest";
import { buildSeed } from "../seed";
import { buildMatchInput } from "../state/store";
import { solveMatching, validateMatch } from "../engine/matching";
import { MockRoutingProvider } from "../engine/routing";

describe("integración seed → store → motor", () => {
  it("la demo de fábrica resuelve sin violaciones y asigna a la mayoría", async () => {
    const s = buildSeed();
    expect(s.events.length).toBeGreaterThan(0);
    const ev = s.events[0];
    const input = buildMatchInput(s, ev.id);
    expect(input).not.toBeNull();
    expect(input!.drivers.length).toBeGreaterThan(2);
    expect(input!.passengers.length).toBeGreaterThan(5);

    const provider = new MockRoutingProvider();
    const result = await solveMatching(input!, provider);
    const violations = await validateMatch(input!, result, provider);

    expect(violations).toEqual([]);
    expect(result.rides.length).toBeGreaterThan(0);
    // al menos 70% asignados con los datos de fábrica
    expect(result.stats.assigned / result.stats.passengers).toBeGreaterThanOrEqual(0.7);

    // pasajeros con necesidad de silla de ruedas viajan en vehículo adaptado
    const byId = new Map(input!.passengers.map((p) => [p.id, p]));
    const drvById = new Map(input!.drivers.map((d) => [d.id, d]));
    for (const ride of result.rides) {
      const drv = drvById.get(ride.driverLegId)!;
      for (const pid of ride.passengerLegIds) {
        const pax = byId.get(pid)!;
        for (const need of pax.needs) {
          expect(drv.features).toContain(need);
        }
      }
    }

    // toda parada intermedia pertenece a un pasajero del viaje
    for (const ride of result.rides) {
      const set = new Set(ride.passengerLegIds);
      for (const st of ride.stops) {
        if (st.kind === "pickup" || st.kind === "dropoff") {
          expect(st.passengerLegId && set.has(st.passengerLegId)).toBe(true);
        }
      }
    }
  });

  it("PR-A2: el vehículo elegido en el leg define la capacidad que ve el motor", async () => {
    const s = buildSeed();
    const me = s.members.find((m) => m.id === "m0")!;
    const [auto, moto] = me.vehicles; // 3 y 2 asientos según el seed
    expect(auto.capacity).not.toBe(moto.capacity);
    // m0 como conductor del asado, una vez con el auto y otra con la moto.
    const legBase = { id: "leg-m0-ev1", memberId: "m0", eventId: "ev1", role: "driver" as const, window: { start: 690, end: 760 } };
    const withAuto = buildMatchInput(s, "ev1", [
      ...s.legs.filter((l) => l.memberId !== "m0"),
      { ...legBase, vehicleId: auto.id }
    ])!;
    const withMoto = buildMatchInput(s, "ev1", [
      ...s.legs.filter((l) => l.memberId !== "m0"),
      { ...legBase, vehicleId: moto.id }
    ])!;
    const capOf = (input: typeof withAuto) => input.drivers.find((d) => d.memberId === "m0")!.capacity;
    expect(capOf(withAuto)).toBe(auto.capacity);
    expect(capOf(withMoto)).toBe(moto.capacity);
  });
});
