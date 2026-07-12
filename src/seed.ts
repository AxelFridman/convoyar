import type { AppState, JoinRequest, Leg, Member, Review, TripRecord } from "./state/model";
import type { Feature } from "./engine/types";

/**
 * Demo determinística de fábrica.
 * - "La Banda del Asado": org privada de 26 personas con el evento "Asado del sábado".
 * - "Comunidad Convoyar": espacio público tipo BlaBlaCar con viajes abiertos,
 *   solicitudes de lugar, calificaciones e historial por miembro.
 * Solo las fechas son relativas a hoy (próximo sábado/domingo); el resto es fijo.
 */

// Coordenadas reales aproximadas de barrios de CABA
const HOODS: Record<string, [number, number]> = {
  flores: [-34.6284, -58.4666],
  caballito: [-34.6188, -58.4409],
  almagro: [-34.6062, -58.4204],
  palermo: [-34.5808, -58.4245],
  belgrano: [-34.5622, -58.4565],
  villa_crespo: [-34.5993, -58.4384],
  boedo: [-34.6301, -58.4176],
  recoleta: [-34.5875, -58.3938],
  nunez: [-34.5451, -58.4634],
  devoto: [-34.6019, -58.5136],
  liniers: [-34.6442, -58.5228],
  villa_urquiza: [-34.5703, -58.4915],
};

function jitter(seed: number) {
  // determinístico, ~±600m
  const a = Math.sin(seed * 999.7) * 0.006;
  const b = Math.cos(seed * 777.3) * 0.006;
  return [a, b];
}

const NAMES: [string, keyof typeof HOODS, string][] = [
  ["Vos", "flores", "amigos"],
  ["Mariana K.", "almagro", "amigos"],
  ["Diego R.", "caballito", "amigos"],
  ["Sofía L.", "palermo", "trabajo"],
  ["Tomás B.", "belgrano", "trabajo"],
  ["Lucía F.", "villa_crespo", "amigos"],
  ["Nico G.", "boedo", "amigos"],
  ["Vera S.", "recoleta", "familia"],
  ["Martín P.", "nunez", "trabajo"],
  ["Cami A.", "devoto", "familia"],
  ["Fede M.", "liniers", "amigos"],
  ["Julieta D.", "villa_urquiza", "trabajo"],
  ["Santi H.", "flores", "familia"],
  ["Agus T.", "caballito", "amigos"],
  ["Belu C.", "almagro", "amigos"],
  ["Lautaro V.", "palermo", "trabajo"],
  ["Micaela R.", "boedo", "familia"],
  ["Bruno E.", "belgrano", "trabajo"],
  ["Carla N.", "villa_crespo", "amigos"],
  ["Ezequiel O.", "devoto", "familia"],
  ["Flor I.", "recoleta", "amigos"],
  ["Gastón U.", "liniers", "trabajo"],
  ["Abuela Rosa", "flores", "familia"],
  ["Pedro W.", "nunez", "amigos"],
  ["Rocío Q.", "villa_urquiza", "familia"],
  ["Iván J.", "caballito", "trabajo"],
];

/** Usuarios de la comunidad pública (no son de tu org): nombre, barrio, bio. */
const COMMUNITY: [string, keyof typeof HOODS, string][] = [
  ["Valen R.", "palermo", "Manejo a la costa casi todos los findes. Mate incluido."],
  ["Abril M.", "caballito", "Puntual y charlatana. Viajo por trabajo a La Plata."],
  ["Joaquín S.", "boedo", "Recién me sumo, ¡primer viaje!"],
  ["Ramiro T.", "liniers", ""],
  ["Paula G.", "belgrano", "Voy y vuelvo de Rosario cada 15 días."],
  ["Emi C.", "villa_crespo", "Música fuerte, ventanilla abierta."],
  ["Delfi B.", "recoleta", "Estudio en La Plata, viajo martes y jueves."],
  ["Marcos L.", "devoto", "Con lugar para bicis en el baúl."],
];

function daysAgoISO(days: number, base: Date): string {
  return new Date(base.getTime() - days * 86400000).toISOString();
}

export function buildSeed(): AppState {
  const now = new Date();

  const members: Member[] = NAMES.map(([name, hood, subgroup], i) => {
    const [dy, dx] = jitter(i + 1);
    const [lat, lng] = HOODS[hood];
    return {
      id: `m${i}`,
      name,
      subgroup,
      home: { lat: lat + dy, lng: lng + dx },
      vehicles: [],
      // Antigüedades deterministas, siempre ANTERIORES a la actividad seedada
      // (el historial más viejo llega a ~320 días): entre ~1 y ~3 años.
      joinedISO: daysAgoISO(360 + ((i * 97) % 740), now),
    };
  });

  COMMUNITY.forEach(([name, hood, bio], i) => {
    const [dy, dx] = jitter(100 + i);
    const [lat, lng] = HOODS[hood];
    members.push({
      id: `c${i}`,
      name,
      home: { lat: lat + dy, lng: lng + dx },
      vehicles: [],
      bio: bio || undefined,
      // Joaquín (c2) es nuevo a propósito: perfil sin historia para la demo.
      // El resto se unió antes de su actividad más vieja (~320 días).
      joinedISO: i === 2 ? daysAgoISO(12, now) : daysAgoISO(330 + ((i * 211) % 700), now),
    });
  });

  // Garage: cada vehículo con id determinístico (`veh-<miembro>-<n>`) y alias.
  const veh = (
    id: string,
    capacity: number,
    features: Feature[],
    smokeFree: boolean,
    plate: string,
    alias?: string
  ) => {
    const m = members.find((x) => x.id === id)!;
    m.vehicles.push({ id: `veh-${id}-${m.vehicles.length}`, alias, capacity, features, smokeFree, plate });
  };
  veh("m0", 3, [], true, "AA 111 BC", "el Gol"); // Vos — auto…
  veh("m0", 2, ["big_trunk"], true, "AA 222 XY", "la moto"); // …y una moto: garage con 2, ideal para elegir por viaje
  veh("m2", 4, [], true, "AB 123 CD", "el familiar"); // Diego
  veh("m4", 3, ["big_trunk"], true, "AC 456 EF"); // Tomás
  veh("m8", 4, ["wheelchair"], true, "AD 789 GH", "la trafic adaptada"); // Martín — adaptado
  veh("m10", 2, ["pets"], false, "AE 234 IJ"); // Fede — fumador con perro
  veh("m15", 4, ["child_seat"], true, "AF 567 KL"); // Lautaro
  veh("m17", 3, [], true, "AG 890 MN"); // Bruno
  veh("m21", 4, ["bikes", "big_trunk"], false, "AH 345 OP"); // Gastón
  veh("c0", 3, ["big_trunk"], true, "AI 678 QR", "la costera"); // Valen
  veh("c4", 4, [], true, "AJ 901 ST"); // Paula — Rosario
  veh("c6", 3, [], true, "AK 234 UV"); // Delfi — La Plata
  veh("c7", 4, ["bikes", "big_trunk"], true, "AL 567 WX"); // Marcos

  /* ---------- Evento 1: asado privado de la org ---------- */
  const dest = { lat: -34.6417, lng: -58.6803 }; // quinta en Ituzaingó
  const eventId = "ev1";
  const sat = nextWeekday(6); // sábado
  sat.setHours(12, 30, 0, 0);

  const legs: Leg[] = [];
  // IDs canónicos `leg-<miembro>-<evento>`: los mismos que generan MyTrip y
  // defaultPassengerLeg, así un "Guardar" reemplaza el leg sin cambiar su id
  // (los assignments referencian legs por id).
  const drive = (mid: string, eid: string, detour: number, dep: [number, number]) =>
    legs.push({
      id: `leg-${mid}-${eid}`,
      memberId: mid,
      eventId: eid,
      role: "driver",
      maxDetourMin: detour,
      window: { start: dep[0], end: dep[1] },
    });
  const ride = (
    mid: string,
    eid: string,
    walk: number,
    win: [number, number],
    needs: Feature[] = [],
    soft?: { smokeFree?: boolean; subgroup?: boolean }
  ) => {
    const m = members.find((x) => x.id === mid)!;
    legs.push({
      id: `leg-${mid}-${eid}`,
      memberId: mid,
      eventId: eid,
      role: "passenger",
      maxWalkMin: walk,
      window: { start: win[0], end: win[1] },
      needs,
      soft: {
        smokeFree: soft?.smokeFree ?? false,
        subgroup: soft?.subgroup ? m.subgroup : undefined,
      },
    });
  };

  // ventanas en minutos desde 00:00 (evento 12:30 = 750)
  drive("m2", eventId, 25, [690, 760]);
  drive("m4", eventId, 20, [700, 755]);
  drive("m8", eventId, 30, [690, 750]);
  drive("m10", eventId, 15, [710, 760]);
  drive("m17", eventId, 25, [700, 750]);
  // Lautaro y Gastón todavía no respondieron (para que el admin vea el efecto de sumar autos)

  ride("m0", eventId, 12, [690, 760], [], { smokeFree: true, subgroup: true }); // Vos
  ride("m1", eventId, 10, [700, 760], [], { subgroup: true });
  ride("m3", eventId, 15, [690, 755], [], { smokeFree: true });
  ride("m5", eventId, 8, [700, 760]);
  ride("m6", eventId, 12, [690, 760], [], { subgroup: true });
  ride("m7", eventId, 5, [710, 755], [], { smokeFree: true });
  ride("m9", eventId, 15, [690, 760]);
  ride("m11", eventId, 10, [700, 750]);
  ride("m13", eventId, 12, [690, 760], [], { subgroup: true });
  ride("m14", eventId, 8, [700, 760]);
  ride("m16", eventId, 10, [690, 755]);
  ride("m18", eventId, 15, [700, 760]);
  ride("m22", eventId, 3, [700, 750], ["wheelchair"]); // Abuela Rosa
  ride("m24", eventId, 10, [690, 760]);

  /* ---------- Evento 2: TU salida pública (recibís solicitudes) ---------- */
  const tigreId = "ev2";
  const sun = nextWeekday(0); // domingo
  sun.setHours(9, 0, 0, 0);
  // Desvío 35': suficiente para levantar a los aceptados desde CABA (Delfi ~23').
  drive("m0", tigreId, 35, [510, 555]); // Vos manejás a Tigre
  ride("c6", tigreId, 12, [510, 555]); // Delfi ya fue aceptada

  /* ---------- Eventos públicos de la comunidad (pedís lugar) ---------- */
  const fri = nextWeekday(5); // viernes
  fri.setHours(7, 0, 0, 0);
  const mdqId = "ev3";
  drive("c0", mdqId, 30, [390, 435]); // Valen maneja a MDQ 7:00 = 420
  ride("c1", mdqId, 10, [390, 430]);
  ride("c5", mdqId, 15, [395, 435]);

  const laPlataId = "ev4";
  const sat2 = nextWeekday(6);
  sat2.setHours(18, 0, 0, 0);
  // Desvío 45': viaje largo — alcanza para cruzar CABA a buscar a quien pida lugar.
  drive("c6", laPlataId, 45, [1050, 1090]); // Delfi maneja a La Plata 18:00 = 1080
  ride("c2", laPlataId, 12, [1050, 1085]);

  /* ---------- Solicitudes de lugar (tu evento público) ---------- */
  const joinRequests: JoinRequest[] = [
    {
      id: "jr1",
      eventId: tigreId,
      memberId: "c1", // Abril: 4.9★, mucha historia → fácil de aceptar
      role: "passenger",
      message: "¡Hola! Voy con una mochila chica nomás. ¿Hay lugar?",
      status: "pending",
      at: daysAgoISO(1, now),
    },
    {
      id: "jr2",
      eventId: tigreId,
      memberId: "c2", // Joaquín: nuevo, sin calificaciones → decisión con menos datos
      role: "passenger",
      message: "Primer viaje en la app, prometo buena charla.",
      status: "pending",
      at: daysAgoISO(0.5, now),
    },
    {
      id: "jr3",
      eventId: tigreId,
      memberId: "c3", // Ramiro: 2.7★ → el organizador probablemente rechace
      role: "passenger",
      status: "pending",
      at: daysAgoISO(0.2, now),
    },
    {
      id: "jr0",
      eventId: tigreId,
      memberId: "c6", // Delfi ya aceptada (su leg existe arriba)
      role: "passenger",
      status: "approved",
      at: daysAgoISO(2, now),
      decidedAt: daysAgoISO(1.8, now),
    },
  ];

  /* ---------- Reseñas: reputación visible al aceptar/rechazar ---------- */
  const reviews: Review[] = [];
  let rvSeq = 0;
  const review = (from: string, to: string, stars: number, daysAgo: number, comment?: string) =>
    reviews.push({ id: `rv${rvSeq++}`, fromMemberId: from, toMemberId: to, stars, comment, at: daysAgoISO(daysAgo, now) });

  // Valen (c0): conductora estrella de la comunidad
  review("c1", "c0", 5, 12, "Súper puntual y el auto impecable.");
  review("c5", "c0", 5, 40);
  review("m3", "c0", 5, 90, "Viaje a la costa de 10.");
  review("c4", "c0", 4, 130);
  review("c7", "c0", 5, 200);
  // Abril (c1): pasajera con gran historial
  review("c0", "c1", 5, 12, "Llegó antes que yo al punto de encuentro.");
  review("c4", "c1", 5, 60);
  review("c6", "c1", 5, 150, "Re buena onda.");
  review("m8", "c1", 4, 260);
  // Ramiro (c3): reputación floja a propósito
  review("c0", "c3", 3, 30, "Llegó 20 minutos tarde.");
  review("c4", "c3", 2, 120, "Canceló a último momento.");
  review("c6", "c3", 3, 200);
  // Paula (c4) y Delfi (c6)
  review("c1", "c4", 5, 45);
  review("m17", "c4", 4, 190, "Todo bien, manejó tranquila.");
  review("c5", "c6", 5, 20, "Me salvó con el horario de cursada.");
  review("c1", "c6", 4, 80);
  // Marcos (c7)
  review("c5", "c7", 5, 15, "Entraron las dos bicis, un capo.");
  // Tu org también tiene historia
  review("m1", "m0", 5, 30, "Organizó todo y encima cebó mates.");
  review("m5", "m0", 5, 75);
  review("m2", "m0", 4, 140);
  review("m0", "m2", 5, 140, "Manejó de 10, cero desvíos.");
  review("m3", "m2", 5, 210);
  review("m0", "m8", 5, 300, "El auto adaptado fue clave para la abuela.");
  review("m9", "m10", 3, 90, "Buen viaje pero el auto olía a pucho.");

  /* ---------- Historial de viajes ---------- */
  const TRIP_TITLES = [
    "Asado en Pilar",
    "Oficina — semana",
    "Cancha de Vélez",
    "Finde en la costa",
    "Cumple en Devoto",
    "Facultad — parciales",
    "Feria de Mataderos",
    "Recital en Núñez",
  ];
  const tripHistory: TripRecord[] = [];
  let thSeq = 0;
  const history = (mid: string, count: number, driverEvery: number, withId?: string) => {
    const withM = withId ? members.find((x) => x.id === withId) : undefined;
    // Offset por miembro (usa el id completo: "m0" y "c0" difieren): evita que
    // dos historiales generen "el mismo viaje" con roles contradictorios.
    const code = mid.charCodeAt(0) * 31 + mid.charCodeAt(1);
    const shift = (code * 5) % 11;
    for (let i = 0; i < count; i++) {
      const asDriver = driverEvery > 0 && i % driverEvery === 0;
      tripHistory.push({
        id: `th${thSeq++}`,
        memberId: mid,
        title: TRIP_TITLES[(i + code) % TRIP_TITLES.length],
        dateISO: daysAgoISO(14 + i * 23 + shift, now),
        role: asDriver ? "driver" : "passenger",
        withMemberId: withM?.id,
        withName: withM?.name,
      });
    }
  };
  history("m0", 6, 3, "m2"); // Vos: 6 viajes, alternás manejar
  history("m2", 9, 1, "m0"); // Diego siempre maneja
  history("m8", 7, 1);
  history("m10", 4, 1);
  history("c0", 14, 1, "c1"); // Valen, conductora frecuente
  history("c1", 11, 0, "c0"); // Abril, siempre pasajera
  history("c3", 3, 0);
  history("c4", 8, 1);
  history("c6", 9, 2, "c1");
  history("c7", 5, 1);
  // Joaquín (c2): sin historial ni reseñas — es nuevo (se unió hace 12 días)

  return {
    version: 4,
    meId: "m0",
    orgs: [
      {
        id: "org1",
        name: "La Banda del Asado",
        joinCode: "ASADO-2611",
        memberIds: NAMES.map((_, i) => `m${i}`),
        adminIds: ["m0"],
        meetingPoints: [
          { id: "mp1", name: "Estación Flores", loc: { lat: -34.6285, lng: -58.4635 } },
          { id: "mp2", name: "Plaza Almagro", loc: { lat: -34.6069, lng: -58.4218 } },
          { id: "mp3", name: "Parque Centenario", loc: { lat: -34.6065, lng: -58.4351 } },
          { id: "mp4", name: "Estación Liniers", loc: { lat: -34.6408, lng: -58.5262 } },
          { id: "mp5", name: "Plaza Irlanda", loc: { lat: -34.6156, lng: -58.4557 } },
        ],
      },
      {
        id: "orgPub",
        name: "Comunidad Convoyar",
        joinCode: "CONVOYAR-PUB",
        memberIds: COMMUNITY.map((_, i) => `c${i}`),
        adminIds: [],
        meetingPoints: [],
      },
    ],
    members,
    events: [
      {
        id: eventId,
        orgId: "org1",
        title: "Asado del sábado",
        dateISO: sat.toISOString(),
        destination: dest,
        destinationName: "Quinta de Ituzaingó",
        visibility: "private",
        createdBy: "m0",
      },
      {
        id: tigreId,
        orgId: "org1",
        title: "Escapada al Delta",
        dateISO: sun.toISOString(),
        destination: { lat: -34.426, lng: -58.5797 },
        destinationName: "Puerto de Frutos, Tigre",
        visibility: "public",
        createdBy: "m0",
        originName: "CABA → Tigre",
      },
      {
        id: mdqId,
        orgId: "orgPub",
        title: "Finde en Mar del Plata",
        dateISO: fri.toISOString(),
        destination: { lat: -38.0055, lng: -57.5426 },
        destinationName: "Mar del Plata",
        visibility: "public",
        createdBy: "c0",
        originName: "CABA → Mar del Plata",
      },
      {
        id: laPlataId,
        orgId: "orgPub",
        title: "Recital en La Plata",
        dateISO: sat2.toISOString(),
        destination: { lat: -34.9215, lng: -57.9545 },
        destinationName: "Estadio Único, La Plata",
        visibility: "public",
        createdBy: "c6",
        originName: "CABA → La Plata",
      },
    ],
    legs,
    assignments: {},
    notifications: [],
    joinRequests,
    reviews,
    tripHistory,
    messages: [
      { id: "cm1", eventId: "ev1", fromMemberId: "m2", body: "¿Alguien lleva algo para tomar?", at: daysAgoISO(0.4, now) },
      { id: "cm2", eventId: "ev1", fromMemberId: "m0", body: "Yo llevo hielo y algo de picada 🧊", at: daysAgoISO(0.3, now) },
      { id: "cm3", eventId: "ev1", fromMemberId: "m8", body: "Perfecto, paso a buscar a la abuela primero.", at: daysAgoISO(0.2, now) }
    ],
    // La demo representa a un usuario ya establecido → onboarded. El wizard se
    // puede rejugar desde Perfil ("Ver introducción"); un usuario nuevo real
    // (sin estado guardado + backend) arrancaría con onboarded: false.
    settings: {
      lang: "es",
      theme: "system",
      plan: "pro",
      notifPermission: false,
      onboarded: true,
      notifPrefs: { assignments: true, requests: true, chat: true, email: false }
    },
    activeOrgId: "org1",
  };
}

/** Próximo día de la semana (0=domingo … 6=sábado), siempre en el futuro. */
function nextWeekday(target: number): Date {
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}
