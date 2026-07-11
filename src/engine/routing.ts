/**
 * Proveedores de ruteo — 100% open source, sin APIs pagas (spec §6).
 *
 * El motor de matching consume una MATRIZ de tiempos/distancias entre puntos
 * (una sola llamada por evento), igual que el OSRM Table Service. Eso hace que
 * cambiar mock → OSRM/Valhalla/GraphHopper sea trivial y barato en requests.
 */
import type { LatLng } from "./types";
import { haversineKm } from "./geo";

export interface RouteMatrix {
  /** minutes[i][j] = minutos de manejo del punto i al punto j. */
  minutes: number[][];
  /** km[i][j] = distancia en km del punto i al punto j. */
  km: number[][];
}

export interface RoutingProvider {
  readonly name: string;
  matrix(points: LatLng[]): Promise<RouteMatrix>;
}

/**
 * Mock determinista para desarrollo y demo (spec §12: "empezar con datos de
 * ruteo simulados"). Aproxima red vial urbana: distancia en línea recta × 1.3,
 * a 26 km/h promedio (ciudad) con piso de 1 min por tramo.
 */
export class MockRoutingProvider implements RoutingProvider {
  readonly name = "mock-haversine";
  constructor(
    private roadFactor = 1.3,
    private avgSpeedKmh = 26
  ) {}

  async matrix(points: LatLng[]): Promise<RouteMatrix> {
    const n = points.length;
    const minutes: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const km: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = haversineKm(points[i], points[j]) * this.roadFactor;
        const t = d === 0 ? 0 : Math.max(1, (d / this.avgSpeedKmh) * 60);
        km[i][j] = km[j][i] = d;
        minutes[i][j] = minutes[j][i] = t;
      }
    }
    return { minutes, km };
  }
}

/**
 * Adaptador OSRM (self-hosted). Usa el Table Service:
 *   GET {base}/table/v1/driving/{lng,lat;...}?annotations=duration,distance
 * Levantar OSRM con datos OSM de tu región (ver README §OSRM).
 */
export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = "osrm";
  constructor(private baseUrl: string) {}

  async matrix(points: LatLng[]): Promise<RouteMatrix> {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `${this.baseUrl.replace(/\/$/, "")}/table/v1/driving/${coords}?annotations=duration,distance`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      code: string;
      durations: number[][];
      distances: number[][];
    };
    if (data.code !== "Ok") throw new Error(`OSRM code=${data.code}`);
    return {
      minutes: data.durations.map((row) => row.map((s) => s / 60)),
      km: data.distances.map((row) => row.map((m) => m / 1000))
    };
  }
}
