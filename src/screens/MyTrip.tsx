import React, { useEffect, useMemo, useState } from "react";
import { useStore, useT, useHhmm } from "../state/store";
import { type TKey } from "../i18n";
import { Segmented, Slider, Stepper, Chip, TimeInput } from "../components/UI";
import MapPicker, { DEFAULT_CENTER } from "../components/MapPicker";
import { TimeWindowBar } from "../components/TimeWindowBar";
import { walkRadiusMeters } from "../engine/geo";
import { isParticipant, canAdminEvent } from "../state/reputation";
import { hasSupabase } from "../services/supabaseClient";
import { hasVehicle, primaryVehicle, vehicleLabel, vehicleById } from "../state/vehicles";
import type { Feature, LatLng } from "../engine/types";
import type { Member, Role } from "../state/model";

const FEATURES: Feature[] = ["wheelchair", "pets", "big_trunk", "bikes", "child_seat"];

// Fallback para una cuenta vacía/rota: si por algún motivo el miembro propio no
// está cargado, no crasheamos (garage vacío, sin casa). Nunca pasa en la demo.
const EMPTY_MEMBER: Member = { id: "", name: "", vehicles: [], joinedISO: "" };

export default function MyTrip({ eventId }: { eventId: string | null }) {
  const { state, dispatch, runMatch } = useStore();
  const T = useT();
  const hhmm = useHhmm();
  const hour12 = !!state.settings.hour12;
  const ev = state.events.find((e) => e.id === eventId);
  const me = state.members.find((m) => m.id === state.meId) ?? EMPTY_MEMBER;
  const existing = state.legs.find((l) => l.eventId === eventId && l.memberId === state.meId);
  // Un leg "skip" guarda window {0,0} como centinela: no hidratar el form con eso.
  const activeLeg = existing && existing.role !== "skip" ? existing : undefined;
  // Precedencia de los valores del form: leg existente → defaults del perfil → fallback.
  const d = me.defaults ?? {};
  // Un rol "driver" precargado (de defaults) no vale si no hay vehículo en el garage.
  const seedRole = (r?: Role | null): Role | null =>
    r === "driver" && !hasVehicle(me) ? null : r ?? null;

  const [role, setRole] = useState<Role | null>(seedRole(existing?.role ?? d.role));
  // Origen del viaje: leg guardado → casa (atajo, si existe) → centro por defecto
  // (CABA). La casa NO se exige; cada viaje elige su propio punto de salida.
  const [origin, setOrigin] = useState<LatLng>(activeLeg?.origin ?? me.home ?? DEFAULT_CENTER);
  const [detour, setDetour] = useState(activeLeg?.maxDetourMin ?? d.maxDetourMin ?? 20);
  const [walk, setWalk] = useState(activeLeg?.maxWalkMin ?? d.maxWalkMin ?? 10);
  const [needs, setNeeds] = useState<Feature[]>(activeLeg?.needs ?? d.needs ?? []);
  const [winStart, setWinStart] = useState(activeLeg?.window.start ?? d.window?.start ?? 690);
  const [winEnd, setWinEnd] = useState(activeLeg?.window.end ?? d.window?.end ?? 760);
  const [prefSmoke, setPrefSmoke] = useState(activeLeg ? !!activeLeg.soft?.smokeFree : !!d.smokeFree);
  const [prefSub, setPrefSub] = useState(!!activeLeg?.soft?.subgroup);
  // Qué vehículo del garage ofrezco en ESTA salida (PR-A2). Fallback: el primero.
  const [vehId, setVehId] = useState<string | undefined>(activeLeg?.vehicleId ?? primaryVehicle(me)?.id);
  const [savedFlash, setSavedFlash] = useState(false);
  // Se tocó "Conductor" sin tener vehículo → mostramos por qué no se puede y cómo arreglarlo.
  const [noCarHint, setNoCarHint] = useState(false);

  // resync al cambiar de evento (misma precedencia que arriba)
  useEffect(() => {
    setRole(seedRole(existing?.role ?? d.role));
    setDetour(activeLeg?.maxDetourMin ?? d.maxDetourMin ?? 20);
    setWalk(activeLeg?.maxWalkMin ?? d.maxWalkMin ?? 10);
    setNeeds(activeLeg?.needs ?? d.needs ?? []);
    setWinStart(activeLeg?.window.start ?? d.window?.start ?? 690);
    setWinEnd(activeLeg?.window.end ?? d.window?.end ?? 760);
    setPrefSmoke(activeLeg ? !!activeLeg.soft?.smokeFree : !!d.smokeFree);
    setPrefSub(!!activeLeg?.soft?.subgroup);
    setOrigin(activeLeg?.origin ?? me.home ?? DEFAULT_CENTER);
    setVehId(activeLeg?.vehicleId ?? primaryVehicle(me)?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const counts = useMemo(() => {
    const legs = state.legs.filter((l) => l.eventId === eventId);
    return {
      drivers: legs.filter((l) => l.role === "driver").length,
      pax: legs.filter((l) => l.role === "passenger").length,
    };
  }, [state.legs, eventId]);

  if (!ev) return <div className="screen"><p className="sub center">{T("trip.noEvent")}</p></div>;

  // Hora del evento en minutos desde 00:00 (para el timeline de la ventana).
  const evDate = new Date(ev.dateISO);
  const eventMin = evDate.getHours() * 60 + evDate.getMinutes();

  // A un evento público ajeno se entra pidiendo lugar desde Explorar, no editando el viaje.
  if (!isParticipant(state, ev.id, state.meId)) {
    return (
      <div className="screen">
        <header className="topbar">
          <div>
            <div className="eyebrow">{ev.title}</div>
            <h1>{T("nav.trip")}</h1>
          </div>
        </header>
        <p className="sub center">{T("trip.notParticipant")}</p>
      </div>
    );
  }

  const canDrive = hasVehicle(me);
  const save = () => {
    // No se puede guardar un leg de conductor sin vehículo (evita "conductor fantasma").
    if (!role || (role === "driver" && !canDrive)) return;
    // Conservar el id del leg: los assignments referencian legs por id.
    const legId = existing?.id ?? `leg-${me.id}-${ev.id}`;
    const leg =
      role === "skip"
        ? { id: legId, memberId: me.id, eventId: ev.id, role, window: { start: 0, end: 0 } }
        : {
            id: legId,
            memberId: me.id,
            eventId: ev.id,
            role,
            origin,
            window: { start: winStart, end: winEnd },
            vehicleId: role === "driver" ? vehId : undefined,
            maxDetourMin: role === "driver" ? detour : undefined,
            maxWalkMin: role === "passenger" ? walk : undefined,
            needs: role === "passenger" ? needs : undefined,
            soft:
              role === "passenger"
                ? { smokeFree: prefSmoke || undefined, subgroup: prefSub ? me.subgroup : undefined }
                : undefined,
          };
    dispatch({ type: "setLeg", leg });
    // Recalcular el matching escribe la asignación (setAssignment). Solo lo hace
    // quien puede administrar el evento: con backend real, RLS (asg_write_admin)
    // rechaza el write de un no-organizador. En modo local (demo, sin backend)
    // mantenemos la simulación previa: el "organizador" recalcula un evento
    // público ajeno para que Resultados refleje tu cambio (incluye "No voy").
    const canRecompute = hasSupabase
      ? canAdminEvent(state, ev.id, state.meId)
      : ev.visibility === "public" && ev.createdBy !== state.meId;
    if (canRecompute && state.assignments[ev.id]) {
      const rest = state.legs.filter((l) => !(l.memberId === me.id && l.eventId === ev.id));
      void runMatch(ev.id, { warmStart: true, legsOverride: [...rest, leg] });
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">{ev.title}</div>
          <h1>{T("nav.trip")}</h1>
          <div className="sub num">{T("home.counts", { d: counts.drivers, p: counts.pax })}</div>
        </div>
      </header>

      <Segmented<Role>
        value={role}
        onChange={(r) => {
          // "Conductor" está bloqueado sin vehículo: en vez de un no-op mudo,
          // explicamos por qué y cómo cargar uno.
          if (r === "driver" && !canDrive) {
            setNoCarHint(true);
            return;
          }
          setNoCarHint(false);
          setRole(r);
        }}
        options={[
          { value: "driver", label: T("trip.role.driver") + (canDrive ? "" : " 🔒") },
          { value: "passenger", label: T("trip.role.passenger") },
          { value: "skip", label: T("trip.role.none") },
        ]}
      />
      {noCarHint && !canDrive && <p className="sub errorText">{T("trip.needVehicle")}</p>}

      {role && role !== "skip" && (
        <>
          <div className="field">
            <span>{T("trip.origin")}</span>
            <MapPicker
              center={origin}
              zoom={13}
              markers={[
                { loc: origin, kind: "origin" },
                { loc: ev.destination, kind: "destination" },
              ]}
              onTap={setOrigin}
              height={190}
              walkRadius={role === "passenger" && walk > 0 ? { center: origin, meters: walkRadiusMeters(walk) } : undefined}
            />
            {/* Atajo: si tenés casa guardada, la ofrecemos como origen (no obligatorio). */}
            {me.home && (me.home.lat !== origin.lat || me.home.lng !== origin.lng) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOrigin(me.home!)}>
                {T("trip.useHome")}
              </button>
            )}
            {role === "passenger" && walk > 0 && (
              <p className="sub mapHint">{T("trip.walkRadiusHint")}</p>
            )}
          </div>

          {role === "driver" && (
            <>
              <div className="field">
                <span>{T("trip.whichVehicle")}</span>
                {me.vehicles.length === 0 && <p className="sub">{T("profile.noVehicle")}</p>}
                {me.vehicles.length === 1 && (() => {
                  const veh = me.vehicles[0];
                  return (
                    <div className="card vehLine">
                      <span className="vehLineName">{vehicleLabel(veh, T("garage.autoN", { n: veh.capacity }))}</span>
                      <span className="sub num">{T("common.seatsN", { n: veh.capacity })}</span>
                      {veh.features.map((f) => (
                        <span key={f} className="pill">{T(`feature.${f}` as TKey)}</span>
                      ))}
                    </div>
                  );
                })()}
                {me.vehicles.length > 1 && (
                  <div className="vehPicker">
                    {me.vehicles.map((veh) => {
                      // Id efectivo: el elegido si sigue existiendo, si no el primero.
                      const selectedId = vehicleById(me, vehId)?.id ?? me.vehicles[0].id;
                      const on = selectedId === veh.id;
                      return (
                        <button
                          key={veh.id}
                          type="button"
                          className={`vehOpt ${on ? "vehOpt-on" : ""}`}
                          aria-pressed={on}
                          onClick={() => setVehId(veh.id)}
                        >
                          <span className="vehOptName">{vehicleLabel(veh, T("garage.autoN", { n: veh.capacity }))}</span>
                          <span className="sub num">{T("common.seatsN", { n: veh.capacity })}</span>
                          {veh.features.length > 0 && (
                            <span className="vehOptFeat">
                              {veh.features.map((f) => T(`feature.${f}` as TKey)).join(" · ")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="sub mapHint">{T("trip.editGarageHint")}</p>
              </div>
              <div className="field">
                <span>
                  {T("trip.maxDetour")} · <b className="num">{detour} {T("common.min")}</b>
                </span>
                <Slider value={detour} min={5} max={60} step={5} onChange={setDetour} format={(v) => `${v}′`} />
              </div>
            </>
          )}

          {role === "passenger" && (
            <>
              <div className="field">
                <span>
                  {T("trip.maxWalk")} · <b className="num">{walk} {T("common.min")}</b>
                </span>
                <Slider value={walk} min={0} max={25} onChange={setWalk} format={(v) => `${v}′`} />
              </div>
              <div className="field">
                <span>{T("trip.needs")}</span>
                <div className="chips">
                  {FEATURES.map((f) => (
                    <Chip key={f} active={needs.includes(f)} onClick={() => setNeeds(needs.includes(f) ? needs.filter((x) => x !== f) : [...needs, f])}>
                      {T(`feature.${f}` as TKey)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>{T("trip.prefs")}</span>
                <div className="chips">
                  <Chip active={prefSmoke} onClick={() => setPrefSmoke(!prefSmoke)}>
                    {T("trip.prefSmokeFree")}
                  </Chip>
                  <Chip active={prefSub} onClick={() => setPrefSub(!prefSub)}>
                    {T("trip.prefSubgroup", { name: me.subgroup ?? "—" })}
                  </Chip>
                </div>
              </div>
            </>
          )}

          <div className="field">
            <span>{T("trip.window")}</span>
            <div className="row gap winRow">
              <label className="winLbl">
                {T("trip.from")}
                <TimeInput minutes={winStart} onChange={(m) => setWinStart(Math.min(m, winEnd - 5))} />
              </label>
              <label className="winLbl">
                {T("trip.to")}
                <TimeInput minutes={winEnd} onChange={(m) => setWinEnd(Math.max(m, winStart + 5))} />
              </label>
            </div>
            <TimeWindowBar start={winStart} end={winEnd} eventMin={eventMin} labelEvent={ev.title} hour12={hour12} />
            <p className="sub mapHint">{T("trip.windowHint", { time: hhmm(eventMin) })}</p>
          </div>
        </>
      )}

      {role && (
        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          {savedFlash ? T("trip.saved") : T("common.save")}
        </button>
      )}
    </div>
  );
}
