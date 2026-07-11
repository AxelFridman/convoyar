/**
 * Caravana — Solver de matching (CVRPTW liviano).
 *
 * Estrategia (spec §5):
 *  1. Una sola matriz de tiempos/distancias por evento (mock u OSRM Table).
 *  2. Inserción golosa: pasajeros más restringidos primero, cada uno entra en
 *     la posición de menor costo marginal de la ruta de algún conductor.
 *  3. Mejora local: "rescate" de no asignados (relocalizando a otro pasajero)
 *     y pulido de desvío total.
 *
 * Restricciones DURAS (nunca se violan): capacidad simultánea, desvío máximo
 * del conductor, ventanas horarias, caminata máxima del pasajero, necesidades
 * especiales ⊆ características del vehículo.
 * Preferencias BLANDAS (solo desempatan): subgrupo, libre de humo.
 */
import type {
  DriverLeg,
  Feature,
  LatLng,
  MatchInput,
  MatchResult,
  MeetingPoint,
  PassengerLeg,
  Ride,
  RideStop,
  Unassigned,
  UnassignedReason,
  Violation
} from "./types";
import type { RoutingProvider, RouteMatrix } from "./routing";
import { walkMinutes } from "./geo";

const EPS = 1e-6;

/* ------------------------------------------------------------------ */
/* Registro de puntos + métrica                                        */
/* ------------------------------------------------------------------ */

class PointRegistry {
  points: LatLng[] = [];
  private index = new Map<string, number>();

  idx(p: LatLng): number {
    const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    let i = this.index.get(key);
    if (i === undefined) {
      i = this.points.length;
      this.points.push(p);
      this.index.set(key, i);
    }
    return i;
  }
}

interface Metric {
  t(i: number, j: number): number;
  km(i: number, j: number): number;
}

function makeMetric(m: RouteMatrix): Metric {
  return {
    t: (i, j) => (i === j ? 0 : m.minutes[i][j]),
    km: (i, j) => (i === j ? 0 : m.km[i][j])
  };
}

/* ------------------------------------------------------------------ */
/* Estructuras de trabajo                                              */
/* ------------------------------------------------------------------ */

interface PickupCandidate {
  ptIdx: number;
  point: LatLng;
  meetingPointId?: string;
  walkMin: number;
}

interface InnerStop {
  kind: "pickup" | "dropoff";
  passengerId: string;
  ptIdx: number;
  point: LatLng;
  meetingPointId?: string;
  walkMin?: number;
}

interface WorkRide {
  driver: DriverLeg;
  oIdx: number;
  dIdx: number;
  baseMin: number;
  baseKm: number;
  stops: InnerStop[];
}

interface InsertionPlan {
  rideIdx: number;
  pickupPos: number;
  dropoffPos: number; // posición en el array YA con el pickup insertado
  candidate: PickupCandidate;
  cost: number; // costo con bonus blandos aplicados (para elegir)
  deltaMin: number; // minutos reales agregados a la ruta
}

interface EvalFail {
  reason: Exclude<UnassignedReason, "sin_conductores" | "manual">;
}

/* ------------------------------------------------------------------ */
/* Helpers de ruta                                                     */
/* ------------------------------------------------------------------ */

function routeOffsets(
  ride: Pick<WorkRide, "oIdx" | "dIdx">,
  stops: InnerStop[],
  metric: Metric
): { offsets: number[]; routeMin: number; routeKm: number } {
  const offsets: number[] = [];
  let tAcc = 0;
  let kmAcc = 0;
  let prev = ride.oIdx;
  for (const s of stops) {
    tAcc += metric.t(prev, s.ptIdx);
    kmAcc += metric.km(prev, s.ptIdx);
    offsets.push(tAcc);
    prev = s.ptIdx;
  }
  tAcc += metric.t(prev, ride.dIdx);
  kmAcc += metric.km(prev, ride.dIdx);
  return { offsets, routeMin: tAcc, routeKm: kmAcc };
}

function occupancyOk(stops: InnerStop[], capacity: number): boolean {
  let cur = 0;
  for (const s of stops) {
    cur += s.kind === "pickup" ? 1 : -1;
    if (cur > capacity) return false;
  }
  return true;
}

/** Rango factible de hora de salida del conductor dado el orden de paradas. */
function departureRange(
  driver: DriverLeg,
  stops: InnerStop[],
  offsets: number[],
  paxById: Map<string, PassengerLeg>
): { lo: number; hi: number } | null {
  let lo = driver.window.start;
  let hi = driver.window.end;
  for (let k = 0; k < stops.length; k++) {
    const s = stops[k];
    if (s.kind !== "pickup") continue;
    const q = paxById.get(s.passengerId)!;
    lo = Math.max(lo, q.window.start - offsets[k]);
    hi = Math.min(hi, q.window.end - offsets[k]);
  }
  return lo <= hi + EPS ? { lo, hi } : null;
}

function pickupCandidates(
  p: PassengerLeg,
  meetingPoints: MeetingPoint[],
  doorToDoor: boolean,
  reg: PointRegistry
): PickupCandidate[] {
  const out: PickupCandidate[] = [];
  for (const mp of meetingPoints) {
    const w = walkMinutes(p.origin, mp.pos);
    if (w <= p.maxWalkMin + EPS) {
      out.push({ ptIdx: reg.idx(mp.pos), point: mp.pos, meetingPointId: mp.id, walkMin: w });
    }
  }
  out.sort((a, b) => a.walkMin - b.walkMin);
  if (doorToDoor) out.push({ ptIdx: reg.idx(p.origin), point: p.origin, walkMin: 0 });
  return out;
}

function featuresOk(needs: Feature[], features: Feature[]): boolean {
  return needs.every((n) => features.includes(n));
}

function softBonus(p: PassengerLeg, d: DriverLeg): number {
  let b = 0;
  if (p.prefs?.subgroup && p.prefs.subgroup === d.prefs?.subgroup) b += 1.0;
  if (p.prefs?.smokeFree && d.prefs?.smokeFree) b += 0.5;
  return b;
}

/* ------------------------------------------------------------------ */
/* Evaluación de inserción                                             */
/* ------------------------------------------------------------------ */

function evaluateInsertion(
  p: PassengerLeg,
  candidates: PickupCandidate[],
  rides: WorkRide[],
  metric: Metric,
  paxById: Map<string, PassengerLeg>,
  reg: PointRegistry
): { best: InsertionPlan | null; fails: EvalFail["reason"][] } {
  let best: InsertionPlan | null = null;
  const fails: EvalFail["reason"][] = [];
  const dropIdx = reg.idx(p.destination);

  for (let r = 0; r < rides.length; r++) {
    const ride = rides[r];
    if (!featuresOk(p.needs, ride.driver.features)) {
      fails.push("necesidades");
      continue;
    }
    const { routeMin: currentMin } = routeOffsets(ride, ride.stops, metric);
    const isFull = ridePassengerIds(ride).length >= ride.driver.capacity;
    let sawCap = false;
    let sawDetour = false;
    let sawWindow = false;
    let foundHere = false;

    for (const cand of candidates) {
      const n = ride.stops.length;
      for (let i = 0; i <= n; i++) {
        const withPickup = ride.stops.slice();
        const pickupStop: InnerStop = {
          kind: "pickup",
          passengerId: p.id,
          ptIdx: cand.ptIdx,
          point: cand.point,
          meetingPointId: cand.meetingPointId,
          walkMin: cand.walkMin
        };
        withPickup.splice(i, 0, pickupStop);
        for (let j = i + 1; j <= n + 1; j++) {
          const trial = withPickup.slice();
          trial.splice(j, 0, {
            kind: "dropoff",
            passengerId: p.id,
            ptIdx: dropIdx,
            point: p.destination
          });
          if (!occupancyOk(trial, ride.driver.capacity)) {
            sawCap = true;
            continue;
          }
          const { offsets, routeMin } = routeOffsets(ride, trial, metric);
          const detour = routeMin - ride.baseMin;
          if (detour > ride.driver.maxDetourMin + EPS) {
            sawDetour = true;
            continue;
          }
          if (!departureRange(ride.driver, trial, offsets, paxById)) {
            sawWindow = true;
            continue;
          }
          const deltaMin = routeMin - currentMin;
          const cost =
            deltaMin +
            cand.walkMin * 0.05 -
            (cand.meetingPointId ? 0.5 : 0) -
            softBonus(p, ride.driver) * 0.75;
          if (!best || cost < best.cost - EPS) {
            best = { rideIdx: r, pickupPos: i, dropoffPos: j, candidate: cand, cost, deltaMin };
          }
          foundHere = true;
        }
      }
    }
    if (!foundHere) {
      if (isFull && sawCap) fails.push("capacidad");
      else if (sawDetour) fails.push("desvio");
      else if (sawWindow) fails.push("ventana");
      else if (sawCap) fails.push("capacidad");
      else fails.push("desvio");
    }
  }
  return { best, fails };
}

function applyInsertion(ride: WorkRide, p: PassengerLeg, plan: InsertionPlan, reg: PointRegistry) {
  const pickup: InnerStop = {
    kind: "pickup",
    passengerId: p.id,
    ptIdx: plan.candidate.ptIdx,
    point: plan.candidate.point,
    meetingPointId: plan.candidate.meetingPointId,
    walkMin: plan.candidate.walkMin
  };
  ride.stops.splice(plan.pickupPos, 0, pickup);
  ride.stops.splice(plan.dropoffPos, 0, {
    kind: "dropoff",
    passengerId: p.id,
    ptIdx: reg.idx(p.destination),
    point: p.destination
  });
}

function removePassenger(ride: WorkRide, passengerId: string) {
  ride.stops = ride.stops.filter((s) => s.passengerId !== passengerId);
}

function ridePassengerIds(ride: WorkRide): string[] {
  const ids: string[] = [];
  for (const s of ride.stops) if (s.kind === "pickup") ids.push(s.passengerId);
  return ids;
}

function pickReason(fails: EvalFail["reason"][]): UnassignedReason {
  if (fails.length === 0) return "desvio";
  const counts = new Map<string, number>();
  for (const f of fails) counts.set(f, (counts.get(f) ?? 0) + 1);
  const order: UnassignedReason[] = ["capacidad", "desvio", "ventana", "necesidades", "caminata"];
  let bestReason: UnassignedReason = fails[0];
  let bestScore = -1;
  for (const r of order) {
    const c = counts.get(r) ?? 0;
    if (c > bestScore) {
      bestScore = c;
      bestReason = r;
    }
  }
  return bestReason;
}

/* ------------------------------------------------------------------ */
/* API principal                                                       */
/* ------------------------------------------------------------------ */

export async function solveMatching(
  input: MatchInput,
  provider: RoutingProvider
): Promise<MatchResult> {
  const t0 = Date.now();
  const doorToDoor = input.options?.doorToDoor ?? true;
  const passes = input.options?.improvementPasses ?? 2;
  const meetingPoints = input.meetingPoints ?? [];
  const paxById = new Map(input.passengers.map((p) => [p.id, p]));

  // 1. Registrar puntos y pedir UNA matriz.
  const reg = new PointRegistry();
  const driverIdx = input.drivers.map((d) => ({ o: reg.idx(d.origin), d: reg.idx(d.destination) }));
  const paxCandidates = new Map<string, PickupCandidate[]>();
  for (const p of input.passengers) {
    reg.idx(p.origin);
    reg.idx(p.destination);
    paxCandidates.set(p.id, pickupCandidates(p, meetingPoints, doorToDoor, reg));
  }
  const matrix = await provider.matrix(reg.points);
  const metric = makeMetric(matrix);

  // 2. Rutas de trabajo (una por conductor).
  const rides: WorkRide[] = input.drivers.map((drv, k) => ({
    driver: drv,
    oIdx: driverIdx[k].o,
    dIdx: driverIdx[k].d,
    baseMin: metric.t(driverIdx[k].o, driverIdx[k].d),
    baseKm: metric.km(driverIdx[k].o, driverIdx[k].d),
    stops: []
  }));
  const rideByDriverLeg = new Map(rides.map((r, i) => [r.driver.id, i]));

  // 2b. Warm start: re-ubicar primero a quienes ya estaban asignados (recálculo incremental).
  const pool = new Set(input.passengers.map((p) => p.id));
  const warm = input.options?.warmStart;
  if (warm) {
    for (const prev of warm.rides) {
      const rIdx = rideByDriverLeg.get(prev.driverLegId);
      if (rIdx === undefined) continue;
      for (const pid of prev.passengerLegIds) {
        const p = paxById.get(pid);
        if (!p || !pool.has(pid)) continue;
        const cands = paxCandidates.get(pid)!;
        if (cands.length === 0) continue;
        const { best } = evaluateInsertion(p, cands, [rides[rIdx]], metric, paxById, reg);
        if (best) {
          applyInsertion(rides[rIdx], p, { ...best, rideIdx: rIdx }, reg);
          pool.delete(pid);
        }
      }
    }
  }

  // 3. Orden: más restringidos primero.
  const remaining = input.passengers.filter((p) => pool.has(p.id));
  const roughCount = new Map<string, number>();
  for (const p of remaining) {
    const cands = paxCandidates.get(p.id)!;
    let c = 0;
    if (cands.length > 0) {
      const bestPick = cands[0];
      const dropIdx = reg.idx(p.destination);
      for (let k = 0; k < rides.length; k++) {
        const r = rides[k];
        if (!featuresOk(p.needs, r.driver.features)) continue;
        const alone =
          metric.t(r.oIdx, bestPick.ptIdx) +
          metric.t(bestPick.ptIdx, dropIdx) +
          metric.t(dropIdx, r.dIdx) -
          r.baseMin;
        if (alone <= r.driver.maxDetourMin + EPS) c++;
      }
    }
    roughCount.set(p.id, c);
  }
  remaining.sort((a, b) => {
    const ca = roughCount.get(a.id)!;
    const cb = roughCount.get(b.id)!;
    if (ca !== cb) return ca - cb;
    const wa = a.window.end - a.window.start;
    const wb = b.window.end - b.window.start;
    if (wa !== wb) return wa - wb;
    return a.id < b.id ? -1 : 1;
  });

  // 4. Inserción golosa.
  const unassignedReason = new Map<string, UnassignedReason>();
  for (const p of remaining) {
    const cands = paxCandidates.get(p.id)!;
    if (input.drivers.length === 0) {
      unassignedReason.set(p.id, "sin_conductores");
      continue;
    }
    if (cands.length === 0) {
      unassignedReason.set(p.id, "caminata");
      continue;
    }
    const { best, fails } = evaluateInsertion(p, cands, rides, metric, paxById, reg);
    if (best) {
      applyInsertion(rides[best.rideIdx], p, best, reg);
    } else {
      unassignedReason.set(p.id, pickReason(fails));
    }
  }

  // 5. Mejora local.
  for (let pass = 0; pass < passes; pass++) {
    let improved = false;

    // 5a. Rescate: intentar meter a un no-asignado moviendo a otro pasajero.
    for (const pid of Array.from(unassignedReason.keys())) {
      const p = paxById.get(pid)!;
      const cands = paxCandidates.get(pid)!;
      if (cands.length === 0) continue;
      let placed = false;
      for (let r = 0; r < rides.length && !placed; r++) {
        const ride = rides[r];
        if (!featuresOk(p.needs, ride.driver.features)) continue;
        for (const qid of ridePassengerIds(ride)) {
          const savedStops = ride.stops.slice();
          removePassenger(ride, qid);
          const { best: bestP } = evaluateInsertion(p, cands, [ride], metric, paxById, reg);
          if (!bestP) {
            ride.stops = savedStops;
            continue;
          }
          applyInsertion(ride, p, { ...bestP, rideIdx: r }, reg);
          // Reinsertar q en cualquier lado (incluido el mismo auto).
          const q = paxById.get(qid)!;
          const qc = paxCandidates.get(qid)!;
          const { best: bestQ } = evaluateInsertion(q, qc, rides, metric, paxById, reg);
          if (bestQ) {
            applyInsertion(rides[bestQ.rideIdx], q, bestQ, reg);
            unassignedReason.delete(pid);
            placed = true;
            improved = true;
            break;
          }
          ride.stops = savedStops;
        }
      }
    }

    // 5b. Pulido: mover pasajeros si baja el tiempo total de ruta.
    for (const ride of rides) {
      for (const qid of ridePassengerIds(ride)) {
        if (!ride.stops.some((s) => s.passengerId === qid)) continue; // ya fue movido
        const q = paxById.get(qid)!;
        const qc = paxCandidates.get(qid)!;
        const before = rides.reduce((acc, r) => acc + routeOffsets(r, r.stops, metric).routeMin, 0);
        const savedStops = ride.stops.slice();
        removePassenger(ride, qid);
        const { best } = evaluateInsertion(q, qc, rides, metric, paxById, reg);
        if (!best) {
          ride.stops = savedStops;
          continue;
        }
        const trialRide = rides[best.rideIdx];
        const savedTarget = trialRide.stops.slice();
        applyInsertion(trialRide, q, best, reg);
        const after = rides.reduce((acc, r) => acc + routeOffsets(r, r.stops, metric).routeMin, 0);
        if (after < before - 0.2) {
          improved = true;
        } else {
          trialRide.stops = savedTarget;
          ride.stops = savedStops;
        }
      }
    }

    if (!improved) break;
  }

  // 6. Construir resultado.
  const outRides: Ride[] = rides.map((r) => buildRide(r, metric, paxById));
  const unassigned: Unassigned[] = Array.from(unassignedReason.entries()).map(
    ([passengerLegId, reason]) => ({ passengerLegId, reason })
  );

  const assignedIds = new Set(outRides.flatMap((r) => r.passengerLegIds));
  let paxKm = 0;
  for (const p of input.passengers) {
    if (assignedIds.has(p.id)) paxKm += metric.km(reg.idx(p.origin), reg.idx(p.destination));
  }
  const used = outRides.filter((r) => r.passengerLegIds.length > 0);
  const totalDetour = outRides.reduce((a, r) => a + r.detourMin, 0);

  return {
    rides: outRides,
    unassigned,
    stats: {
      passengers: input.passengers.length,
      assigned: assignedIds.size,
      drivers: input.drivers.length,
      driversUsed: used.length,
      totalDetourMin: totalDetour,
      avgDetourMin: used.length ? totalDetour / used.length : 0,
      passengerDirectKm: paxKm,
      co2SavedKg: paxKm * 0.13,
      computeMs: Date.now() - t0
    }
  };
}

function buildRide(r: WorkRide, metric: Metric, paxById: Map<string, PassengerLeg>): Ride {
  const { offsets, routeMin, routeKm } = routeOffsets(r, r.stops, metric);
  const range = departureRange(r.driver, r.stops, offsets, paxById);
  const departure = range ? range.lo : r.driver.window.start;
  const stops: RideStop[] = [
    { kind: "start", point: r.driver.origin, offsetMin: 0, etaMin: departure }
  ];
  r.stops.forEach((s, k) => {
    stops.push({
      kind: s.kind,
      point: s.point,
      offsetMin: offsets[k],
      etaMin: departure + offsets[k],
      passengerLegId: s.passengerId,
      meetingPointId: s.meetingPointId,
      walkMin: s.walkMin
    });
  });
  stops.push({
    kind: "end",
    point: r.driver.destination,
    offsetMin: routeMin,
    etaMin: departure + routeMin
  });
  return {
    driverLegId: r.driver.id,
    passengerLegIds: ridePassengerIds(r),
    stops,
    departureMin: departure,
    baseMin: r.baseMin,
    routeMin,
    detourMin: routeMin - r.baseMin,
    baseKm: r.baseKm,
    routeKm
  };
}

/* ------------------------------------------------------------------ */
/* Validación (tests + override manual del admin)                      */
/* ------------------------------------------------------------------ */

export async function validateMatch(
  input: MatchInput,
  result: MatchResult,
  provider: RoutingProvider
): Promise<Violation[]> {
  const reg = new PointRegistry();
  const allPts: LatLng[] = [];
  const collect = (p: LatLng) => {
    reg.idx(p);
  };
  input.drivers.forEach((d) => {
    collect(d.origin);
    collect(d.destination);
  });
  input.passengers.forEach((p) => {
    collect(p.origin);
    collect(p.destination);
  });
  (input.meetingPoints ?? []).forEach((m) => collect(m.pos));
  result.rides.forEach((r) => r.stops.forEach((s) => collect(s.point)));
  void allPts;
  const metric = makeMetric(await provider.matrix(reg.points));

  const violations: Violation[] = [];
  const driversById = new Map(input.drivers.map((d) => [d.id, d]));
  const paxById = new Map(input.passengers.map((p) => [p.id, p]));

  for (const ride of result.rides) {
    const drv = driversById.get(ride.driverLegId);
    if (!drv) continue;
    // capacidad simultánea
    let cur = 0;
    for (const s of ride.stops) {
      if (s.kind === "pickup") cur++;
      if (s.kind === "dropoff") cur--;
      if (cur > drv.capacity) {
        violations.push({
          rideDriverLegId: ride.driverLegId,
          code: "capacidad",
          detail: `${cur} a bordo > capacidad ${drv.capacity}`
        });
        break;
      }
    }
    // desvío recomputado
    let t = 0;
    let prev = reg.idx(drv.origin);
    for (const s of ride.stops.slice(1)) {
      const idx = reg.idx(s.point);
      t += metric.t(prev, idx);
      prev = idx;
    }
    const base = metric.t(reg.idx(drv.origin), reg.idx(drv.destination));
    if (t - base > drv.maxDetourMin + 0.01) {
      violations.push({
        rideDriverLegId: ride.driverLegId,
        code: "desvio",
        detail: `desvío ${(t - base).toFixed(1)} min > máx ${drv.maxDetourMin} min`
      });
    }
    // ventanas + necesidades + caminata
    if (ride.departureMin < drv.window.start - 0.01 || ride.departureMin > drv.window.end + 0.01) {
      violations.push({
        rideDriverLegId: ride.driverLegId,
        code: "ventana",
        detail: "salida fuera de la ventana del conductor"
      });
    }
    for (const s of ride.stops) {
      if (s.kind !== "pickup" || !s.passengerLegId) continue;
      const p = paxById.get(s.passengerLegId);
      if (!p) continue;
      if (s.etaMin < p.window.start - 0.01 || s.etaMin > p.window.end + 0.01) {
        violations.push({
          rideDriverLegId: ride.driverLegId,
          code: "ventana",
          detail: `recogida de ${p.id} fuera de su ventana`
        });
      }
      if (!featuresOk(p.needs, drv.features)) {
        violations.push({
          rideDriverLegId: ride.driverLegId,
          code: "necesidades",
          detail: `vehículo no cubre necesidades de ${p.id}`
        });
      }
      const w = s.walkMin ?? walkMinutes(p.origin, s.point);
      if (w > p.maxWalkMin + 0.01) {
        violations.push({
          rideDriverLegId: ride.driverLegId,
          code: "caminata",
          detail: `caminata ${w.toFixed(1)} min > máx ${p.maxWalkMin} min`
        });
      }
    }
  }
  return violations;
}

/**
 * Override manual del admin: mueve un pasajero a un conductor específico
 * (o a "sin asignar" si targetDriverLegId es null). No aplica restricciones
 * duras — devuelve las violaciones para que la UI avise (spec §9).
 */
export async function applyManualMove(
  input: MatchInput,
  result: MatchResult,
  passengerLegId: string,
  targetDriverLegId: string | null,
  provider: RoutingProvider
): Promise<{ result: MatchResult; violations: Violation[] }> {
  const reg = new PointRegistry();
  input.drivers.forEach((d) => {
    reg.idx(d.origin);
    reg.idx(d.destination);
  });
  input.passengers.forEach((p) => {
    reg.idx(p.origin);
    reg.idx(p.destination);
  });
  (input.meetingPoints ?? []).forEach((m) => reg.idx(m.pos));
  const metric = makeMetric(await provider.matrix(reg.points));
  const paxById = new Map(input.passengers.map((p) => [p.id, p]));
  const p = paxById.get(passengerLegId);
  if (!p) return { result, violations: [] };

  // Reconstruir WorkRides desde el resultado actual.
  const driversById = new Map(input.drivers.map((d) => [d.id, d]));
  const work: WorkRide[] = result.rides
    .map((r) => {
      const drv = driversById.get(r.driverLegId);
      if (!drv) return null;
      const oIdx = reg.idx(drv.origin);
      const dIdx = reg.idx(drv.destination);
      const stops: InnerStop[] = r.stops
        .filter((s) => s.kind === "pickup" || s.kind === "dropoff")
        .map((s) => ({
          kind: s.kind as "pickup" | "dropoff",
          passengerId: s.passengerLegId!,
          ptIdx: reg.idx(s.point),
          point: s.point,
          meetingPointId: s.meetingPointId,
          walkMin: s.walkMin
        }));
      return {
        driver: drv,
        oIdx,
        dIdx,
        baseMin: metric.t(oIdx, dIdx),
        baseKm: metric.km(oIdx, dIdx),
        stops
      } as WorkRide;
    })
    .filter((x): x is WorkRide => x !== null);

  const manualFlags = new Map(result.rides.map((r) => [r.driverLegId, r.manual ?? false]));
  for (const w of work) removePassenger(w, passengerLegId);

  const unassigned = result.unassigned.filter((u) => u.passengerLegId !== passengerLegId);

  if (targetDriverLegId !== null) {
    const target = work.find((w) => w.driver.id === targetDriverLegId);
    if (target) {
      // Mejor posición SIN restricciones duras: minimizar tiempo de ruta.
      const cands = pickupCandidates(p, input.meetingPoints ?? [], true, reg);
      const cand = cands[0] ?? { ptIdx: reg.idx(p.origin), point: p.origin, walkMin: 0 };
      const dropIdx = reg.idx(p.destination);
      let bestStops: InnerStop[] | null = null;
      let bestMin = Infinity;
      const n = target.stops.length;
      for (let i = 0; i <= n; i++) {
        const withPickup = target.stops.slice();
        withPickup.splice(i, 0, {
          kind: "pickup",
          passengerId: p.id,
          ptIdx: cand.ptIdx,
          point: cand.point,
          meetingPointId: cand.meetingPointId,
          walkMin: cand.walkMin
        });
        for (let j = i + 1; j <= n + 1; j++) {
          const trial = withPickup.slice();
          trial.splice(j, 0, { kind: "dropoff", passengerId: p.id, ptIdx: dropIdx, point: p.destination });
          const { routeMin } = routeOffsets(target, trial, metric);
          if (routeMin < bestMin) {
            bestMin = routeMin;
            bestStops = trial;
          }
        }
      }
      if (bestStops) {
        target.stops = bestStops;
        manualFlags.set(target.driver.id, true);
      }
    }
  } else {
    unassigned.push({ passengerLegId, reason: "manual" });
  }

  const newRides = work.map((w) => {
    const built = buildRide(w, metric, paxById);
    built.manual = manualFlags.get(w.driver.id) ?? false;
    return built;
  });
  const assignedIds = new Set(newRides.flatMap((r) => r.passengerLegIds));
  const finalUnassigned = unassigned.filter((u) => !assignedIds.has(u.passengerLegId));

  let paxKm = 0;
  for (const q of input.passengers) {
    if (assignedIds.has(q.id)) paxKm += metric.km(reg.idx(q.origin), reg.idx(q.destination));
  }
  const used = newRides.filter((r) => r.passengerLegIds.length > 0);
  const totalDetour = newRides.reduce((a, r) => a + r.detourMin, 0);
  const newResult: MatchResult = {
    rides: newRides,
    unassigned: finalUnassigned,
    stats: {
      ...result.stats,
      assigned: assignedIds.size,
      driversUsed: used.length,
      totalDetourMin: totalDetour,
      avgDetourMin: used.length ? totalDetour / used.length : 0,
      passengerDirectKm: paxKm,
      co2SavedKg: paxKm * 0.13
    }
  };
  const violations = await validateMatch(input, newResult, provider);
  return { result: newResult, violations };
}
