/**
 * Garage — helpers puros sobre los vehículos de un miembro (PR-A1).
 * Sin React ni estado global: fácil de testear y de mover a un backend.
 */
import type { Member, Vehicle } from "./model";
import type { Feature } from "../engine/types";

export function hasVehicle(m: Pick<Member, "vehicles">): boolean {
  return m.vehicles.length > 0;
}

/** Vehículo por defecto del miembro (el primero del garage) o null. */
export function primaryVehicle(m: Pick<Member, "vehicles">): Vehicle | null {
  return m.vehicles[0] ?? null;
}

export function vehicleById(m: Pick<Member, "vehicles">, id: string | undefined): Vehicle | undefined {
  if (!id) return undefined;
  return m.vehicles.find((v) => v.id === id);
}

/**
 * Vehículo que se usa en un leg: el elegido (leg.vehicleId) o el primero del
 * garage como fallback. Punto único que consulta el matching (buildMatchInput).
 */
export function legVehicle(m: Pick<Member, "vehicles">, vehicleId?: string): Vehicle | null {
  return vehicleById(m, vehicleId) ?? primaryVehicle(m);
}

/** Etiqueta legible: el alias, o "Auto · N asientos" traducible por el caller. */
export function vehicleLabel(v: Vehicle, fallback: string): string {
  return v.alias?.trim() || fallback;
}

let seq = 0;
/** Id de vehículo nuevo. Runtime de app (no seed/tests): Date.now + contador. */
export function newVehicleId(): string {
  return `veh-${Date.now().toString(36)}-${(seq++).toString(36)}`;
}

/** Vehículo vacío por defecto para "agregar al garage". */
export function blankVehicle(id: string, capacity = 3): Vehicle {
  return { id, capacity, features: [] as Feature[], smokeFree: true };
}
