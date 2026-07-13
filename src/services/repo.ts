/**
 * Repositorio Supabase — mapea filas (snake_case) ↔ modelo v4 (camelCase) y
 * espeja las acciones del store a la base. TODO acá corre SOLO cuando
 * `hasSupabase` es true (dev/prod con backend real): en test/e2e/single el
 * cliente es null y estas funciones no se invocan.
 *
 * Invariantes:
 *  - RLS filtra qué filas ve cada usuario: los SELECT traen "lo compartido".
 *  - Los writes que RLS prohíbe (notifs de otros) NO se espejan: quedan locales.
 *  - Cada write va en try/catch: un fallo de red loguea y no rompe la UI.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { Action } from "../state/store";
import type {
  AppState,
  Assignment,
  ChatMessage,
  EventDoc,
  EventVisibility,
  JoinRequest,
  JoinRequestStatus,
  Leg,
  Member,
  MeetingPointDoc,
  NotifPrefs,
  Org,
  Review,
  Role,
  Settings,
  TripDefaults,
  TripRecord,
  Vehicle
} from "../state/model";
import type { LatLng, MatchResult, Violation } from "../engine/types";
import type { Lang } from "../i18n";
import type { PlanId } from "./billing";

/** Cliente garantizado no-nulo (sólo se llama con hasSupabase). */
function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase no configurado");
  return supabase;
}

/* ============================ tipos de fila ============================ */

interface MemberRow {
  id: string;
  name: string;
  subgroup: string | null;
  vehicles: Vehicle[] | null;
  defaults: TripDefaults | null;
  joined_at: string;
  bio: string | null;
  email: string | null;
  email_verified: boolean | null;
  auth_user_id: string | null;
}
interface MemberHomeRow {
  member_id: string;
  lat: number;
  lng: number;
}
interface OrgRow {
  id: string;
  name: string;
  join_code: string;
  meeting_points: { id: string; name: string; lat: number; lng: number }[] | null;
}
interface OrgMemberRow {
  org_id: string;
  member_id: string;
  is_admin: boolean;
}
interface EventRow {
  id: string;
  org_id: string;
  title: string;
  date: string;
  destination_lat: number;
  destination_lng: number;
  destination_name: string | null;
  visibility: EventVisibility;
  created_by: string;
  origin_name: string | null;
}
interface LegRow {
  id: string;
  member_id: string;
  event_id: string;
  role: Role;
  window_start: number;
  window_end: number;
  origin_lat: number | null;
  origin_lng: number | null;
  vehicle_id: string | null;
  max_detour_min: number | null;
  max_walk_min: number | null;
  needs: Leg["needs"] | null;
  soft: Leg["soft"] | null;
}
interface JoinRequestRow {
  id: string;
  event_id: string;
  member_id: string;
  role: Role;
  message: string | null;
  status: JoinRequestStatus;
  created_at: string;
  decided_at: string | null;
}
interface ReviewRow {
  id: string;
  from_member_id: string;
  to_member_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}
interface MessageRow {
  id: string;
  event_id: string;
  from_member_id: string;
  body: string;
  created_at: string;
}
interface AssignmentRow {
  event_id: string;
  result: MatchResult;
  computed_at: string;
  violations: Violation[] | null;
}
interface TripHistoryRow {
  id: string;
  member_id: string;
  title: string;
  date: string;
  role: "driver" | "passenger";
  with_member_id: string | null;
  with_name: string | null;
}
interface SettingsRow {
  member_id: string;
  lang: Lang;
  theme: Settings["theme"];
  plan: PlanId;
  onboarded: boolean;
  notif_permission: boolean;
  notif_prefs: NotifPrefs | null;
  hour12: boolean | null;
  fuel_price_per_l: number | null;
}

/* ============================ mappers row→modelo ============================ */

function toMember(row: MemberRow, home?: MemberHomeRow): Member {
  return {
    id: row.id,
    name: row.name,
    subgroup: row.subgroup ?? undefined,
    // Sin fila member_home → sin casa (undefined). NUNCA {0,0}: cada viaje elige
    // su propio origen y el motor jamás debe matchear contra la isla nula.
    home: home ? { lat: home.lat, lng: home.lng } : undefined,
    vehicles: row.vehicles ?? [],
    defaults: row.defaults ?? undefined,
    joinedISO: row.joined_at,
    bio: row.bio ?? undefined,
    email: row.email ?? undefined,
    emailVerified: row.email_verified ?? undefined
  };
}

function toOrg(row: OrgRow, orgMembers: OrgMemberRow[]): Org {
  const mine = orgMembers.filter((om) => om.org_id === row.id);
  const meetingPoints: MeetingPointDoc[] = (row.meeting_points ?? []).map((mp) => ({
    id: mp.id,
    name: mp.name,
    loc: { lat: mp.lat, lng: mp.lng }
  }));
  return {
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    memberIds: mine.map((om) => om.member_id),
    adminIds: mine.filter((om) => om.is_admin).map((om) => om.member_id),
    meetingPoints
  };
}

function toEvent(row: EventRow): EventDoc {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    dateISO: row.date,
    destination: { lat: row.destination_lat, lng: row.destination_lng },
    destinationName: row.destination_name ?? undefined,
    visibility: row.visibility,
    createdBy: row.created_by,
    originName: row.origin_name ?? undefined
  };
}

function toLeg(row: LegRow): Leg {
  const origin: LatLng | undefined =
    row.origin_lat != null && row.origin_lng != null
      ? { lat: row.origin_lat, lng: row.origin_lng }
      : undefined;
  return {
    id: row.id,
    memberId: row.member_id,
    eventId: row.event_id,
    role: row.role,
    window: { start: row.window_start, end: row.window_end },
    origin,
    vehicleId: row.vehicle_id ?? undefined,
    maxDetourMin: row.max_detour_min ?? undefined,
    maxWalkMin: row.max_walk_min ?? undefined,
    needs: row.needs ?? undefined,
    soft: row.soft ?? undefined
  };
}

function toJoinRequest(row: JoinRequestRow): JoinRequest {
  return {
    id: row.id,
    eventId: row.event_id,
    memberId: row.member_id,
    role: row.role,
    message: row.message ?? undefined,
    status: row.status,
    at: row.created_at,
    decidedAt: row.decided_at ?? undefined
  };
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    stars: row.stars,
    comment: row.comment ?? undefined,
    at: row.created_at
  };
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    eventId: row.event_id,
    fromMemberId: row.from_member_id,
    body: row.body,
    at: row.created_at
  };
}

function toAssignment(row: AssignmentRow): Assignment {
  return { result: row.result, computedAt: row.computed_at, violations: row.violations ?? [] };
}

function toTripRecord(row: TripHistoryRow): TripRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    title: row.title,
    dateISO: row.date,
    role: row.role,
    withMemberId: row.with_member_id ?? undefined,
    withName: row.with_name ?? undefined
  };
}

const DEFAULT_SETTINGS: Settings = {
  lang: "es",
  theme: "system",
  plan: "free",
  notifPermission: false,
  onboarded: false,
  notifPrefs: { assignments: true, requests: true, chat: true, email: false }
};

function toSettings(row: SettingsRow): Settings {
  return {
    lang: row.lang,
    theme: row.theme,
    plan: row.plan,
    onboarded: row.onboarded,
    notifPermission: row.notif_permission,
    notifPrefs: row.notif_prefs ?? DEFAULT_SETTINGS.notifPrefs,
    hour12: row.hour12 ?? undefined,
    fuelPricePerL: row.fuel_price_per_l ?? undefined
  };
}

/* ============================ mappers modelo→row ============================ */

function memberToRow(m: Member) {
  // OJO: NO incluimos auth_user_id → el upsert no lo pisa (lo fija el bootstrap).
  return {
    id: m.id,
    name: m.name,
    subgroup: m.subgroup ?? null,
    vehicles: m.vehicles,
    defaults: m.defaults ?? null,
    joined_at: m.joinedISO,
    bio: m.bio ?? null,
    email: m.email ?? null,
    email_verified: m.emailVerified ?? null
  };
}

function eventToRow(e: EventDoc) {
  return {
    id: e.id,
    org_id: e.orgId,
    title: e.title,
    date: e.dateISO,
    destination_lat: e.destination.lat,
    destination_lng: e.destination.lng,
    destination_name: e.destinationName ?? null,
    visibility: e.visibility,
    created_by: e.createdBy,
    origin_name: e.originName ?? null
  };
}

function legToRow(l: Leg) {
  return {
    id: l.id,
    member_id: l.memberId,
    event_id: l.eventId,
    role: l.role,
    window_start: l.window.start,
    window_end: l.window.end,
    origin_lat: l.origin?.lat ?? null,
    origin_lng: l.origin?.lng ?? null,
    vehicle_id: l.vehicleId ?? null,
    max_detour_min: l.maxDetourMin ?? null,
    max_walk_min: l.maxWalkMin ?? null,
    needs: l.needs ?? null,
    soft: l.soft ?? null
  };
}

function joinRequestToRow(r: JoinRequest) {
  return {
    id: r.id,
    event_id: r.eventId,
    member_id: r.memberId,
    role: r.role,
    message: r.message ?? null,
    status: r.status,
    created_at: r.at,
    decided_at: r.decidedAt ?? null
  };
}

function reviewToRow(r: Review) {
  return {
    id: r.id,
    from_member_id: r.fromMemberId,
    to_member_id: r.toMemberId,
    stars: r.stars,
    comment: r.comment ?? null,
    created_at: r.at
  };
}

function messageToRow(m: ChatMessage) {
  return { id: m.id, event_id: m.eventId, from_member_id: m.fromMemberId, body: m.body, created_at: m.at };
}

function settingsToRow(memberId: string, s: Settings) {
  return {
    member_id: memberId,
    lang: s.lang,
    theme: s.theme,
    plan: s.plan,
    onboarded: s.onboarded,
    notif_permission: s.notifPermission,
    notif_prefs: s.notifPrefs,
    hour12: s.hour12 ?? null,
    fuel_price_per_l: s.fuelPricePerL ?? null
  };
}

/* ============================ bootstrap del miembro ============================ */

/** Nombre del alta: user_metadata.name (lo setea signUpWithPassword) o, como
 *  fallback, la parte local del email. */
function nameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const metaName = meta && typeof meta.name === "string" ? meta.name.trim() : "";
  if (metaName) return metaName;
  const email = user.email ?? "";
  return email ? email.split("@")[0] : "Yo";
}

/**
 * Asegura que exista un `members` ligado a `auth_user_id = user.id`. Si no, crea
 * el miembro (id nuevo, nombre del metadata/alta). NO inserta member_home: no hay
 * casa al registrarse (cada viaje elige su origen). Además garantiza la fila
 * `member_settings` con `onboarded: true`, para que el gate de onboarding no
 * dispare nunca en cuentas reales. Devuelve el `meId`.
 */
export async function bootstrapMember(user: User): Promise<string> {
  const client = db();
  const { data: existing } = await client
    .from("members")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let meId: string;
  if (existing && (existing as { id: string }).id) {
    meId = (existing as { id: string }).id;
  } else {
    meId = crypto.randomUUID();
    const email = user.email ?? undefined;
    await client.from("members").insert({
      id: meId,
      auth_user_id: user.id,
      name: nameFromUser(user),
      email: email ?? null,
      email_verified: true, // el email de la cuenta ya está confirmado al llegar acá
      joined_at: new Date().toISOString(),
      vehicles: []
    });
  }

  // member_settings con onboarded:true. ignoreDuplicates: NO pisa los ajustes de
  // un usuario que vuelve; solo crea la fila si falta (cuenta nueva → sin wizard).
  await client
    .from("member_settings")
    .upsert(settingsToRow(meId, { ...DEFAULT_SETTINGS, onboarded: true }), {
      onConflict: "member_id",
      ignoreDuplicates: true
    });

  return meId;
}

/* ============================ carga completa ============================ */

/** SELECT de todas las tablas compartidas (RLS filtra) → AppState v4 completo. */
export async function loadRemote(meId: string): Promise<AppState> {
  const client = db();
  const [
    membersRes,
    homesRes,
    orgsRes,
    orgMembersRes,
    eventsRes,
    legsRes,
    joinReqRes,
    reviewsRes,
    messagesRes,
    assignmentsRes,
    tripHistRes,
    settingsRes
  ] = await Promise.all([
    client.from("members").select("*"),
    client.from("member_home").select("*"),
    client.from("orgs").select("*"),
    client.from("org_members").select("*"),
    client.from("events").select("*"),
    client.from("legs").select("*"),
    client.from("join_requests").select("*"),
    client.from("reviews").select("*"),
    client.from("messages").select("*"),
    client.from("assignments").select("*"),
    client.from("trip_history").select("*"),
    client.from("member_settings").select("*").eq("member_id", meId).maybeSingle()
  ]);

  const homeRows = (homesRes.data ?? []) as MemberHomeRow[];
  const homes = new Map(homeRows.map((h) => [h.member_id, h]));
  const members = ((membersRes.data ?? []) as MemberRow[]).map((r) => toMember(r, homes.get(r.id)));
  const orgMembers = (orgMembersRes.data ?? []) as OrgMemberRow[];
  const orgs = ((orgsRes.data ?? []) as OrgRow[]).map((r) => toOrg(r, orgMembers));
  const events = ((eventsRes.data ?? []) as EventRow[]).map(toEvent);
  const legs = ((legsRes.data ?? []) as LegRow[]).map(toLeg);
  const joinRequests = ((joinReqRes.data ?? []) as JoinRequestRow[]).map(toJoinRequest);
  const reviews = ((reviewsRes.data ?? []) as ReviewRow[]).map(toReview);
  const messages = ((messagesRes.data ?? []) as MessageRow[]).map(toMessage);
  const tripHistory = ((tripHistRes.data ?? []) as TripHistoryRow[]).map(toTripRecord);

  const assignments: Record<string, Assignment> = {};
  for (const a of (assignmentsRes.data ?? []) as AssignmentRow[]) assignments[a.event_id] = toAssignment(a);

  const settingsRow = settingsRes.data as SettingsRow | null;
  const settings = settingsRow ? toSettings(settingsRow) : { ...DEFAULT_SETTINGS };

  return {
    version: 4,
    meId,
    orgs,
    members,
    events,
    legs,
    assignments,
    notifications: [],
    joinRequests,
    reviews,
    tripHistory,
    messages,
    settings,
    activeOrgId: orgs[0]?.id ?? ""
  };
}

/* ============================ espejo de acciones ============================ */

/**
 * Espeja a la base las acciones que representan un cambio del usuario. Ignora
 * las locales (avisos, hydrate, reset, org activa). Nunca tira: loguea y sigue.
 */
export async function writeAction(action: Action, stateBefore: AppState): Promise<void> {
  if (!supabase) return;
  const client = supabase;
  try {
    switch (action.type) {
      case "setLeg":
        await client.from("legs").upsert(legToRow(action.leg));
        break;
      case "removeLeg":
        await client.from("legs").delete().eq("member_id", action.memberId).eq("event_id", action.eventId);
        break;
      case "setAssignment":
        await client.from("assignments").upsert(
          {
            event_id: action.eventId,
            result: action.assignment.result,
            computed_at: action.assignment.computedAt,
            violations: action.assignment.violations
          },
          { onConflict: "event_id" }
        );
        break;
      case "invalidateAssignments":
        if (action.eventIds.length) await client.from("assignments").delete().in("event_id", action.eventIds);
        break;
      case "addEvent":
        await client.from("events").insert(eventToRow(action.event));
        break;
      case "addJoinRequest":
        await client.from("join_requests").insert(joinRequestToRow(action.request));
        break;
      case "decideJoinRequest":
        await client
          .from("join_requests")
          .update({ status: action.status, decided_at: action.decidedAt })
          .eq("id", action.requestId);
        break;
      case "addReview":
        await client
          .from("reviews")
          .upsert(reviewToRow(action.review), { onConflict: "from_member_id,to_member_id" });
        break;
      case "addMessage":
        await client.from("messages").insert(messageToRow(action.message));
        break;
      case "updateMember":
        await client.from("members").update(memberToRow(action.member)).eq("id", action.member.id);
        // Casa opcional: si existe la guardamos; si el usuario la borró, quitamos
        // la fila. Nunca escribimos {0,0}.
        if (action.member.home) {
          await client
            .from("member_home")
            .upsert(
              { member_id: action.member.id, lat: action.member.home.lat, lng: action.member.home.lng },
              { onConflict: "member_id" }
            );
        } else {
          await client.from("member_home").delete().eq("member_id", action.member.id);
        }
        break;
      case "setSettings":
        await client
          .from("member_settings")
          .upsert(settingsToRow(stateBefore.meId, { ...stateBefore.settings, ...action.patch }), {
            onConflict: "member_id"
          });
        break;
      // Locales a propósito (return): addNotifs, markNotifsRead, hydrate, reset, setActiveOrg.
      default:
        break;
    }
  } catch (e) {
    console.warn("[repo] writeAction falló", action.type, e);
  }
}

/* ============================ realtime ============================ */

/** Suscribe a cambios en las tablas compartidas; devuelve una función de cleanup. */
export function subscribeRealtime(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const tables = [
    "events",
    "legs",
    "join_requests",
    "assignments",
    "messages",
    "reviews",
    "org_members",
    "members"
  ];
  const channel = client.channel("convoyar-realtime");
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
  }
  channel.subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
