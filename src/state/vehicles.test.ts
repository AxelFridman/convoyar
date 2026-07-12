// Helpers del garage (PR-A1).
import { describe, it, expect } from "vitest";
import { hasVehicle, primaryVehicle, vehicleById, legVehicle, vehicleLabel, blankVehicle } from "./vehicles";
import type { Vehicle } from "./model";

const v = (id: string, alias?: string): Vehicle => ({ id, alias, capacity: 4, features: [], smokeFree: true });

describe("garage helpers", () => {
  it("hasVehicle / primaryVehicle", () => {
    expect(hasVehicle({ vehicles: [] })).toBe(false);
    expect(primaryVehicle({ vehicles: [] })).toBeNull();
    const m = { vehicles: [v("a"), v("b")] };
    expect(hasVehicle(m)).toBe(true);
    expect(primaryVehicle(m)?.id).toBe("a");
  });

  it("vehicleById y legVehicle (elegido o fallback al primero)", () => {
    const m = { vehicles: [v("a"), v("b")] };
    expect(vehicleById(m, "b")?.id).toBe("b");
    expect(vehicleById(m, "zzz")).toBeUndefined();
    expect(legVehicle(m, "b")?.id).toBe("b"); // elegido
    expect(legVehicle(m, undefined)?.id).toBe("a"); // fallback al primero
    expect(legVehicle(m, "borrado")?.id).toBe("a"); // id inexistente → primero
    expect(legVehicle({ vehicles: [] }, "x")).toBeNull();
  });

  it("vehicleLabel usa alias o el fallback", () => {
    expect(vehicleLabel(v("a", "el Gol"), "Auto")).toBe("el Gol");
    expect(vehicleLabel(v("a"), "Auto · 4 asientos")).toBe("Auto · 4 asientos");
    expect(vehicleLabel(v("a", "   "), "Auto")).toBe("Auto"); // alias en blanco → fallback
  });

  it("blankVehicle acepta capacidad", () => {
    expect(blankVehicle("x").capacity).toBe(3);
    expect(blankVehicle("x", 5).capacity).toBe(5);
    expect(blankVehicle("x").features).toEqual([]);
  });
});
