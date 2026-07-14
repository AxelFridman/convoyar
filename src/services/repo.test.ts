// Mappers del repo (fila snake_case ↔ modelo v4 camelCase). Son PUROS: no tocan
// la red ni `supabase`, así que se testean sin backend. Cubren los invariantes que
// hacen o rompen la migración multiusuario (ver comentarios en repo.ts):
//   • una casa/origen ausente es undefined, NUNCA {0,0} (el motor jamás matchea la isla nula);
//   • defaults de status ("active") y linkEnabled (false);
//   • round-trips modelo↔fila que preservan los campos clave.
import { describe, it, expect } from "vitest";
import { __test as M } from "./repo";

describe("repo · mapper toMember", () => {
  const base = {
    id: "m1",
    name: "Ana",
    subgroup: null,
    vehicles: null,
    defaults: null,
    joined_at: "2026-01-02T03:04:05.000Z",
    bio: null,
    email: null,
    email_verified: null,
    status: null as "active" | "paused" | null,
    auth_user_id: null
  };

  it("sin fila member_home → home undefined (NUNCA {0,0})", () => {
    const m = M.toMember(base);
    expect(m.home).toBeUndefined();
  });

  it("con member_home → LatLng exacto", () => {
    const m = M.toMember(base, { member_id: "m1", lat: -34.6, lng: -58.4 });
    expect(m.home).toEqual({ lat: -34.6, lng: -58.4 });
  });

  it("status null → 'active'; 'paused' se preserva", () => {
    expect(M.toMember(base).status).toBe("active");
    expect(M.toMember({ ...base, status: "paused" }).status).toBe("paused");
  });

  it("nulls (subgroup/bio/email/vehicles/defaults) → undefined/[]", () => {
    const m = M.toMember(base);
    expect(m.subgroup).toBeUndefined();
    expect(m.bio).toBeUndefined();
    expect(m.email).toBeUndefined();
    expect(m.vehicles).toEqual([]);
    expect(m.defaults).toBeUndefined();
  });
});

describe("repo · mapper toOrg", () => {
  const orgRow = {
    id: "o1",
    name: "Club",
    join_code: "ABC123",
    link_enabled: null as boolean | null,
    meeting_points: [{ id: "mp1", name: "Plaza", lat: -34.6, lng: -58.4 }],
    destination_lat: null as number | null,
    destination_lng: null as number | null,
    destination_name: null as string | null
  };
  const orgMembers = [
    { org_id: "o1", member_id: "m1", is_admin: true },
    { org_id: "o1", member_id: "m2", is_admin: false },
    { org_id: "OTRA", member_id: "m9", is_admin: true } // de otra org: se ignora
  ];

  it("link_enabled null → false", () => {
    expect(M.toOrg(orgRow, orgMembers).linkEnabled).toBe(false);
    expect(M.toOrg({ ...orgRow, link_enabled: true }, orgMembers).linkEnabled).toBe(true);
  });

  it("memberIds/adminIds salen de org_members filtrados por esta org", () => {
    const o = M.toOrg(orgRow, orgMembers);
    expect(o.memberIds).toEqual(["m1", "m2"]);
    expect(o.adminIds).toEqual(["m1"]);
  });

  it("meeting_points {lat,lng} → {loc}", () => {
    const o = M.toOrg(orgRow, orgMembers);
    expect(o.meetingPoints).toEqual([{ id: "mp1", name: "Plaza", loc: { lat: -34.6, lng: -58.4 } }]);
  });

  it("destino común: null → undefined (nunca {0,0}); con valores → LatLng + nombre", () => {
    expect(M.toOrg(orgRow, orgMembers).destination).toBeUndefined();
    const withDest = M.toOrg(
      { ...orgRow, destination_lat: -34.6, destination_lng: -58.4, destination_name: "El club" },
      orgMembers
    );
    expect(withDest.destination).toEqual({ lat: -34.6, lng: -58.4 });
    expect(withDest.destinationName).toBe("El club");
  });
});

describe("repo · mapper toLeg (origen nunca {0,0})", () => {
  const legRow = {
    id: "l1",
    member_id: "m1",
    event_id: "e1",
    role: "passenger" as const,
    window_start: 600,
    window_end: 700,
    origin_lat: null as number | null,
    origin_lng: null as number | null,
    vehicle_id: null,
    max_detour_min: null,
    max_walk_min: null,
    needs: null,
    soft: null
  };

  it("origin_lat/lng null → origin undefined", () => {
    expect(M.toLeg(legRow).origin).toBeUndefined();
  });

  it("origin con valores → LatLng; window mapeado", () => {
    const l = M.toLeg({ ...legRow, origin_lat: -34.6, origin_lng: -58.4 });
    expect(l.origin).toEqual({ lat: -34.6, lng: -58.4 });
    expect(l.window).toEqual({ start: 600, end: 700 });
  });

  it("round-trip toLeg→legToRow preserva id/rol/ventana/origen", () => {
    const row = { ...legRow, origin_lat: -34.6, origin_lng: -58.4, vehicle_id: "v1" };
    const back = M.legToRow(M.toLeg(row));
    expect(back.id).toBe("l1");
    expect(back.role).toBe("passenger");
    expect(back.window_start).toBe(600);
    expect(back.window_end).toBe(700);
    expect(back.origin_lat).toBe(-34.6);
    expect(back.origin_lng).toBe(-58.4);
    expect(back.vehicle_id).toBe("v1");
  });
});

describe("repo · mappers de eventos, requests, reviews, settings", () => {
  it("toEvent: date→dateISO, destino desde lat/lng", () => {
    const e = M.toEvent({
      id: "e1",
      org_id: "o1",
      title: "Escapada",
      date: "2026-03-04T10:00:00.000Z",
      destination_lat: -38,
      destination_lng: -57,
      destination_name: null,
      visibility: "public",
      created_by: "m1",
      origin_name: null
    });
    expect(e.dateISO).toBe("2026-03-04T10:00:00.000Z");
    expect(e.destination).toEqual({ lat: -38, lng: -57 });
    expect(e.destinationName).toBeUndefined();
    expect(e.originName).toBeUndefined();
  });

  it("toJoinRequest: created_at→at, decided_at null→undefined", () => {
    const r = M.toJoinRequest({
      id: "jr1",
      event_id: "e1",
      member_id: "m1",
      role: "passenger",
      message: null,
      status: "pending",
      created_at: "2026-01-01T00:00:00.000Z",
      decided_at: null
    });
    expect(r.at).toBe("2026-01-01T00:00:00.000Z");
    expect(r.decidedAt).toBeUndefined();
    expect(r.message).toBeUndefined();
  });

  it("toReview: from/to/stars y created_at→at", () => {
    const rv = M.toReview({
      id: "rv1",
      from_member_id: "m1",
      to_member_id: "m2",
      stars: 5,
      comment: null,
      created_at: "2026-01-01T00:00:00.000Z"
    });
    expect(rv.fromMemberId).toBe("m1");
    expect(rv.toMemberId).toBe("m2");
    expect(rv.stars).toBe(5);
    expect(rv.at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("toSettings: notif_prefs null → default; hour12/fuel null → undefined", () => {
    const s = M.toSettings({
      member_id: "m1",
      lang: "es",
      theme: "system",
      plan: "free",
      onboarded: true,
      notif_permission: false,
      notif_prefs: null,
      hour12: null,
      fuel_price_per_l: null
    });
    expect(s.notifPrefs).toEqual({ assignments: true, requests: true, chat: true, email: false });
    expect(s.hour12).toBeUndefined();
    expect(s.fuelPricePerL).toBeUndefined();
    expect(s.onboarded).toBe(true);
  });
});
