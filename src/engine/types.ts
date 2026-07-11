/**
 * Caravana — Motor de matching
 * Tipos de dominio. Este módulo NO conoce React, ni almacenamiento, ni UI.
 * Contrato: (conductores + pasajeros + proveedor de ruteo) → (viajes + no asignados).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Ventana horaria en minutos desde las 00:00 del día del evento. */
export interface TimeWindow {
  start: number;
  end: number;
}

/** Características de vehículo / necesidades de pasajero. Deben matchear 1 a 1 (restricción dura). */
export type Feature = "wheelchair" | "pets" | "big_trunk" | "bikes" | "child_seat";

/** Preferencias blandas: solo desempatan, nunca descartan (spec §12). */
export interface SoftPrefs {
  subgroup?: string;
  smokeFree?: boolean;
}

export interface DriverLeg {
  id: string;
  memberId: string;
  vehicleId: string;
  origin: LatLng;
  destination: LatLng;
  /** Ventana de salida del conductor. */
  window: TimeWindow;
  /** Asientos disponibles para pasajeros (sin contar al conductor). */
  capacity: number;
  /** Desvío máximo aceptado (minutos extra vs. su ruta directa). Restricción dura. */
  maxDetourMin: number;
  features: Feature[];
  prefs?: SoftPrefs;
}

export interface PassengerLeg {
  id: string;
  memberId: string;
  origin: LatLng;
  destination: LatLng;
  /** Ventana en la que el pasajero puede ser recogido. */
  window: TimeWindow;
  /** Caminata máxima aceptada hasta el punto de encuentro (minutos). Restricción dura. */
  maxWalkMin: number;
  needs: Feature[];
  prefs?: SoftPrefs;
}

/** Punto de encuentro predefinido por la organización (opcional). */
export interface MeetingPoint {
  id: string;
  name: string;
  pos: LatLng;
}

export interface MatchInput {
  drivers: DriverLeg[];
  passengers: PassengerLeg[];
  meetingPoints?: MeetingPoint[];
  options?: MatchOptions;
}

export interface MatchOptions {
  /** Permitir recogida puerta a puerta cuando no hay punto de encuentro cerca. Default: true. */
  doorToDoor?: boolean;
  /** Pasadas de mejora local (0 = solo greedy). Default: 2. */
  improvementPasses?: number;
  /** Semilla para desempates deterministas. */
  seed?: number;
  /** Resultado previo: el solver intenta conservar asignaciones válidas (recálculo incremental). */
  warmStart?: MatchResult;
}

export type StopKind = "start" | "pickup" | "dropoff" | "end";

export interface RideStop {
  kind: StopKind;
  point: LatLng;
  /** Minutos desde la salida del conductor hasta llegar a esta parada. */
  offsetMin: number;
  /** Hora estimada (min desde 00:00) = departureMin + offsetMin. */
  etaMin: number;
  passengerLegId?: string;
  meetingPointId?: string;
  /** Caminata del pasajero hasta el punto de recogida (min). */
  walkMin?: number;
}

export interface Ride {
  driverLegId: string;
  passengerLegIds: string[];
  stops: RideStop[];
  /** Salida elegida dentro de la ventana del conductor. */
  departureMin: number;
  baseMin: number;
  routeMin: number;
  detourMin: number;
  baseKm: number;
  routeKm: number;
  /** true si un admin forzó cambios a mano. */
  manual?: boolean;
}

export type UnassignedReason =
  | "sin_conductores" // no hay conductores en el evento
  | "necesidades"     // ningún vehículo cubre sus necesidades (silla de ruedas, etc.)
  | "capacidad"       // todos los autos compatibles están llenos
  | "desvio"          // asignarlo excedería el desvío máximo de todos los conductores
  | "ventana"         // no hay superposición horaria factible
  | "caminata"       // ningún punto de recogida dentro de su radio de caminata
  | "manual";        // un admin lo movió a "sin asignar" a mano

export interface Unassigned {
  passengerLegId: string;
  reason: UnassignedReason;
}

export interface MatchStats {
  passengers: number;
  assigned: number;
  drivers: number;
  driversUsed: number;
  totalDetourMin: number;
  avgDetourMin: number;
  /** Km que los pasajeros habrían manejado solos (estimado, para métricas de CO2). */
  passengerDirectKm: number;
  co2SavedKg: number;
  computeMs: number;
}

export interface MatchResult {
  rides: Ride[];
  unassigned: Unassigned[];
  stats: MatchStats;
}

export interface Violation {
  rideDriverLegId: string;
  code: "capacidad" | "desvio" | "ventana" | "necesidades" | "caminata";
  detail: string;
}
