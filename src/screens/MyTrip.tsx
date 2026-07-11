import React, { useEffect, useMemo, useState } from "react";
import { useStore, useT } from "../state/store";
import { type TKey } from "../i18n";
import { Segmented, Slider, Stepper, Chip, TimeInput } from "../components/UI";
import MapPicker from "../components/MapPicker";
import { isParticipant } from "../state/reputation";
import type { Feature, LatLng } from "../engine/types";
import type { Role } from "../state/model";

const FEATURES: Feature[] = ["wheelchair", "pets", "big_trunk", "bikes", "child_seat"];

export default function MyTrip({ eventId }: { eventId: string | null }) {
  const { state, dispatch, runMatch } = useStore();
  const T = useT();
  const ev = state.events.find((e) => e.id === eventId);
  const me = state.members.find((m) => m.id === state.meId)!;
  const existing = state.legs.find((l) => l.eventId === eventId && l.memberId === state.meId);
  // Un leg "skip" guarda window {0,0} como centinela: no hidratar el form con eso.
  const activeLeg = existing && existing.role !== "skip" ? existing : undefined;

  const [role, setRole] = useState<Role | null>(existing?.role ?? null);
  const [origin, setOrigin] = useState<LatLng>(activeLeg?.origin ?? me.home);
  const [detour, setDetour] = useState(activeLeg?.maxDetourMin ?? 20);
  const [walk, setWalk] = useState(activeLeg?.maxWalkMin ?? 10);
  const [needs, setNeeds] = useState<Feature[]>(activeLeg?.needs ?? []);
  const [winStart, setWinStart] = useState(activeLeg?.window.start ?? 690);
  const [winEnd, setWinEnd] = useState(activeLeg?.window.end ?? 760);
  const [prefSmoke, setPrefSmoke] = useState(!!activeLeg?.soft?.smokeFree);
  const [prefSub, setPrefSub] = useState(!!activeLeg?.soft?.subgroup);
  const [savedFlash, setSavedFlash] = useState(false);

  // resync al cambiar de evento
  useEffect(() => {
    setRole(existing?.role ?? null);
    setDetour(activeLeg?.maxDetourMin ?? 20);
    setWalk(activeLeg?.maxWalkMin ?? 10);
    setNeeds(activeLeg?.needs ?? []);
    setWinStart(activeLeg?.window.start ?? 690);
    setWinEnd(activeLeg?.window.end ?? 760);
    setPrefSmoke(!!activeLeg?.soft?.smokeFree);
    setPrefSub(!!activeLeg?.soft?.subgroup);
    setOrigin(activeLeg?.origin ?? me.home);
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

  const canDrive = !!me.vehicle;
  const save = () => {
    if (!role) return;
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
            maxDetourMin: role === "driver" ? detour : undefined,
            maxWalkMin: role === "passenger" ? walk : undefined,
            needs: role === "passenger" ? needs : undefined,
            soft:
              role === "passenger"
                ? { smokeFree: prefSmoke || undefined, subgroup: prefSub ? me.subgroup : undefined }
                : undefined,
          };
    dispatch({ type: "setLeg", leg });
    // Evento público ajeno ya calculado: el organizador (simulado) recalcula
    // para que Resultados refleje tu cambio (incluye bajarte con "No voy").
    if (ev.visibility === "public" && ev.createdBy !== state.meId && state.assignments[ev.id]) {
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
          if (r === "driver" && !canDrive) return;
          setRole(r);
        }}
        options={[
          { value: "driver", label: T("trip.role.driver") + (canDrive ? "" : " 🔒") },
          { value: "passenger", label: T("trip.role.passenger") },
          { value: "skip", label: T("trip.role.none") },
        ]}
      />

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
            />
          </div>

          {role === "driver" && (
            <>
              <div className="field row spread">
                <span>{T("trip.capacity")}</span>
                <Stepper value={me.vehicle?.capacity ?? 3} min={1} max={8} onChange={(v) => me.vehicle && dispatch({ type: "updateMember", member: { ...me, vehicle: { ...me.vehicle, capacity: v } } })} />
              </div>
              <div className="field">
                <span>
                  {T("trip.maxDetour")} · <b className="num">{detour} {T("common.min")}</b>
                </span>
                <Slider value={detour} min={5} max={60} step={5} onChange={setDetour} format={(v) => `${v}′`} />
              </div>
              <div className="field">
                <span>{T("trip.features")}</span>
                <div className="chips">
                  {FEATURES.map((f) => (
                    <Chip
                      key={f}
                      active={me.vehicle?.features.includes(f)}
                      onClick={() => {
                        if (!me.vehicle) return;
                        const has = me.vehicle.features.includes(f);
                        const features = has ? me.vehicle.features.filter((x) => x !== f) : [...me.vehicle.features, f];
                        dispatch({ type: "updateMember", member: { ...me, vehicle: { ...me.vehicle, features } } });
                      }}
                    >
                      {T(`feature.${f}` as TKey)}
                    </Chip>
                  ))}
                  <Chip
                    active={me.vehicle?.smokeFree}
                    onClick={() => me.vehicle && dispatch({ type: "updateMember", member: { ...me, vehicle: { ...me.vehicle, smokeFree: !me.vehicle.smokeFree } } })}
                  >
                    {T("trip.smokeFree")}
                  </Chip>
                </div>
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
                <TimeInput minutes={winStart} onChange={setWinStart} />
              </label>
              <label className="winLbl">
                {T("trip.to")}
                <TimeInput minutes={winEnd} onChange={(m) => setWinEnd(Math.max(m, winStart + 5))} />
              </label>
            </div>
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
