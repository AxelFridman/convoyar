// Filtros de fecha de Explorar (regresión del fix "finde en domingo").
import { describe, it, expect } from "vitest";
import { inRange } from "./Explore";

// Helper: fecha local a las 12:00 (evita líos de medianoche/UTC en el test).
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0).toISOString();

describe("inRange (filtros de fecha)", () => {
  it("'all' siempre incluye", () => {
    expect(inRange(at(2030, 1, 1), "all", new Date(2026, 6, 12, 12))).toBe(true);
  });

  it("'today' solo el mismo día", () => {
    const now = new Date(2026, 6, 12, 9); // dom 12-jul-2026
    expect(inRange(at(2026, 7, 12), "today", now)).toBe(true);
    expect(inRange(at(2026, 7, 13), "today", now)).toBe(false);
  });

  it("'weekend' un SÁBADO incluye hoy (sáb) y mañana (dom)", () => {
    const sat = new Date(2026, 6, 11, 10); // sáb 11-jul-2026 (getDay()===6)
    expect(sat.getDay()).toBe(6);
    expect(inRange(at(2026, 7, 11), "weekend", sat)).toBe(true); // sábado
    expect(inRange(at(2026, 7, 12), "weekend", sat)).toBe(true); // domingo
    expect(inRange(at(2026, 7, 13), "weekend", sat)).toBe(false); // lunes
  });

  it("'weekend' un DOMINGO todavía incluye el domingo en curso (regresión)", () => {
    const sun = new Date(2026, 6, 12, 10); // dom 12-jul-2026 (getDay()===0)
    expect(sun.getDay()).toBe(0);
    expect(inRange(at(2026, 7, 12), "weekend", sun)).toBe(true); // ← el bug hacía esto false
    expect(inRange(at(2026, 7, 11), "weekend", sun)).toBe(true); // el sábado del finde en curso
    expect(inRange(at(2026, 7, 18), "weekend", sun)).toBe(false); // el finde SIGUIENTE no
  });

  it("'weekend' un MIÉRCOLES apunta al próximo finde", () => {
    const wed = new Date(2026, 6, 8, 10); // mié 8-jul-2026 (getDay()===3)
    expect(wed.getDay()).toBe(3);
    expect(inRange(at(2026, 7, 11), "weekend", wed)).toBe(true); // sáb siguiente
    expect(inRange(at(2026, 7, 12), "weekend", wed)).toBe(true); // dom siguiente
    expect(inRange(at(2026, 7, 8), "weekend", wed)).toBe(false); // hoy (miércoles) no
  });

  it("'week' incluye de hoy a +7 días", () => {
    const now = new Date(2026, 6, 12, 10);
    expect(inRange(at(2026, 7, 12), "week", now)).toBe(true);
    expect(inRange(at(2026, 7, 19), "week", now)).toBe(true);
    expect(inRange(at(2026, 7, 20), "week", now)).toBe(false);
    expect(inRange(at(2026, 7, 11), "week", now)).toBe(false); // ayer no
  });
});
