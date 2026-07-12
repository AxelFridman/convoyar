/**
 * Aporte de nafta SUGERIDO (PR-C2) — informativo, NO es un cobro.
 * Convoyar no procesa pagos ni tarifas: solo estima cuánto le podría acercar
 * cada pasajero al conductor para compartir la nafta, y que lo arreglen entre ellos.
 * Puro y sin dependencias de UI.
 */

/** Consumo promedio de referencia (L cada 100 km). Constante editable a futuro. */
const LITERS_PER_100KM = 9;

/** Costo estimado de nafta del viaje = km × consumo × precio del litro. */
export function fuelCost(routeKm: number, pricePerLiter: number): number {
  if (routeKm <= 0 || pricePerLiter <= 0) return 0;
  return routeKm * (LITERS_PER_100KM / 100) * pricePerLiter;
}

/**
 * Aporte sugerido POR PASAJERO: el costo de nafta repartido entre todos los que
 * viajan (conductor + pasajeros), así el conductor también pone su parte.
 * Devuelve 0 si no hay pasajeros o falta el precio.
 */
export function suggestedPerPassenger(
  routeKm: number,
  passengers: number,
  pricePerLiter: number
): number {
  if (passengers <= 0) return 0;
  const occupants = passengers + 1; // + conductor
  return Math.round(fuelCost(routeKm, pricePerLiter) / occupants);
}

/** Precio del litro por defecto (genérico, editable en Ajustes). */
export const DEFAULT_FUEL_PRICE = 1000;
