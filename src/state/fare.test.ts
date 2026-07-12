// Aporte de nafta sugerido (PR-C2) — informativo.
import { describe, it, expect } from "vitest";
import { fuelCost, suggestedPerPassenger } from "./fare";

describe("aporte de nafta sugerido", () => {
  it("fuelCost = km × 9/100 × precio", () => {
    expect(fuelCost(100, 1000)).toBeCloseTo(9000, 5); // 100km, 9L/100, $1000/L
    expect(fuelCost(0, 1000)).toBe(0);
    expect(fuelCost(100, 0)).toBe(0);
  });

  it("reparte entre conductor + pasajeros y redondea", () => {
    // 50 km, 3 pasajeros → costo 50*0.09*1000=4500, occupants=4 → 1125
    expect(suggestedPerPassenger(50, 3, 1000)).toBe(1125);
  });

  it("sin pasajeros o sin precio → 0 (no se muestra)", () => {
    expect(suggestedPerPassenger(50, 0, 1000)).toBe(0);
    expect(suggestedPerPassenger(50, 2, 0)).toBe(0);
  });

  it("más pasajeros → menos aporte por cabeza", () => {
    const a = suggestedPerPassenger(80, 1, 1200);
    const b = suggestedPerPassenger(80, 3, 1200);
    expect(b).toBeLessThan(a);
  });
});
