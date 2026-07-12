import type { Feature, LatLng, MatchResult, TimeWindow, Violation } from "../engine/types";
import type { Lang } from "../i18n";
import type { PlanId } from "../services/billing";

export interface Vehicle {
  /** Id estable dentro del garage del miembro (para elegirlo por viaje). */
  id: string;
  /** Alias amistoso: "el Gol", "la camioneta". Opcional; hay fallback legible. */
  alias?: string;
  capacity: number;
  features: Feature[];
  smokeFree: boolean;
  plate?: string;
}

export interface Member {
  id: string;
  name: string;
  subgroup?: string;
  home: LatLng;
  /** Garage: 0..n vehículos. Una persona puede tener auto y moto y elegir por viaje. */
  vehicles: Vehicle[];
  /** Cuándo se unió a la plataforma (para "miembro desde hace X"). */
  joinedISO: string;
  bio?: string;
  /** Email de contacto/cuenta (opcional). La verificación real llega en PR5. */
  email?: string;
  emailVerified?: boolean;
}

/** Reseña post-viaje de un miembro a otro (1–5 estrellas). */
export interface Review {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  stars: number;
  comment?: string;
  at: string;
}

/** Viaje pasado de un miembro (historial visible en su perfil público). */
export interface TripRecord {
  id: string;
  memberId: string;
  title: string;
  dateISO: string;
  role: "driver" | "passenger";
  /** Con quién viajó (para poder calificarlo después). */
  withMemberId?: string;
  withName?: string;
}

export interface MeetingPointDoc {
  id: string;
  name: string;
  loc: LatLng;
}

export interface Org {
  id: string;
  name: string;
  joinCode: string;
  memberIds: string[];
  /** Quiénes pueden administrar eventos de la org (calcular, mover, aceptar solicitudes). */
  adminIds: string[];
  meetingPoints: MeetingPointDoc[];
}

/** private = solo la org. public = descubrible en Explorar; se entra pidiendo lugar. */
export type EventVisibility = "private" | "public";

export interface EventDoc {
  id: string;
  orgId: string;
  title: string;
  dateISO: string;
  destination: LatLng;
  destinationName?: string;
  visibility: EventVisibility;
  /** Organizador: puede administrar el evento aunque no sea admin de la org. */
  createdBy: string;
  /** Texto libre de origen para eventos públicos (ej. "CABA → Mar del Plata"). */
  originName?: string;
}

export type JoinRequestStatus = "pending" | "approved" | "rejected";

/** Pedido de lugar en un evento público (flujo tipo BlaBlaCar). */
export interface JoinRequest {
  id: string;
  eventId: string;
  memberId: string;
  role: Role;
  message?: string;
  status: JoinRequestStatus;
  at: string;
  decidedAt?: string;
}

export type Role = "driver" | "passenger" | "skip";

export interface Leg {
  id: string;
  memberId: string;
  eventId: string;
  role: Role;
  window: TimeWindow;
  /** Punto de salida para ESTA salida; si falta, se usa member.home. */
  origin?: LatLng;
  // driver
  /** Qué vehículo del garage se ofrece en ESTA salida (PR-A2). Si falta, el primero. */
  vehicleId?: string;
  maxDetourMin?: number;
  // passenger
  maxWalkMin?: number;
  needs?: Feature[];
  soft?: { smokeFree?: boolean; subgroup?: string };
}

export interface Assignment {
  result: MatchResult;
  computedAt: string;
  violations: Violation[];
}

export interface Notification {
  id: string;
  memberId: string;
  title: string;
  body: string;
  read: boolean;
  at: string;
}

/** Mensaje del chat de un convoy/salida (comunicación entre participantes). */
export interface ChatMessage {
  id: string;
  eventId: string;
  fromMemberId: string;
  body: string;
  at: string;
}

/** Qué avisos quiere recibir el usuario, por tipo. El canal (push/in-app) lo
 *  decide `notifPermission`; esto decide el contenido. */
export interface NotifPrefs {
  assignments: boolean; // te asignaron / cambió tu viaje
  requests: boolean;    // alguien pidió lugar en tu salida
  chat: boolean;        // mensajes nuevos en un convoy
  email: boolean;       // además, resumen por email (simulado)
}

export interface Settings {
  lang: Lang;
  theme: "system" | "dark" | "light";
  plan: PlanId;
  notifPermission: boolean;
  /** false hasta que el usuario completa el wizard de bienvenida. */
  onboarded: boolean;
  notifPrefs: NotifPrefs;
}

export interface AppState {
  version: 4;
  meId: string;
  orgs: Org[];
  members: Member[];
  events: EventDoc[];
  legs: Leg[];
  assignments: Record<string, Assignment>;
  notifications: Notification[];
  joinRequests: JoinRequest[];
  reviews: Review[];
  tripHistory: TripRecord[];
  messages: ChatMessage[];
  settings: Settings;
  activeOrgId: string;
}
