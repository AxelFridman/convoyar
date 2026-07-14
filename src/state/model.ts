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

/** Preferencias por defecto que precargan un viaje nuevo (PR-B2). Todo opcional. */
export interface TripDefaults {
  /** Rol que se sugiere al abrir una salida nueva. */
  role?: "driver" | "passenger";
  /** Ventana horaria habitual (min desde 00:00). */
  window?: TimeWindow;
  /** Caminata máxima habitual (pasajero). */
  maxWalkMin?: number;
  /** Desvío máximo habitual (conductor). */
  maxDetourMin?: number;
  /** Necesidades que suelo tener (silla de ruedas, mascota, etc.). */
  needs?: Feature[];
  /** Prefiero auto libre de humo. */
  smokeFree?: boolean;
}

export interface Member {
  id: string;
  name: string;
  subgroup?: string;
  /** Casa/punto de partida por defecto. Opcional: no se fija en el alta; cada
   *  viaje elige su propio origen. Si existe, se ofrece como atajo/predeterminado. */
  home?: LatLng;
  /** Garage: 0..n vehículos. Una persona puede tener auto y moto y elegir por viaje. */
  vehicles: Vehicle[];
  /** Preferencias que precargan viajes nuevos (opcional). */
  defaults?: TripDefaults;
  /** Cuándo se unió a la plataforma (para "miembro desde hace X"). */
  joinedISO: string;
  bio?: string;
  /** Email de contacto/cuenta (opcional). La verificación real llega en PR5. */
  email?: string;
  emailVerified?: boolean;
  /** Estado de moderación. 'paused' = reportado, en revisión humana: no puede
   *  operar (el server bloquea las escrituras; la UI lo refleja). Ausente = activo. */
  status?: "active" | "paused";
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
  /** Link/código self-serve (tipo Google Drive): ON = cualquiera con el código se
   *  une solo; OFF = solo el admin agrega a mano por email. Ausente = OFF. */
  linkEnabled?: boolean;
  /** Destino COMÚN del grupo (el nodo al que todos van: el club, el colegio, la
   *  cancha). Las salidas/ramas del grupo lo heredan por defecto. Opcional. */
  destination?: LatLng;
  destinationName?: string;
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
  /** Formato de hora. Opcional (default 24h) → no requiere bump de versión. */
  hour12?: boolean;
  /** Precio del litro de nafta para el aporte sugerido (informativo). 0/undefined = ocultar. */
  fuelPricePerL?: number;
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
  /** A quién bloqueé (moderación personal): no veo su contenido. Cross-user en
   *  Supabase viene de `member_blocks`; en local se maneja por reducer. */
  blockedIds: string[];
}
