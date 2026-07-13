// Moderación (bloquear / cuenta pausada) + estado de grupos: helpers puros.
import { describe, it, expect } from "vitest";
import { buildSeed } from "../seed";
import { iAmPaused, isBlocked } from "./reputation";

describe("moderación: helpers puros", () => {
  it("el seed arranca sin bloqueos ni cuenta pausada", () => {
    const s = buildSeed();
    expect(s.blockedIds).toEqual([]);
    expect(iAmPaused(s)).toBe(false);
    expect(isBlocked(s, "c0")).toBe(false);
  });

  it("isBlocked refleja blockedIds y tolera estados viejos sin el campo", () => {
    const s = buildSeed();
    expect(isBlocked({ ...s, blockedIds: ["c3"] }, "c3")).toBe(true);
    expect(isBlocked({ ...s, blockedIds: ["c3"] }, "c1")).toBe(false);
    // Estado v4 previo a moderación (sin blockedIds) no rompe.
    expect(isBlocked({ blockedIds: undefined as unknown as string[] }, "c3")).toBe(false);
  });

  it("iAmPaused detecta MI cuenta pausada (no la de otros)", () => {
    const s = buildSeed();
    const someoneElsePaused = {
      ...s,
      members: s.members.map((m) => (m.id === "c3" ? { ...m, status: "paused" as const } : m))
    };
    expect(iAmPaused(someoneElsePaused)).toBe(false);
    const mePaused = {
      ...s,
      members: s.members.map((m) => (m.id === s.meId ? { ...m, status: "paused" as const } : m))
    };
    expect(iAmPaused(mePaused)).toBe(true);
  });
});

describe("modelo de grupos", () => {
  it("las orgs del seed exponen linkEnabled (OFF por defecto)", () => {
    const s = buildSeed();
    for (const o of s.orgs) {
      // linkEnabled es opcional: ausente o false = link deshabilitado.
      expect(o.linkEnabled ?? false).toBe(false);
    }
  });
});
