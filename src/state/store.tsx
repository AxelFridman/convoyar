import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from "react";
import type {
  AppState,
  Assignment,
  ChatMessage,
  EventDoc,
  JoinRequest,
  Leg,
  Member,
  Notification,
  Org,
  Review,
  Settings
} from "./model";
import { buildSeed } from "../seed";
import { loadState, saveState, clearState } from "../services/storage";
import { MockRoutingProvider } from "../engine/routing";
import { solveMatching, validateMatch, applyManualMove } from "../engine/matching";
import type { DriverLeg, LatLng, MatchInput, MatchResult, PassengerLeg } from "../engine/types";
import { minutesToHHMM } from "../engine/geo";
import { systemNotify } from "../services/notify";
import { canReview, participantsOf } from "./reputation";
import { legVehicle } from "./vehicles";
import { translate, type Lang, type TKey } from "../i18n";
import { hasSupabase, supabase } from "../services/supabaseClient";
import {
  bootstrapMember,
  loadRemote,
  rpcAddMemberByEmail,
  rpcBlockMember,
  rpcCreateOrg,
  rpcCreatePublicTrip,
  rpcDeleteAccount,
  rpcJoinOrgByCode,
  rpcSetOrgDestination,
  rpcLeaveOrg,
  rpcReportMember,
  rpcSetOrgLink,
  rpcUnblockMember,
  subscribeRealtime,
  writeAction
} from "../services/repo";
import type { Session } from "@supabase/supabase-js";

export type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "setLeg"; leg: Leg }
  | { type: "removeLeg"; memberId: string; eventId: string }
  | { type: "setAssignment"; eventId: string; assignment: Assignment }
  | { type: "invalidateAssignments"; eventIds: string[] }
  | { type: "addNotifs"; notifs: Notification[] }
  | { type: "markNotifsRead" }
  | { type: "updateMember"; member: Member }
  | { type: "addEvent"; event: EventDoc }
  | { type: "addJoinRequest"; request: JoinRequest }
  | { type: "decideJoinRequest"; requestId: string; status: "approved" | "rejected"; decidedAt: string }
  | { type: "addReview"; review: Review }
  | { type: "addMessage"; message: ChatMessage }
  | { type: "setSettings"; patch: Partial<Settings> }
  | { type: "setActiveOrg"; orgId: string }
  | { type: "addOrg"; org: Org }
  | { type: "updateOrg"; org: Org }
  | { type: "blockMember"; memberId: string }
  | { type: "unblockMember"; memberId: string }
  | { type: "reset" };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "hydrate":
      return a.state;
    case "setLeg": {
      const rest = s.legs.filter(
        (l) => !(l.memberId === a.leg.memberId && l.eventId === a.leg.eventId)
      );
      return { ...s, legs: [...rest, a.leg] };
    }
    case "removeLeg":
      return {
        ...s,
        legs: s.legs.filter((l) => !(l.memberId === a.memberId && l.eventId === a.eventId))
      };
    case "setAssignment":
      return { ...s, assignments: { ...s.assignments, [a.eventId]: a.assignment } };
    case "invalidateAssignments": {
      // Descarta asignaciones que quedaron obsoletas (ej. cambió el garage de un
      // conductor): mejor "sin calcular" que un convoy corrupto. El admin recalcula.
      if (a.eventIds.length === 0) return s;
      const assignments = { ...s.assignments };
      for (const id of a.eventIds) delete assignments[id];
      return { ...s, assignments };
    }
    case "addNotifs":
      return { ...s, notifications: [...a.notifs, ...s.notifications].slice(0, 100) };
    case "markNotifsRead":
      return { ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) };
    case "updateMember":
      return { ...s, members: s.members.map((m) => (m.id === a.member.id ? a.member : m)) };
    case "addEvent":
      return { ...s, events: [...s.events, a.event] };
    case "addJoinRequest":
      return { ...s, joinRequests: [...s.joinRequests, a.request] };
    case "decideJoinRequest":
      return {
        ...s,
        joinRequests: s.joinRequests.map((r) =>
          r.id === a.requestId ? { ...r, status: a.status, decidedAt: a.decidedAt } : r
        )
      };
    case "addReview": {
      // Una reseña por par autor→destinatario: la nueva reemplaza la anterior
      // (evita inflar/hundir el rating repitiendo reseñas).
      const rest = s.reviews.filter(
        (r) => !(r.fromMemberId === a.review.fromMemberId && r.toMemberId === a.review.toMemberId)
      );
      return { ...s, reviews: [...rest, a.review] };
    }
    case "addMessage":
      return { ...s, messages: [...s.messages, a.message].slice(-500) };
    case "setSettings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case "setActiveOrg":
      return { ...s, activeOrgId: a.orgId };
    case "addOrg":
      return { ...s, orgs: [...s.orgs, a.org] };
    case "updateOrg":
      return { ...s, orgs: s.orgs.map((o) => (o.id === a.org.id ? a.org : o)) };
    case "blockMember":
      return s.blockedIds.includes(a.memberId)
        ? s
        : { ...s, blockedIds: [...s.blockedIds, a.memberId] };
    case "unblockMember":
      return { ...s, blockedIds: s.blockedIds.filter((id) => id !== a.memberId) };
    case "reset":
      return buildSeed();
    default:
      return s;
  }
}

/* ---------- estado de la app → input del motor ---------- */
export function buildMatchInput(s: AppState, eventId: string, legsOverride?: Leg[]): MatchInput | null {
  const ev = s.events.find((e) => e.id === eventId);
  if (!ev) return null;
  const org = s.orgs.find((o) => o.id === ev.orgId);
  const byId = new Map(s.members.map((m) => [m.id, m]));
  const drivers: DriverLeg[] = [];
  const passengers: PassengerLeg[] = [];
  const legs = (legsOverride ?? s.legs).filter((l) => l.eventId === eventId);
  for (const leg of legs) {
    const m = byId.get(leg.memberId);
    if (!m) continue;
    // Origen del viaje: el del leg o, como atajo, la casa del miembro. Si no hay
    // NINGUNO, el leg no tiene punto de salida: lo excluimos del cálculo (jamás
    // matcheamos contra {0,0}). Los pasajeros sin origen se marcan "sin asignar"
    // aparte (ver unlocatablePassengerLegIds + runMatch).
    const origin = leg.origin ?? m.home;
    if (!origin) continue;
    // El vehículo del viaje: el elegido en el leg (PR-A2) o el primero del garage.
    const veh = leg.role === "driver" ? legVehicle(m, leg.vehicleId) : null;
    if (leg.role === "driver" && veh) {
      drivers.push({
        id: leg.id,
        memberId: m.id,
        vehicleId: veh.id,
        origin,
        destination: ev.destination,
        window: leg.window,
        capacity: veh.capacity,
        maxDetourMin: leg.maxDetourMin ?? 20,
        features: veh.features,
        prefs: { subgroup: m.subgroup, smokeFree: veh.smokeFree }
      });
    } else if (leg.role === "passenger") {
      passengers.push({
        id: leg.id,
        memberId: m.id,
        origin,
        destination: ev.destination,
        window: leg.window,
        maxWalkMin: leg.maxWalkMin ?? 10,
        needs: leg.needs ?? [],
        prefs: { subgroup: leg.soft?.subgroup, smokeFree: leg.soft?.smokeFree }
      });
    }
  }
  return {
    drivers,
    passengers,
    meetingPoints: (org?.meetingPoints ?? []).map((mp) => ({ id: mp.id, name: mp.name, pos: mp.loc })),
    options: { doorToDoor: true }
  };
}

/**
 * Legs de pasajero de un evento que NO tienen punto de salida (ni leg.origin ni
 * casa del miembro). buildMatchInput los excluye del cálculo; acá los listamos
 * para marcarlos "sin asignar" con el motivo existente más cercano (caminata:
 * no hay punto de recogida alcanzable si no sabemos desde dónde salen).
 */
export function unlocatablePassengerLegIds(s: AppState, eventId: string, legsOverride?: Leg[]): string[] {
  const byId = new Map(s.members.map((m) => [m.id, m]));
  return (legsOverride ?? s.legs)
    .filter((l) => l.eventId === eventId && l.role === "passenger")
    .filter((l) => {
      const m = byId.get(l.memberId);
      return !!m && !(l.origin ?? m.home);
    })
    .map((l) => l.id);
}

/* ---------- diff de asignaciones → avisos ---------- */
function diffNotifs(
  s: AppState,
  eventId: string,
  prev: MatchResult | null,
  next: MatchResult
): Notification[] {
  const lang = s.settings.lang;
  const hour12 = !!s.settings.hour12;
  const hhmm = (min: number) => minutesToHHMM(min, hour12);
  const T = (k: TKey, vars?: Record<string, string | number>) => translate(lang, k, vars);
  const ev = s.events.find((e) => e.id === eventId);
  const org = s.orgs.find((o) => o.id === ev?.orgId);
  const mpName = (id?: string) =>
    id ? org?.meetingPoints.find((m) => m.id === id)?.name ?? T("common.door") : T("common.door");
  const legMember = new Map(s.legs.map((l) => [l.id, l.memberId]));
  const name = (memberId?: string) => s.members.find((m) => m.id === memberId)?.name ?? "?";

  const prevDriverOf = new Map<string, string>();
  const prevPaxOf = new Map<string, string[]>();
  if (prev) {
    for (const r of prev.rides) {
      prevPaxOf.set(r.driverLegId, [...r.passengerLegIds].sort());
      for (const p of r.passengerLegIds) prevDriverOf.set(p, r.driverLegId);
    }
  }

  const out: Notification[] = [];
  const now = new Date().toISOString();
  let seq = 0;
  const push = (memberId: string, title: string, body: string) =>
    out.push({ id: `n-${Date.now()}-${seq++}`, memberId, title, body, read: false, at: now });

  for (const r of next.rides) {
    const dMemberId = legMember.get(r.driverLegId);
    for (const pLeg of r.passengerLegIds) {
      const pMemberId = legMember.get(pLeg);
      if (!pMemberId || !dMemberId) continue;
      const pickup = r.stops.find((st) => st.kind === "pickup" && st.passengerLegId === pLeg);
      const vars = {
        name: name(dMemberId),
        time: pickup ? hhmm(pickup.etaMin) : hhmm(r.departureMin),
        place: mpName(pickup?.meetingPointId)
      };
      const was = prevDriverOf.get(pLeg);
      if (!was) push(pMemberId, T("notif.assignedTitle"), T("notif.assignedBody", vars));
      else if (was !== r.driverLegId) push(pMemberId, T("notif.changedTitle"), T("notif.changedBody", vars));
    }
    if (dMemberId && r.passengerLegIds.length) {
      const nowPax = [...r.passengerLegIds].sort().join(",");
      const before = (prevPaxOf.get(r.driverLegId) ?? []).join(",");
      if (nowPax !== before) {
        push(
          dMemberId,
          T("notif.driverTitle"),
          T("notif.driverBody", { n: r.passengerLegIds.length, time: hhmm(r.departureMin) })
        );
      }
    }
  }
  for (const u of next.unassigned) {
    const pMemberId = legMember.get(u.passengerLegId);
    if (!pMemberId) continue;
    const wasAssigned = prevDriverOf.has(u.passengerLegId);
    if (wasAssigned || !prev) {
      push(
        pMemberId,
        T("notif.unassignedTitle"),
        T("notif.unassignedBody", { reason: T(`reason.${u.reason}` as TKey) })
      );
    }
  }
  return out;
}

/* ---------- flujo público: leg por defecto para un admitido ---------- */
export function defaultPassengerLeg(s: AppState, eventId: string, memberId: string): Leg | null {
  const ev = s.events.find((e) => e.id === eventId);
  const m = s.members.find((x) => x.id === memberId);
  if (!ev || !m) return null;
  const d = new Date(ev.dateISO);
  const evMin = d.getHours() * 60 + d.getMinutes();
  // Id estable: si ya había un leg, se conserva (los assignments referencian por id).
  const existing = s.legs.find((l) => l.memberId === memberId && l.eventId === eventId);
  return {
    id: existing?.id ?? `leg-${memberId}-${eventId}`,
    memberId,
    eventId,
    role: "passenger",
    // Atajo: si el miembro tiene casa, la usamos como origen por defecto; si no,
    // queda sin origin (el pasajero lo elige por viaje desde "Mi viaje").
    origin: m.home,
    // Ventana amplia alrededor de la hora del evento: en viajes interurbanos esa
    // hora suele ser la SALIDA del conductor, y la recogida puede caer después.
    // El aceptado la ajusta luego desde "Mi viaje".
    window: { start: Math.max(0, evMin - 90), end: Math.min(1439, evMin + 90) },
    maxWalkMin: 10,
    needs: []
  };
}

/** Código de invitación local (modo demo): 6 chars sin ambigüedades (0/O, 1/I).
 *  Con backend real el código lo genera `create_org` en Postgres. */
function genJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ---------- contexto ---------- */
interface Store {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  runMatch: (eventId: string, opts?: { warmStart?: boolean; legsOverride?: Leg[] }) => Promise<void>;
  manualMove: (
    eventId: string,
    passengerLegId: string,
    targetDriverLegId: string | null
  ) => Promise<string[]>;
  cancelDriver: (eventId: string, driverLegId: string) => Promise<void>;
  /** Pide lugar en un evento público (demo: el organizador responde solo). */
  requestJoin: (eventId: string) => void;
  /** Acepta/rechaza una solicitud de tu evento; al aceptar suma el leg y recalcula si hacía falta. */
  decideRequest: (requestId: string, approve: boolean) => Promise<void>;
  /** Reseña de 1–5 estrellas de meId hacia otro miembro. */
  rateMember: (toMemberId: string, stars: number, comment?: string) => void;
  /** Publica un mensaje en el chat de un convoy (demo: alguien responde solo). */
  sendMessage: (eventId: string, body: string) => void;
  /** Crea un grupo nuevo (quedás admin) y lo deja activo. `destination` = nodo común
   *  al que van todas las salidas del grupo (opcional). */
  createOrg: (name: string, destination?: { loc: LatLng; name?: string }) => Promise<void>;
  /** Fija/edita el destino común del grupo (solo admin). */
  setOrgDestination: (orgId: string, loc: LatLng, name?: string) => Promise<void>;
  /** Publica una salida PÚBLICA en un paso (sin elegir grupo): vive en tu espacio
   *  personal, visible en Explorar. Crea tu leg (conductor/pasajero). Devuelve el id. */
  publishPublicTrip: (input: {
    origin: LatLng;
    originName?: string;
    destination: LatLng;
    destinationName?: string;
    role: "driver" | "passenger";
    dateISO: string;
    recurrence?: { days: number[] };
    vehicleId?: string;
  }) => Promise<string>;
  /** Se une a un grupo por código/link; tira si el código no existe o el link
   *  está deshabilitado (la UI muestra "código inválido / link deshabilitado"). */
  joinOrgByCode: (code: string) => Promise<void>;
  /** Admin agrega a alguien por email; tira si no existe ese usuario. */
  addMemberByEmail: (orgId: string, email: string) => Promise<void>;
  /** Admin habilita/deshabilita el link/código self-serve del grupo. */
  setOrgLink: (orgId: string, enabled: boolean) => Promise<void>;
  /** Salir de un grupo. */
  leaveOrg: (orgId: string) => Promise<void>;
  /** Reporta a un miembro (server-side lo pausa hasta revisión humana). */
  reportMember: (memberId: string, reason: string) => Promise<void>;
  /** Bloqueo personal: dejo de ver el contenido del bloqueado. */
  blockMember: (memberId: string) => Promise<void>;
  unblockMember: (memberId: string) => Promise<void>;
  resetDemo: () => void;
  computing: boolean;
  /** Sesión Supabase: undefined = cargando, null = sin sesión, Session = logueado.
   *  Sin backend (test/e2e/single) siempre es null. */
  session: Session | null | undefined;
  /** Cierra la sesión Supabase (no-op sin backend). */
  signOut: () => Promise<void>;
  /** Borra la cuenta del usuario y todos sus datos (derecho al olvido). Con
   *  backend: RPC delete_my_account + signOut. Sin backend: limpia lo local. */
  deleteAccount: () => Promise<void>;
  /** true cuando ya sabemos si hay sesión (siempre true sin backend). */
  authReady: boolean;
  /** true tras la primera hidratación remota exitosa (siempre false sin backend). */
  hydrated: boolean;
  /** true cuando Supabase disparó PASSWORD_RECOVERY (link de reset): App muestra
   *  la pantalla de nueva contraseña. Siempre false sin backend. */
  recovery: boolean;
  /** Limpia el flag de recovery (se llama tras actualizar la contraseña). */
  clearRecovery: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, null as unknown as AppState, () => {
    const loaded = loadState<AppState>();
    // Estado v4 previo a moderación puede no tener `blockedIds`: lo rellenamos
    // acá (sin bump de versión) para no romper cuentas demo ya guardadas.
    if (loaded && loaded.version === 4) return { ...loaded, blockedIds: loaded.blockedIds ?? [] };
    return buildSeed();
  });
  const [computing, setComputing] = useState(false);
  // undefined = todavía cargando la sesión (sólo con backend); null = sin sesión.
  const [session, setSession] = useState<Session | null | undefined>(hasSupabase ? undefined : null);
  // true tras la primera hidratación remota exitosa (siempre false sin backend).
  const [hydrated, setHydrated] = useState(false);
  // true cuando llega el evento PASSWORD_RECOVERY (link de reset de contraseña).
  const [recovery, setRecovery] = useState(false);
  const provider = useMemo(() => new MockRoutingProvider(), []);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionRef = useRef<Session | null | undefined>(session);
  sessionRef.current = session;

  // dispatch envuelto: actualiza el estado local y, si hay backend + sesión,
  // espeja la acción a Supabase. Todos los dispatch(...) de abajo lo usan.
  const dispatch = useCallback((a: Action) => {
    rawDispatch(a);
    if (hasSupabase && sessionRef.current) void writeAction(a, stateRef.current);
  }, []);

  // persistencia debounced
  useEffect(() => {
    const h = setTimeout(() => saveState(state), 250);
    return () => clearTimeout(h);
  }, [state]);

  // tema (system|dark|light) → atributo data-theme
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => {
      const pref = state.settings.theme;
      const dark =
        pref === "dark" ||
        (pref === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
      el.setAttribute("data-theme", dark ? "dark" : "light");
    };
    apply();
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [state.settings.theme]);

  // Sesión Supabase (sólo con backend): confiamos SOLO en onAuthStateChange, que
  // entrega la sesión inicial (INITIAL_SESSION) y los cambios posteriores. Una
  // sola hidratación: al detectar sesión aseguramos el `member` (bootstrap) e
  // hidratamos desde la base preservando lo local.
  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    const client = supabase;
    let cancelled = false;
    const hydrateFor = async (s: Session) => {
      setSession(s);
      try {
        const meId = await bootstrapMember(s.user);
        // Aseguramos la org personal del usuario server-side (la crea si no existe)
        // para que pueda crear salidas. Si la RPC no existe todavía (404) o falla,
        // la ignoramos: el usuario simplemente queda sin org y ve el empty state
        // de Home. loadRemote levanta la org recién creada si la RPC funcionó.
        try {
          const { error: rpcErr } = await client.rpc("ensure_personal_org");
          if (rpcErr) console.warn("[store] ensure_personal_org devolvió error (se ignora)", rpcErr);
        } catch (rpcErr) {
          console.warn("[store] ensure_personal_org falló (se ignora)", rpcErr);
        }
        // Materializa los viajes pasados (evento con fecha cumplida + asignación) en
        // el historial, para que el perfil muestre viajes reales. Idempotente y
        // best-effort: si la RPC no existe todavía o falla, se ignora. Va ANTES de
        // loadRemote para que la hidratación levante las filas recién creadas.
        try {
          const { error: matErr } = await client.rpc("materialize_my_trips");
          if (matErr) console.warn("[store] materialize_my_trips devolvió error (se ignora)", matErr);
        } catch (matErr) {
          console.warn("[store] materialize_my_trips falló (se ignora)", matErr);
        }
        const remote = await loadRemote(meId, s.user.email ?? undefined);
        if (cancelled) return;
        // Preservamos lo local (avisos, org activa) igual que el refresh realtime.
        rawDispatch({
          type: "hydrate",
          state: {
            ...remote,
            notifications: stateRef.current.notifications,
            // Conservar la org activa local SOLO si existe entre las remotas; si no
            // (típico en el primer login: el estado inicial es el seed con "org1"),
            // usar la que trae el backend. Evita el Home vacío indebido.
            activeOrgId: remote.orgs.some((o) => o.id === stateRef.current.activeOrgId)
              ? stateRef.current.activeOrgId
              : remote.activeOrgId
          }
        });
        setHydrated(true);
      } catch (e) {
        console.warn("[store] hidratación remota falló", e);
      }
    };
    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      // Link de reset de contraseña: Supabase abre una sesión de recovery y dispara
      // este evento. Marcamos el flag para que App muestre "nueva contraseña".
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (s) {
        void hydrateFor(s);
      } else {
        // Sin sesión (logout o arranque sin login): limpiamos TODO para que un
        // login posterior de OTRA cuenta no vea datos del usuario anterior.
        clearState();
        rawDispatch({ type: "reset" });
        setSession(null);
        setHydrated(false);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime (sólo con backend + sesión): un cambio en la base recarga el estado
  // con debounce, preservando avisos y org activa locales.
  useEffect(() => {
    if (!hasSupabase || !supabase || !session) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = subscribeRealtime(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const local = stateRef.current;
        try {
          const remote = await loadRemote(local.meId, sessionRef.current?.user?.email ?? undefined);
          rawDispatch({
            type: "hydrate",
            state: {
              ...remote,
              notifications: stateRef.current.notifications,
              activeOrgId: stateRef.current.activeOrgId
            }
          });
        } catch (e) {
          console.warn("[store] refresh realtime falló", e);
        }
      }, 400);
    });
    return () => {
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [session]);

  const runMatch = useCallback(
    async (eventId: string, opts?: { warmStart?: boolean; legsOverride?: Leg[] }) => {
      const s = stateRef.current;
      const input = buildMatchInput(s, eventId, opts?.legsOverride);
      if (!input) return;
      setComputing(true);
      try {
        const prev = s.assignments[eventId]?.result ?? null;
        if (opts?.warmStart && prev) {
          input.options = { ...input.options, warmStart: prev };
        }
        const result = await solveMatching(input, provider);
        const violations = await validateMatch(input, result, provider);
        // Pasajeros sin punto de salida: excluidos del cálculo → los sumamos como
        // "sin asignar" para que se enteren (motivo más cercano: caminata).
        for (const legId of unlocatablePassengerLegIds(s, eventId, opts?.legsOverride)) {
          if (!result.unassigned.some((u) => u.passengerLegId === legId))
            result.unassigned.push({ passengerLegId: legId, reason: "caminata" });
        }
        dispatch({
          type: "setAssignment",
          eventId,
          assignment: { result, computedAt: new Date().toISOString(), violations }
        });
        // Con legsOverride, los avisos deben mirar los legs efectivos del cálculo.
        const sForNotifs = opts?.legsOverride ? { ...s, legs: opts.legsOverride } : s;
        const notifs = diffNotifs(sForNotifs, eventId, prev, result);
        if (notifs.length) {
          dispatch({ type: "addNotifs", notifs });
          const mine = notifs.find((n) => n.memberId === s.meId);
          if (mine && s.settings.notifPermission && s.settings.notifPrefs.assignments)
            systemNotify(mine.title, mine.body);
        }
      } finally {
        setComputing(false);
      }
    },
    [provider]
  );

  const manualMove = useCallback(
    async (eventId: string, passengerLegId: string, targetDriverLegId: string | null) => {
      const s = stateRef.current;
      const input = buildMatchInput(s, eventId);
      const current = s.assignments[eventId];
      if (!input || !current) return [];
      setComputing(true);
      try {
        const { result, violations } = await applyManualMove(
          input,
          current.result,
          passengerLegId,
          targetDriverLegId,
          provider
        );
        dispatch({
          type: "setAssignment",
          eventId,
          assignment: { result, computedAt: new Date().toISOString(), violations }
        });
        const notifs = diffNotifs(s, eventId, current.result, result);
        if (notifs.length) dispatch({ type: "addNotifs", notifs });
        return violations.map((v) => v.detail);
      } finally {
        setComputing(false);
      }
    },
    [provider]
  );

  const cancelDriver = useCallback(
    async (eventId: string, driverLegId: string) => {
      const s = stateRef.current;
      const leg = s.legs.find((l) => l.id === driverLegId);
      if (!leg) return;
      const legsAfter = s.legs.filter((l) => l.id !== driverLegId);
      dispatch({ type: "removeLeg", memberId: leg.memberId, eventId });
      await runMatch(eventId, { warmStart: true, legsOverride: legsAfter });
    },
    [runMatch]
  );

  /* ---- flujo público (tipo BlaBlaCar) ---- */
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Demo local sin backend: el "organizador" de un evento ajeno contesta solo.
  // Con backend real la respuesta llega del otro usuario → no simulamos nada.
  const scheduleSimulatedReply = useCallback((requestId: string, delayMs: number) => {
    if (hasSupabase) return;
    const h = setTimeout(() => {
      const s = stateRef.current;
      const req = s.joinRequests.find((r) => r.id === requestId);
      if (!req || req.status !== "pending") return;
      const ev = s.events.find((e) => e.id === req.eventId);
      if (!ev) return;
      const T = (k: TKey, vars?: Record<string, string | number>) =>
        translate(s.settings.lang, k, vars);
      dispatch({
        type: "decideJoinRequest",
        requestId,
        status: "approved",
        decidedAt: new Date().toISOString()
      });
      const leg = defaultPassengerLeg(s, req.eventId, req.memberId);
      if (leg) dispatch({ type: "setLeg", leg });
      const notif: Notification = {
        id: `n-${Date.now()}-sim`,
        memberId: req.memberId,
        title: T("requests.acceptedNotifTitle"),
        body: T("requests.acceptedNotifBody", { title: ev.title }),
        read: false,
        at: new Date().toISOString()
      };
      dispatch({ type: "addNotifs", notifs: [notif] });
      if (req.memberId === s.meId && s.settings.notifPermission && s.settings.notifPrefs.assignments)
        systemNotify(notif.title, notif.body);
      // El organizador simulado también "calcula": así el aceptado ve su viaje en Resultados.
      if (leg) {
        const rest = s.legs.filter(
          (l) => !(l.memberId === leg.memberId && l.eventId === leg.eventId)
        );
        void runMatch(req.eventId, {
          warmStart: !!s.assignments[req.eventId],
          legsOverride: [...rest, leg]
        });
      }
    }, delayMs);
    timersRef.current.push(h);
  }, [runMatch]);

  const requestJoin = useCallback(
    (eventId: string) => {
      const s = stateRef.current;
      const last = [...s.joinRequests]
        .filter((r) => r.eventId === eventId && r.memberId === s.meId)
        .sort((a, b) => b.at.localeCompare(a.at))[0];
      if (last && last.status !== "rejected") return;
      const request: JoinRequest = {
        id: `jr-${Date.now().toString(36)}`,
        eventId,
        memberId: s.meId,
        role: "passenger",
        status: "pending",
        at: new Date().toISOString()
      };
      dispatch({ type: "addJoinRequest", request });
      scheduleSimulatedReply(request.id, 4000);
    },
    [scheduleSimulatedReply]
  );

  // Solicitudes mías que quedaron pendientes de otra sesión: el organizador
  // "contesta" al volver a abrir la app.
  useEffect(() => {
    if (hasSupabase) return; // con backend, las respuestas son reales (realtime)
    const s = stateRef.current;
    for (const r of s.joinRequests) {
      if (r.memberId === s.meId && r.status === "pending") {
        const ev = s.events.find((e) => e.id === r.eventId);
        if (ev && ev.createdBy !== s.meId) scheduleSimulatedReply(r.id, 4000);
      }
    }
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [scheduleSimulatedReply]);

  const decideRequest = useCallback(
    async (requestId: string, approve: boolean) => {
      const s = stateRef.current;
      const req = s.joinRequests.find((r) => r.id === requestId);
      if (!req || req.status !== "pending") return;
      const ev = s.events.find((e) => e.id === req.eventId);
      if (!ev) return;
      const T = (k: TKey, vars?: Record<string, string | number>) =>
        translate(s.settings.lang, k, vars);
      dispatch({
        type: "decideJoinRequest",
        requestId,
        status: approve ? "approved" : "rejected",
        decidedAt: new Date().toISOString()
      });
      dispatch({
        type: "addNotifs",
        notifs: [
          {
            id: `n-${Date.now()}-dec`,
            memberId: req.memberId,
            title: approve ? T("requests.acceptedNotifTitle") : T("requests.rejectedNotifTitle"),
            body: approve
              ? T("requests.acceptedNotifBody", { title: ev.title })
              : T("requests.rejectedNotifBody", { title: ev.title }),
            read: false,
            at: new Date().toISOString()
          }
        ]
      });
      if (!approve) return;
      // Modo Supabase: NO creamos el leg del solicitante ni recalculamos acá.
      // En nuestro device su `home` es {0,0} (member_home es self-only) y RLS
      // rechaza escribir por él. El aceptado crea su propio leg (con su home real)
      // tras hidratar —ver efecto abajo— y el organizador recalcula desde Admin.
      // El status ya se espejó vía el dispatch de decideJoinRequest.
      if (hasSupabase) return;
      const leg = defaultPassengerLeg(s, req.eventId, req.memberId);
      if (!leg) return;
      dispatch({ type: "setLeg", leg });
      if (s.assignments[req.eventId]) {
        const rest = s.legs.filter(
          (l) => !(l.memberId === leg.memberId && l.eventId === leg.eventId)
        );
        await runMatch(req.eventId, { warmStart: true, legsOverride: [...rest, leg] });
      }
    },
    [runMatch]
  );

  // Modo Supabase: si me aprobaron una solicitud pero todavía no tengo un leg
  // propio en ese evento, lo creo con MI home (real en mi device). RLS permite
  // escribir mi propio leg; el organizador recalcula el matching desde Admin.
  // Reemplaza el "auto-aparece el viaje" que antes hacía el organizador.
  useEffect(() => {
    if (!hasSupabase) return;
    for (const r of state.joinRequests) {
      if (r.memberId !== state.meId || r.status !== "approved") continue;
      const hasLeg = state.legs.some((l) => l.eventId === r.eventId && l.memberId === state.meId);
      if (hasLeg) continue;
      const leg = defaultPassengerLeg(state, r.eventId, state.meId);
      if (leg) dispatch({ type: "setLeg", leg });
    }
  }, [state.joinRequests, state.legs, state.meId, dispatch]);

  const rateMember = useCallback((toMemberId: string, stars: number, comment?: string) => {
    const s = stateRef.current;
    // Solo co-viajeros (mismo criterio que RLS share_trip): evita una reseña
    // optimista local que el server rechazaría. La UI ya gatea; esto es red de seguridad.
    if (!canReview(s, s.meId, toMemberId)) return;
    const review: Review = {
      id: `rv-${Date.now().toString(36)}`,
      fromMemberId: s.meId,
      toMemberId,
      stars: Math.min(5, Math.max(1, Math.round(stars))),
      comment: comment?.trim() || undefined,
      at: new Date().toISOString()
    };
    dispatch({ type: "addReview", review });
  }, []);

  const sendMessage = useCallback((eventId: string, body: string) => {
    const s = stateRef.current;
    const text = body.trim();
    if (!text) return;
    const now = Date.now();
    dispatch({
      type: "addMessage",
      message: { id: `msg-${now.toString(36)}`, eventId, fromMemberId: s.meId, body: text, at: new Date().toISOString() }
    });
    // Con backend real, el mensaje se espeja a la base y responde otro usuario.
    if (hasSupabase) return;
    // Demo sin backend: otro participante del convoy contesta algo simple.
    const others = participantsOf(s, eventId).filter((id) => id !== s.meId);
    if (others.length === 0) return;
    const replier = others[text.length % others.length]; // determinístico por el texto
    const T = (k: TKey, vars?: Record<string, string | number>) => translate(s.settings.lang, k, vars);
    const canned: TKey[] = ["chat.canned1", "chat.canned2", "chat.canned3", "chat.canned4"];
    const pick = canned[text.length % canned.length];
    const h = setTimeout(() => {
      const s2 = stateRef.current;
      dispatch({
        type: "addMessage",
        message: {
          id: `msg-${Date.now().toString(36)}-r`,
          eventId,
          fromMemberId: replier,
          body: T(pick),
          at: new Date().toISOString()
        }
      });
      if (s2.settings.notifPermission && s2.settings.notifPrefs.chat) {
        const name = s2.members.find((m) => m.id === replier)?.name ?? "?";
        systemNotify(T("chat.newFrom", { name }), T(pick));
      }
    }, 2600);
    timersRef.current.push(h);
  }, []);

  /* ---- organizaciones (grupos) + moderación ---- */

  // Rehidrata desde la base tras una RPC (crear/unirse/salir/invitar). Deja activo
  // `preferOrgId` si sigo perteneciendo; si no, la primera org mía (o vacío).
  const refreshRemote = useCallback(async (preferOrgId?: string) => {
    if (!supabase) return;
    try {
      const remote = await loadRemote(stateRef.current.meId, sessionRef.current?.user?.email ?? undefined);
      const prev = preferOrgId ?? stateRef.current.activeOrgId;
      const active = remote.orgs.some((o) => o.id === prev) ? prev : remote.orgs[0]?.id ?? "";
      rawDispatch({
        type: "hydrate",
        state: { ...remote, notifications: stateRef.current.notifications, activeOrgId: active }
      });
    } catch (e) {
      console.warn("[store] refreshRemote falló", e);
    }
  }, []);

  const createOrg = useCallback(
    async (name: string, destination?: { loc: LatLng; name?: string }) => {
      const clean = name.trim() || "Mi grupo";
      if (hasSupabase && supabase) {
        const orgId = await rpcCreateOrg(
          clean,
          destination ? { lat: destination.loc.lat, lng: destination.loc.lng, name: destination.name } : undefined
        );
        await refreshRemote(orgId);
      } else {
        const meId = stateRef.current.meId;
        const org: Org = {
          id: `org-${Date.now().toString(36)}`,
          name: clean,
          joinCode: genJoinCode(),
          memberIds: [meId],
          adminIds: [meId],
          meetingPoints: [],
          // Compartir el código funciona por defecto (igual que el RPC del server).
          linkEnabled: true,
          destination: destination?.loc,
          destinationName: destination?.name
        };
        dispatch({ type: "addOrg", org });
        dispatch({ type: "setActiveOrg", orgId: org.id });
      }
    },
    [refreshRemote]
  );

  const setOrgDestination = useCallback(
    async (orgId: string, loc: LatLng, name?: string) => {
      if (hasSupabase && supabase) {
        await rpcSetOrgDestination(orgId, loc, name);
        await refreshRemote(orgId);
      } else {
        const org = stateRef.current.orgs.find((o) => o.id === orgId);
        if (org) dispatch({ type: "updateOrg", org: { ...org, destination: loc, destinationName: name } });
      }
    },
    [refreshRemote]
  );

  const publishPublicTrip = useCallback(
    async (input: {
      origin: LatLng;
      originName?: string;
      destination: LatLng;
      destinationName?: string;
      role: "driver" | "passenger";
      dateISO: string;
      recurrence?: { days: number[] };
      vehicleId?: string;
    }) => {
      const meId = stateRef.current.meId;
      const title = input.destinationName?.trim() || input.originName?.trim() || "Viaje";
      const evDate = new Date(input.dateISO);
      const evMin = evDate.getHours() * 60 + evDate.getMinutes();
      // En una salida pública el horario es el de SALIDA (punto a punto). El motor
      // usa la ventana del leg como ventana de SALIDA, así que la anclamos alrededor
      // de esa hora (no centrada en una llegada) para que la partida caiga ahí.
      const window = { start: Math.max(0, evMin - 15), end: Math.min(1439, evMin + 45) };
      const mkLeg = (eventId: string): Leg => ({
        id: `leg-${meId}-${eventId}`,
        memberId: meId,
        eventId,
        role: input.role,
        window,
        origin: input.origin,
        vehicleId: input.role === "driver" ? input.vehicleId : undefined,
        maxWalkMin: input.role === "passenger" ? 10 : undefined,
        needs: input.role === "passenger" ? [] : undefined
      });

      if (hasSupabase && supabase) {
        const eventId = await rpcCreatePublicTrip({
          title,
          dateISO: input.dateISO,
          destination: input.destination,
          destinationName: input.destinationName,
          originName: input.originName,
          recurrence: input.recurrence
        });
        await refreshRemote(); // trae el evento + la org personal recién asegurada
        dispatch({ type: "setLeg", leg: mkLeg(eventId) }); // se espeja a la base
        return eventId;
      }
      // Demo local: espacio personal determinístico + evento público + mi leg.
      const orgId = `org-personal-${meId}`;
      if (!stateRef.current.orgs.some((o) => o.id === orgId)) {
        dispatch({
          type: "addOrg",
          org: {
            id: orgId,
            name: "Mis viajes",
            joinCode: genJoinCode(),
            memberIds: [meId],
            adminIds: [meId],
            meetingPoints: [],
            linkEnabled: false
          }
        });
      }
      const eventId = `ev${Date.now().toString(36)}`;
      dispatch({
        type: "addEvent",
        event: {
          id: eventId,
          orgId,
          title,
          dateISO: input.dateISO,
          destination: input.destination,
          destinationName: input.destinationName,
          visibility: "public",
          createdBy: meId,
          originName: input.originName,
          recurrence: input.recurrence
        }
      });
      dispatch({ type: "setLeg", leg: mkLeg(eventId) });
      return eventId;
    },
    [refreshRemote]
  );

  const joinOrgByCode = useCallback(
    async (code: string) => {
      const clean = code.trim();
      if (!clean) throw new Error("codigo invalido");
      if (hasSupabase && supabase) {
        const orgId = await rpcJoinOrgByCode(clean);
        await refreshRemote(orgId);
      } else {
        const s = stateRef.current;
        const org = s.orgs.find((o) => o.joinCode.toUpperCase() === clean.toUpperCase());
        if (!org) throw new Error("codigo invalido");
        // Igual que la RPC: sin link habilitado, nadie se une solo.
        if (!org.linkEnabled) throw new Error("link deshabilitado");
        if (!org.memberIds.includes(s.meId)) {
          dispatch({ type: "updateOrg", org: { ...org, memberIds: [...org.memberIds, s.meId] } });
        }
        dispatch({ type: "setActiveOrg", orgId: org.id });
      }
    },
    [refreshRemote]
  );

  const addMemberByEmail = useCallback(
    async (orgId: string, email: string) => {
      const clean = email.trim();
      if (!clean) throw new Error("email invalido");
      if (hasSupabase && supabase) {
        await rpcAddMemberByEmail(orgId, clean);
        await refreshRemote(orgId);
      } else {
        const s = stateRef.current;
        const org = s.orgs.find((o) => o.id === orgId);
        const target = s.members.find((m) => (m.email ?? "").toLowerCase() === clean.toLowerCase());
        if (!org) throw new Error("org inexistente");
        if (!target) throw new Error("no existe usuario con ese email");
        if (!org.memberIds.includes(target.id)) {
          dispatch({ type: "updateOrg", org: { ...org, memberIds: [...org.memberIds, target.id] } });
        }
      }
    },
    [refreshRemote]
  );

  const setOrgLink = useCallback(
    async (orgId: string, enabled: boolean) => {
      if (hasSupabase && supabase) {
        await rpcSetOrgLink(orgId, enabled);
        await refreshRemote(orgId);
      } else {
        const org = stateRef.current.orgs.find((o) => o.id === orgId);
        if (org) dispatch({ type: "updateOrg", org: { ...org, linkEnabled: enabled } });
      }
    },
    [refreshRemote]
  );

  const leaveOrg = useCallback(
    async (orgId: string) => {
      if (hasSupabase && supabase) {
        await rpcLeaveOrg(orgId);
        await refreshRemote(); // ya no pertenezco → refreshRemote elige otra org mía
      } else {
        const s = stateRef.current;
        const org = s.orgs.find((o) => o.id === orgId);
        if (org) {
          dispatch({
            type: "updateOrg",
            org: {
              ...org,
              memberIds: org.memberIds.filter((id) => id !== s.meId),
              adminIds: org.adminIds.filter((id) => id !== s.meId)
            }
          });
        }
        if (s.activeOrgId === orgId) {
          const next = s.orgs.find((o) => o.id !== orgId && o.memberIds.includes(s.meId));
          dispatch({ type: "setActiveOrg", orgId: next?.id ?? "" });
        }
      }
    },
    [refreshRemote]
  );

  const reportMember = useCallback(async (memberId: string, reason: string) => {
    if (hasSupabase && supabase) {
      // El server pausa al reportado; realtime (tabla members) refleja el cambio.
      await rpcReportMember(memberId, reason.trim());
    } else {
      const s = stateRef.current;
      const m = s.members.find((x) => x.id === memberId);
      if (m) dispatch({ type: "updateMember", member: { ...m, status: "paused" } });
    }
  }, []);

  const blockMember = useCallback(async (memberId: string) => {
    // Optimista en ambos modos: el filtro de contenido usa state.blockedIds.
    dispatch({ type: "blockMember", memberId });
    if (hasSupabase && supabase) {
      try {
        await rpcBlockMember(memberId);
      } catch (e) {
        console.warn("[store] block_member falló", e);
      }
    }
  }, []);

  const unblockMember = useCallback(async (memberId: string) => {
    dispatch({ type: "unblockMember", memberId });
    if (hasSupabase && supabase) {
      try {
        await rpcUnblockMember(memberId);
      } catch (e) {
        console.warn("[store] unblock_member falló", e);
      }
    }
  }, []);

  const resetDemo = useCallback(() => {
    clearState();
    dispatch({ type: "reset" });
  }, []);

  const clearRecovery = useCallback(() => setRecovery(false), []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    // Además del branch SIGNED_OUT de onAuthStateChange: garantiza el limpiado
    // aunque el evento no llegue (idempotente).
    clearState();
    rawDispatch({ type: "reset" });
    setSession(null);
    setHydrated(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (hasSupabase && supabase) {
      // El borrado real (datos + usuario de auth) es esto: si falla, propaga el
      // error para que la UI avise. La cuenta ya no existe después de acá.
      await rpcDeleteAccount();
      // Cerramos la sesión (ya inválida) como best-effort: un fallo del round-trip
      // de logout NO debe enmascarar que el borrado sí funcionó.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* la sesión ya no sirve; igual limpiamos lo local abajo */
      }
      clearState();
      rawDispatch({ type: "reset" });
      setSession(null);
      setHydrated(false);
    } else {
      // Demo/local: no hay cuenta real, sólo datos locales → los limpiamos.
      clearState();
      rawDispatch({ type: "reset" });
    }
  }, []);

  const value: Store = {
    state,
    dispatch,
    runMatch,
    manualMove,
    cancelDriver,
    requestJoin,
    decideRequest,
    rateMember,
    sendMessage,
    createOrg,
    setOrgDestination,
    publishPublicTrip,
    joinOrgByCode,
    addMemberByEmail,
    setOrgLink,
    leaveOrg,
    reportMember,
    blockMember,
    unblockMember,
    resetDemo,
    computing,
    session,
    signOut,
    deleteAccount,
    authReady: !hasSupabase || session !== undefined,
    hydrated,
    recovery,
    clearRecovery
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore fuera de StoreProvider");
  return v;
}

/** Traductor atado al idioma actual. */
export function useT() {
  const { state } = useStore();
  const lang: Lang = state.settings.lang;
  return useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );
}

/** Formateador de hora (min desde 00:00) que respeta el formato 12h/24h del usuario. */
export function useHhmm() {
  const { state } = useStore();
  const hour12 = !!state.settings.hour12;
  return useCallback((min: number) => minutesToHHMM(min, hour12), [hour12]);
}

/** ¿El usuario usa reloj de 12h? Para `toLocaleTimeString` (hour12). */
export function useHour12(): boolean {
  return !!useStore().state.settings.hour12;
}
