import { describe, expect, it } from "vitest";
import { solveMatching, validateMatch, applyManualMove } from "./matching";
import { MockRoutingProvider } from "./routing";
import { mulberry32 } from "./geo";
import type { DriverLeg, MatchInput, PassengerLeg, LatLng } from "./types";

const provider = new MockRoutingProvider();

/** Coordenadas base: Buenos Aires. 0.01° lat ≈ 1.1 km. */
const BA: LatLng = { lat: -34.6037, lng: -58.4416 };
const at = (dLat: number, dLng: number): LatLng => ({ lat: BA.lat + dLat, lng: BA.lng + dLng });
const ASADO: LatLng = at(-0.09, -0.06); // destino común (la "quinta")

let seq = 0;
function mkDriver(over: Partial<DriverLeg> = {}): DriverLeg {
  seq++;
  return {
    id: `d${seq}`,
    memberId: `md${seq}`,
    vehicleId: `v${seq}`,
    origin: at(0, 0),
    destination: ASADO,
    window: { start: 480, end: 540 }, // 8:00–9:00
    capacity: 3,
    maxDetourMin: 25,
    features: [],
    ...over
  };
}
function mkPax(over: Partial<PassengerLeg> = {}): PassengerLeg {
  seq++;
  return {
    id: `p${seq}`,
    memberId: `mp${seq}`,
    origin: at(0.005, 0.005),
    destination: ASADO,
    window: { start: 470, end: 560 },
    maxWalkMin: 10,
    needs: [],
    ...over
  };
}

async function assertValid(input: MatchInput, result: Awaited<ReturnType<typeof solveMatching>>) {
  const violations = await validateMatch(input, result, provider);
  expect(violations).toEqual([]);
}

describe("motor de matching", () => {
  it("asigna a todos en un caso simple y factible", async () => {
    const input: MatchInput = {
      drivers: [mkDriver({ capacity: 3 })],
      passengers: [mkPax(), mkPax({ origin: at(0.008, -0.004) }), mkPax({ origin: at(-0.006, 0.007) })]
    };
    const res = await solveMatching(input, provider);
    expect(res.unassigned).toEqual([]);
    expect(res.stats.assigned).toBe(3);
    expect(res.rides[0].passengerLegIds).toHaveLength(3);
    // paradas ordenadas: cada pickup antes que su dropoff
    const ride = res.rides[0];
    for (const pid of ride.passengerLegIds) {
      const pi = ride.stops.findIndex((s) => s.kind === "pickup" && s.passengerLegId === pid);
      const di = ride.stops.findIndex((s) => s.kind === "dropoff" && s.passengerLegId === pid);
      expect(pi).toBeGreaterThan(0);
      expect(di).toBeGreaterThan(pi);
    }
    await assertValid(input, res);
  });

  it("nunca supera la capacidad y reporta 'capacidad' cuando los autos están llenos", async () => {
    const input: MatchInput = {
      drivers: [mkDriver({ capacity: 2, maxDetourMin: 60 })],
      passengers: [mkPax(), mkPax(), mkPax(), mkPax()]
    };
    const res = await solveMatching(input, provider);
    expect(res.rides[0].passengerLegIds.length).toBeLessThanOrEqual(2);
    expect(res.unassigned).toHaveLength(2);
    for (const u of res.unassigned) expect(u.reason).toBe("capacidad");
    await assertValid(input, res);
  });

  it("respeta necesidades especiales: silla de ruedas solo en vehículo adaptado", async () => {
    const wheelchairPax = mkPax({ needs: ["wheelchair"], origin: at(0.004, 0.002) });
    const input: MatchInput = {
      drivers: [
        mkDriver({ features: [], capacity: 4 }),
        mkDriver({ features: ["wheelchair"], capacity: 1, origin: at(0.01, 0.01) })
      ],
      passengers: [wheelchairPax, mkPax(), mkPax()]
    };
    const res = await solveMatching(input, provider);
    const adapted = res.rides.find((r) => r.passengerLegIds.includes(wheelchairPax.id));
    expect(adapted).toBeDefined();
    expect(input.drivers.find((d) => d.id === adapted!.driverLegId)!.features).toContain("wheelchair");
    await assertValid(input, res);
  });

  it("deja sin asignar con razón 'necesidades' si ningún vehículo es apto", async () => {
    const input: MatchInput = {
      drivers: [mkDriver({ features: [] })],
      passengers: [mkPax({ needs: ["wheelchair"] })]
    };
    const res = await solveMatching(input, provider);
    expect(res.unassigned).toEqual([{ passengerLegId: input.passengers[0].id, reason: "necesidades" }]);
  });

  it("deja sin asignar con razón 'ventana' si no hay superposición horaria", async () => {
    const input: MatchInput = {
      drivers: [mkDriver({ window: { start: 480, end: 500 } })],
      passengers: [mkPax({ window: { start: 700, end: 720 } })] // 11:40–12:00, imposible
    };
    const res = await solveMatching(input, provider);
    expect(res.unassigned[0]?.reason).toBe("ventana");
  });

  it("deja sin asignar con razón 'desvío' si queda demasiado lejos de toda ruta", async () => {
    const input: MatchInput = {
      drivers: [mkDriver({ maxDetourMin: 5 })],
      passengers: [mkPax({ origin: at(0.25, 0.25) })] // ~35 km fuera de ruta
    };
    const res = await solveMatching(input, provider);
    expect(res.unassigned[0]?.reason).toBe("desvio");
  });

  it("sin conductores en el evento → razón 'sin_conductores'", async () => {
    const res = await solveMatching({ drivers: [], passengers: [mkPax()] }, provider);
    expect(res.unassigned[0]?.reason).toBe("sin_conductores");
  });

  it("respeta el radio de caminata con puntos de encuentro (sin puerta a puerta)", async () => {
    const mp = { id: "mp1", name: "Estación", pos: at(0.003, 0.003) };
    const near = mkPax({ origin: at(0.004, 0.003), maxWalkMin: 8 });
    const far = mkPax({ origin: at(0.06, 0.06), maxWalkMin: 5 }); // ~9 km del punto
    const input: MatchInput = {
      drivers: [mkDriver({ capacity: 4, maxDetourMin: 40 })],
      passengers: [near, far],
      meetingPoints: [mp],
      options: { doorToDoor: false }
    };
    const res = await solveMatching(input, provider);
    expect(res.rides[0].passengerLegIds).toContain(near.id);
    const pickup = res.rides[0].stops.find((s) => s.kind === "pickup" && s.passengerLegId === near.id)!;
    expect(pickup.meetingPointId).toBe("mp1");
    expect(pickup.walkMin!).toBeLessThanOrEqual(near.maxWalkMin);
    expect(res.unassigned).toEqual([{ passengerLegId: far.id, reason: "caminata" }]);
    await assertValid(input, res);
  });

  it("consolida pasajeros cercanos en el mismo punto de encuentro", async () => {
    const mp = { id: "mpA", name: "Esquina club", pos: at(0.01, 0.01) };
    const a = mkPax({ origin: at(0.011, 0.0095), maxWalkMin: 10 });
    const b = mkPax({ origin: at(0.009, 0.0108), maxWalkMin: 10 });
    const input: MatchInput = {
      drivers: [mkDriver({ capacity: 3, maxDetourMin: 30 })],
      passengers: [a, b],
      meetingPoints: [mp]
    };
    const res = await solveMatching(input, provider);
    const pickups = res.rides[0].stops.filter((s) => s.kind === "pickup");
    expect(pickups).toHaveLength(2);
    for (const s of pickups) expect(s.meetingPointId).toBe("mpA");
    await assertValid(input, res);
  });

  it("las horas de recogida caen dentro de la ventana de cada pasajero", async () => {
    const tight = mkPax({ window: { start: 505, end: 515 }, origin: at(0.01, -0.01) });
    const input: MatchInput = {
      drivers: [mkDriver({ window: { start: 480, end: 540 }, maxDetourMin: 40 })],
      passengers: [tight, mkPax()]
    };
    const res = await solveMatching(input, provider);
    const pickup = res.rides[0].stops.find((s) => s.passengerLegId === tight.id && s.kind === "pickup");
    expect(pickup).toBeDefined();
    expect(pickup!.etaMin).toBeGreaterThanOrEqual(505 - 0.01);
    expect(pickup!.etaMin).toBeLessThanOrEqual(515 + 0.01);
    await assertValid(input, res);
  });

  it("escala: evento de 90 pasajeros + 20 conductores en <5s, sin violaciones", async () => {
    const rnd = mulberry32(42);
    const drivers: DriverLeg[] = [];
    for (let i = 0; i < 20; i++) {
      drivers.push(
        mkDriver({
          origin: at((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12),
          capacity: 3 + Math.floor(rnd() * 2), // 3–4
          maxDetourMin: 22 + Math.floor(rnd() * 16), // 22–37
          window: { start: 470 + Math.floor(rnd() * 20), end: 540 }
        })
      );
    }
    const passengers: PassengerLeg[] = [];
    for (let i = 0; i < 90; i++) {
      passengers.push(
        mkPax({
          origin: at((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12),
          window: { start: 465, end: 570 },
          maxWalkMin: 12
        })
      );
    }
    const input: MatchInput = { drivers, passengers };
    const t0 = Date.now();
    const res = await solveMatching(input, provider);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(5000);
    const seats = drivers.reduce((a, d) => a + d.capacity, 0);
    expect(res.stats.assigned).toBeGreaterThanOrEqual(Math.min(seats, 90) * 0.75);
    expect(res.stats.assigned + res.unassigned.length).toBe(90);
    await assertValid(input, res);
  });

  it("recálculo incremental: cancela un conductor y conserva las asignaciones del resto", async () => {
    const drivers = [
      mkDriver({ origin: at(0.02, 0.02), capacity: 3, maxDetourMin: 35 }),
      mkDriver({ origin: at(-0.02, -0.01), capacity: 3, maxDetourMin: 35 }),
      mkDriver({ origin: at(0.0, 0.03), capacity: 3, maxDetourMin: 35 })
    ];
    const passengers = Array.from({ length: 8 }, (_, i) =>
      mkPax({ origin: at((i % 4) * 0.008 - 0.012, Math.floor(i / 4) * 0.01 - 0.005) })
    );
    const input: MatchInput = { drivers, passengers };
    const first = await solveMatching(input, provider);
    await assertValid(input, first);

    const canceled = drivers[0].id;
    const input2: MatchInput = {
      drivers: drivers.filter((d) => d.id !== canceled),
      passengers,
      options: { warmStart: first }
    };
    const second = await solveMatching(input2, provider);
    await assertValid(input2, second);

    // Los pasajeros de los conductores que siguen deben quedar donde estaban.
    for (const prev of first.rides) {
      if (prev.driverLegId === canceled) continue;
      const now = second.rides.find((r) => r.driverLegId === prev.driverLegId)!;
      for (const pid of prev.passengerLegIds) expect(now.passengerLegIds).toContain(pid);
    }
  });

  it("override manual del admin: forzar a un auto lleno marca la violación y el viaje como manual", async () => {
    const input: MatchInput = {
      drivers: [mkDriver({ capacity: 1, maxDetourMin: 60 }), mkDriver({ capacity: 1, maxDetourMin: 60, origin: at(0.015, 0.015) })],
      passengers: [mkPax(), mkPax({ origin: at(0.012, 0.012) })]
    };
    const res = await solveMatching(input, provider);
    expect(res.unassigned).toEqual([]);
    const [rideA] = res.rides;
    const moving = res.rides[1].passengerLegIds[0];
    const { result: forced, violations } = await applyManualMove(input, res, moving, rideA.driverLegId, provider);
    const target = forced.rides.find((r) => r.driverLegId === rideA.driverLegId)!;
    expect(target.passengerLegIds).toContain(moving);
    expect(target.passengerLegIds).toHaveLength(2);
    expect(target.manual).toBe(true);
    expect(violations.some((v) => v.code === "capacidad" && v.rideDriverLegId === rideA.driverLegId)).toBe(true);
  });

  it("override manual: mover a 'sin asignar' con razón 'manual'", async () => {
    const input: MatchInput = { drivers: [mkDriver()], passengers: [mkPax()] };
    const res = await solveMatching(input, provider);
    const pid = res.rides[0].passengerLegIds[0];
    const { result: out } = await applyManualMove(input, res, pid, null, provider);
    expect(out.rides[0].passengerLegIds).toEqual([]);
    expect(out.unassigned).toEqual([{ passengerLegId: pid, reason: "manual" }]);
  });

  it("preferencias blandas desempatan pero nunca descartan", async () => {
    // Dos autos equivalentes; el pasajero prefiere su subgrupo → va con él.
    const dA = mkDriver({ origin: at(0.004, 0.004), prefs: { subgroup: "banda" } });
    const dB = mkDriver({ origin: at(0.004, 0.0042) });
    const p = mkPax({ origin: at(0.004, 0.0041), prefs: { subgroup: "banda" } });
    const res = await solveMatching({ drivers: [dA, dB], passengers: [p] }, provider);
    const ride = res.rides.find((r) => r.passengerLegIds.includes(p.id))!;
    expect(ride.driverLegId).toBe(dA.id);

    // Si el único auto NO es de su subgrupo, igual lo asigna (blanda ≠ dura).
    const res2 = await solveMatching({ drivers: [dB], passengers: [p] }, provider);
    expect(res2.stats.assigned).toBe(1);
  });
});
