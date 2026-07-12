import type { LatLng } from "./types";

const R_EARTH_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat);
  const lb = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutos caminando entre dos puntos (factor de red urbana 1.25, 4.5 km/h). */
export function walkMinutes(a: LatLng, b: LatLng): number {
  return (haversineKm(a, b) * 1.25 * 60) / 4.5;
}

/** Radio en metros alcanzable caminando en `minutes` — inverso de walkMinutes
 *  (línea recta). Sirve para dibujar en el mapa cuánto está dispuesto a caminar
 *  el pasajero, coherente con lo que evalúa el motor. */
export function walkRadiusMeters(minutes: number): number {
  return (minutes * 4.5 * 1000) / (1.25 * 60);
}

/** RNG determinista (mulberry32) para desempates reproducibles y datos de demo. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function minutesToHHMM(min: number, hour12 = false): string {
  const m = Math.round(min);
  const h24 = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, "0");
  if (!hour12) return `${String(h24).padStart(2, "0")}:${mm}`;
  // 12h con am/pm (minúsculas, sin cero a la izquierda en la hora).
  const ampm = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${ampm}`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
