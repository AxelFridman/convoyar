// Modo público (tipo BlaBlaCar): reputación, solicitudes y consistencia del seed.
import { describe, it, expect } from "vitest";
import { buildSeed } from "../seed";
import { buildMatchInput, defaultPassengerLeg } from "./store";
import { solveMatching } from "../engine/matching";
import { MockRoutingProvider } from "../engine/routing";
import {
  canAdminEvent,
  initialsOf,
  isParticipant,
  memberSince,
  myRequestFor,
  participantsOf,
  pendingRequestsFor,
  ratingOf,
  tripCountOf
} from "./reputation";

describe("reputación", () => {
  const s = buildSeed();

  it("promedia reseñas y cuenta bien", () => {
    const valen = ratingOf(s, "c0"); // 5,5,5,4,5 → 4.8
    expect(valen.count).toBe(5);
    expect(valen.avg).toBeCloseTo(4.8, 1);
  });

  it("miembro nuevo: sin rating y sin viajes", () => {
    expect(ratingOf(s, "c2")).toEqual({ avg: null, count: 0 });
    expect(tripCountOf(s, "c2").total).toBe(0);
  });

  it("historial separa conductor/pasajero", () => {
    const t = tripCountOf(s, "m0");
    expect(t.total).toBe(6);
    expect(t.asDriver + t.asPassenger).toBe(t.total);
    expect(t.asDriver).toBeGreaterThan(0);
  });

  it("memberSince es legible en ambos idiomas", () => {
    const now = new Date("2026-07-11T12:00:00Z");
    expect(memberSince("2024-07-01T00:00:00Z", "es", now)).toMatch(/año/);
    expect(memberSince("2026-07-01T00:00:00Z", "en", now)).toMatch(/days? ago|last week|weeks ago/);
  });

  it("iniciales de avatar", () => {
    expect(initialsOf("Mariana K.")).toBe("MK");
    expect(initialsOf("Vos")).toBe("VO");
    expect(initialsOf("")).toBe("?");
  });
});

describe("solicitudes y permisos", () => {
  const s = buildSeed();
  const tigre = s.events.find((e) => e.id === "ev2")!;

  it("el seed trae solicitudes pendientes en tu evento público", () => {
    const pending = pendingRequestsFor(s, tigre.id);
    expect(pending.length).toBe(3);
    // ordenadas de más vieja a más nueva
    expect(pending[0].memberId).toBe("c1");
    // todas referencian miembros y eventos existentes
    for (const r of s.joinRequests) {
      expect(s.members.some((m) => m.id === r.memberId)).toBe(true);
      expect(s.events.some((e) => e.id === r.eventId)).toBe(true);
    }
  });

  it("aprobada = participante aunque no sea de la org", () => {
    expect(isParticipant(s, tigre.id, "c6")).toBe(true); // Delfi, aprobada
    expect(isParticipant(s, tigre.id, "c1")).toBe(false); // Abril, pendiente
    expect(isParticipant(s, tigre.id, "m3")).toBe(true); // de la org
  });

  it("myRequestFor devuelve la última solicitud", () => {
    const r = myRequestFor(s, tigre.id, "c1");
    expect(r?.status).toBe("pending");
    expect(myRequestFor(s, tigre.id, "m0")).toBeUndefined();
  });

  it("participantsOf incluye miembros de la org, aprobados y quien tiene leg", () => {
    const p = participantsOf(s, "ev1");
    expect(p).toContain("m0"); // miembro de la org
    expect(p.length).toBe(new Set(p).size); // sin duplicados
    const tigre = participantsOf(s, "ev2");
    expect(tigre).toContain("c6"); // Delfi, aprobada aunque no es de la org
  });

  it("solo organizador o admin de la org administran", () => {
    expect(canAdminEvent(s, tigre.id, "m0")).toBe(true); // creador y admin
    expect(canAdminEvent(s, tigre.id, "c1")).toBe(false);
    const mdq = s.events.find((e) => e.id === "ev3")!;
    expect(canAdminEvent(s, mdq.id, "c0")).toBe(true); // creadora
    expect(canAdminEvent(s, mdq.id, "m0")).toBe(false); // yo no organizo MDQ
  });
});

describe("consistencia del seed v2", () => {
  const s = buildSeed();

  it("versión 3 con las colecciones nuevas", () => {
    expect(s.version).toBe(3);
    expect(s.reviews.length).toBeGreaterThan(15);
    expect(s.tripHistory.length).toBeGreaterThan(30);
    expect(s.joinRequests.length).toBe(4);
    expect(s.messages.length).toBeGreaterThan(0);
    expect(s.settings.notifPrefs).toBeDefined();
    expect(s.settings.onboarded).toBe(true);
  });

  it("todos los eventos tienen visibilidad y organizador válidos", () => {
    for (const ev of s.events) {
      expect(["private", "public"]).toContain(ev.visibility);
      expect(s.members.some((m) => m.id === ev.createdBy)).toBe(true);
      expect(s.orgs.some((o) => o.id === ev.orgId)).toBe(true);
    }
    expect(s.events.filter((e) => e.visibility === "public").length).toBeGreaterThanOrEqual(3);
  });

  it("reseñas válidas: 1–5 estrellas, sin auto-reseñas, miembros existentes", () => {
    for (const r of s.reviews) {
      expect(r.stars).toBeGreaterThanOrEqual(1);
      expect(r.stars).toBeLessThanOrEqual(5);
      expect(r.fromMemberId).not.toBe(r.toMemberId);
      expect(s.members.some((m) => m.id === r.fromMemberId)).toBe(true);
      expect(s.members.some((m) => m.id === r.toMemberId)).toBe(true);
    }
  });

  it("todos los miembros tienen fecha de alta en el pasado", () => {
    const now = Date.now();
    for (const m of s.members) {
      expect(new Date(m.joinedISO).getTime()).toBeLessThan(now);
    }
  });

  it("los aprobados del seed ya tienen su leg cargado", () => {
    const approved = s.joinRequests.filter((r) => r.status === "approved");
    for (const r of approved) {
      expect(
        s.legs.some((l) => l.eventId === r.eventId && l.memberId === r.memberId)
      ).toBe(true);
    }
  });

  it("los legs del seed apuntan a miembros y eventos existentes", () => {
    for (const l of s.legs) {
      expect(s.members.some((m) => m.id === l.memberId)).toBe(true);
      expect(s.events.some((e) => e.id === l.eventId)).toBe(true);
    }
  });

  it("las fechas de alta preceden a toda la actividad de cada miembro", () => {
    for (const m of s.members) {
      const acts = [
        ...s.reviews.filter((r) => r.fromMemberId === m.id).map((r) => r.at),
        ...s.tripHistory.filter((t) => t.memberId === m.id).map((t) => t.dateISO),
      ];
      for (const a of acts) {
        expect(m.joinedISO <= a, `${m.name}: alta ${m.joinedISO} vs actividad ${a}`).toBe(true);
      }
    }
  });

  it("ningún par de miembros comparte viaje con roles contradictorios", () => {
    const byKey = new Map<string, string[]>();
    for (const t of s.tripHistory) {
      const k = `${t.title}|${t.dateISO}|${t.role}`;
      byKey.set(k, [...(byKey.get(k) ?? []), t.memberId]);
    }
    for (const [k, members] of byKey) {
      expect(members.length, `viaje duplicado ${k}: ${members}`).toBe(1);
    }
  });
});

describe("factibilidad del modo público (regresión de revisión)", () => {
  const provider = new MockRoutingProvider();

  it("ev2 (Tigre): la pasajera ya aceptada consigue lugar", async () => {
    const s = buildSeed();
    const input = buildMatchInput(s, "ev2")!;
    const result = await solveMatching(input, provider);
    expect(result.unassigned).toEqual([]);
  });

  it("ev2: aceptar a Abril y Joaquín también es factible (auto lleno, nadie afuera)", async () => {
    const s = buildSeed();
    const legs = [
      ...s.legs,
      defaultPassengerLeg(s, "ev2", "c1")!,
      defaultPassengerLeg(s, "ev2", "c2")!,
    ];
    const input = buildMatchInput(s, "ev2", legs)!;
    const result = await solveMatching(input, provider);
    expect(result.unassigned).toEqual([]);
  });

  it("ev3 y ev4: si el organizador me aprueba, mi leg por defecto consigue lugar", async () => {
    const s = buildSeed();
    for (const evId of ["ev3", "ev4"]) {
      const leg = defaultPassengerLeg(s, evId, "m0")!;
      const input = buildMatchInput(s, evId, [...s.legs, leg])!;
      const result = await solveMatching(input, provider);
      const me = result.unassigned.find((u) => u.passengerLegId === leg.id);
      expect(me, `${evId}: quedé sin lugar (${me?.reason})`).toBeUndefined();
    }
  });
});
