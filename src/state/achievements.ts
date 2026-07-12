/**
 * Logros e "completá tu perfil" — derivados puros del estado (PR-E1).
 * No se almacenan: se calculan de tripHistory + reviews + vehicles + antigüedad.
 * Base para futuros niveles de confianza. Sin React.
 */
import type { AppState, Member } from "./model";
import { ratingOf, tripCountOf } from "./reputation";
import { hasVehicle } from "./vehicles";

export interface Achievement {
  id: string;
  emoji: string;
  earned: boolean;
}

/** Catálogo de logros con su condición. El orden es el de exhibición. */
export function achievementsOf(
  state: Pick<AppState, "reviews" | "tripHistory" | "members">,
  memberId: string
): Achievement[] {
  const m = state.members.find((x) => x.id === memberId);
  const trips = tripCountOf(state, memberId);
  const rating = ratingOf(state, memberId);
  const vehicles = m?.vehicles.length ?? 0;
  return [
    { id: "firstTrip", emoji: "🎉", earned: trips.total >= 1 },
    { id: "tenTrips", emoji: "🔟", earned: trips.total >= 10 },
    { id: "driver", emoji: "🚗", earned: trips.asDriver >= 1 },
    { id: "frequentDriver", emoji: "🛣️", earned: trips.asDriver >= 5 },
    { id: "topRated", emoji: "🌟", earned: rating.count >= 3 && (rating.avg ?? 0) >= 4.8 },
    { id: "garage", emoji: "🔧", earned: vehicles >= 2 }
  ];
}

export function earnedCount(list: Achievement[]): number {
  return list.filter((a) => a.earned).length;
}

/** Pasos para "completá tu perfil": cada uno con su clave i18n y si está hecho. */
export interface CompletionStep {
  key: string; // clave i18n del texto del paso
  done: boolean;
}

export function profileCompletion(m: Member): { pct: number; steps: CompletionStep[] } {
  const steps: CompletionStep[] = [
    { key: "complete.name", done: m.name.trim().length > 0 && m.name !== "Vos" },
    { key: "complete.email", done: !!m.emailVerified },
    { key: "complete.vehicle", done: hasVehicle(m) },
    { key: "complete.bio", done: !!m.bio?.trim() },
    { key: "complete.subgroup", done: !!m.subgroup?.trim() }
  ];
  const done = steps.filter((s) => s.done).length;
  return { pct: Math.round((done / steps.length) * 100), steps };
}
