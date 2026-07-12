/**
 * Reputación y perfil público — helpers puros derivados del estado.
 * Sin React ni efectos: fáciles de testear y de mover a un backend.
 */
import type { AppState, JoinRequest, Member, Review, TripRecord } from "./model";
import { localeOf, type Lang } from "../i18n";

export interface Rating {
  /** Promedio 1–5, o null si nunca fue calificado. */
  avg: number | null;
  count: number;
}

export function ratingOf(state: Pick<AppState, "reviews">, memberId: string): Rating {
  const mine = state.reviews.filter((r) => r.toMemberId === memberId);
  if (mine.length === 0) return { avg: null, count: 0 };
  const sum = mine.reduce((acc, r) => acc + r.stars, 0);
  return { avg: sum / mine.length, count: mine.length };
}

export function reviewsOf(state: Pick<AppState, "reviews">, memberId: string): Review[] {
  return state.reviews
    .filter((r) => r.toMemberId === memberId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export interface TripCount {
  total: number;
  asDriver: number;
  asPassenger: number;
}

export function tripCountOf(state: Pick<AppState, "tripHistory">, memberId: string): TripCount {
  const mine = state.tripHistory.filter((t) => t.memberId === memberId);
  const asDriver = mine.filter((t) => t.role === "driver").length;
  return { total: mine.length, asDriver, asPassenger: mine.length - asDriver };
}

export function tripsOf(state: Pick<AppState, "tripHistory">, memberId: string): TripRecord[] {
  return state.tripHistory
    .filter((t) => t.memberId === memberId)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

/** "hace 2 años", "3 months ago"… relativo a `now` (inyectable para tests). */
export function memberSince(joinedISO: string, lang: Lang, now: Date = new Date()): string {
  const joined = new Date(joinedISO);
  const days = Math.max(0, Math.floor((now.getTime() - joined.getTime()) / 86400000));
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: "auto" });
  if (days < 30) return rtf.format(-days, "day");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

export function pendingRequestsFor(
  state: Pick<AppState, "joinRequests">,
  eventId: string
): JoinRequest[] {
  return state.joinRequests
    .filter((r) => r.eventId === eventId && r.status === "pending")
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function myRequestFor(
  state: Pick<AppState, "joinRequests">,
  eventId: string,
  memberId: string
): JoinRequest | undefined {
  // La última decisión manda (permite volver a pedir tras un rechazo).
  return [...state.joinRequests]
    .filter((r) => r.eventId === eventId && r.memberId === memberId)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

/** ¿Puede este miembro administrar el evento? (admin de la org o creador). */
export function canAdminEvent(
  state: Pick<AppState, "orgs" | "events">,
  eventId: string,
  memberId: string
): boolean {
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return false;
  if (ev.createdBy === memberId) return true;
  const org = state.orgs.find((o) => o.id === ev.orgId);
  return !!org?.adminIds.includes(memberId);
}

/** ¿Participa ya del evento?
 *  - Evento PRIVADO: cualquier miembro de la org participa (es el flujo de org).
 *  - Evento PÚBLICO: solo el organizador, los aprobados y quien ya tiene un leg.
 *    (Los demás miembros de la org piden lugar como cualquiera — no se los mete
 *    de oficio, ni se expone el padrón de la org en un viaje público.) */
export function isParticipant(state: AppState, eventId: string, memberId: string): boolean {
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return false;
  if (ev.createdBy === memberId) return true;
  const org = state.orgs.find((o) => o.id === ev.orgId);
  if (ev.visibility === "private" && org?.memberIds.includes(memberId)) return true;
  if (state.legs.some((l) => l.eventId === eventId && l.memberId === memberId)) return true;
  return state.joinRequests.some(
    (r) => r.eventId === eventId && r.memberId === memberId && r.status === "approved"
  );
}

/** Ids de los participantes de un evento: miembros de la org + solicitudes
 *  aprobadas + cualquiera con un leg cargado (dedup). Base del chat del convoy. */
export function participantsOf(
  state: Pick<AppState, "orgs" | "events" | "joinRequests" | "legs">,
  eventId: string
): string[] {
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return [];
  const ids = new Set<string>();
  if (ev.createdBy) ids.add(ev.createdBy);
  // Solo un evento privado suma a todo el padrón de la org; uno público no
  // (mismo criterio que isParticipant: evita exponer/incluir a quien no viaja).
  if (ev.visibility === "private") {
    const org = state.orgs.find((o) => o.id === ev.orgId);
    org?.memberIds.forEach((id) => ids.add(id));
  }
  state.joinRequests
    .filter((r) => r.eventId === eventId && r.status === "approved")
    .forEach((r) => ids.add(r.memberId));
  state.legs.filter((l) => l.eventId === eventId).forEach((l) => ids.add(l.memberId));
  return [...ids];
}

/** Iniciales para el avatar ("Mariana K." → "MK"). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Hue determinístico por id → avatares con color estable. */
export function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function memberById(state: Pick<AppState, "members">, id: string): Member | undefined {
  return state.members.find((m) => m.id === id);
}
