// Logros y completar perfil (PR-E1).
import { describe, it, expect } from "vitest";
import { buildSeed } from "../seed";
import { achievementsOf, earnedCount, profileCompletion } from "./achievements";

describe("logros", () => {
  const s = buildSeed();

  it("m0 (Vos): tiene primer viaje, manejó, y garage (2 autos)", () => {
    const a = achievementsOf(s, "m0");
    const by = Object.fromEntries(a.map((x) => [x.id, x.earned]));
    expect(by.firstTrip).toBe(true);
    expect(by.driver).toBe(true); // el historial de m0 tiene tramos como conductor
    expect(by.garage).toBe(true); // 2 vehículos en el seed
    expect(earnedCount(a)).toBeGreaterThan(0);
  });

  it("c2 (Joaquín, nuevo sin historia): no ganó ninguno", () => {
    const a = achievementsOf(s, "c2");
    expect(earnedCount(a)).toBe(0);
    expect(a.every((x) => !x.earned)).toBe(true);
  });

  it("c0 (Valen): top-rated (4.8, 5 reseñas) y 10 viajes", () => {
    const by = Object.fromEntries(achievementsOf(s, "c0").map((x) => [x.id, x.earned]));
    expect(by.topRated).toBe(true);
    expect(by.tenTrips).toBe(true);
  });

  it("el catálogo es estable (mismos ids, mismo orden) para cualquier miembro", () => {
    const ids = (id: string) => achievementsOf(s, id).map((a) => a.id);
    expect(ids("m0")).toEqual(ids("c2"));
  });
});

describe("completar perfil", () => {
  const s = buildSeed();
  const me = s.members.find((m) => m.id === "m0")!;

  it("pct entre 0 y 100 y coherente con los pasos hechos", () => {
    const c = profileCompletion(me);
    expect(c.pct).toBeGreaterThanOrEqual(0);
    expect(c.pct).toBeLessThanOrEqual(100);
    const done = c.steps.filter((x) => x.done).length;
    expect(c.pct).toBe(Math.round((done / c.steps.length) * 100));
  });

  it("email sin verificar cuenta como paso pendiente", () => {
    const c = profileCompletion({ ...me, emailVerified: false });
    expect(c.steps.find((x) => x.key === "complete.email")?.done).toBe(false);
  });

  it("perfil completo → 100%", () => {
    const full = { ...me, name: "Ana", emailVerified: true, bio: "hola", subgroup: "amigos" };
    expect(profileCompletion(full).pct).toBe(100);
  });
});
