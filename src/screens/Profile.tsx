import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { localeOf, type TKey } from "../i18n";
import { Chip, Sheet, Stepper } from "../components/UI";
import { Avatar, Badges, MemberProfile, Stars } from "../components/People";
import { memberSince, ratingOf, tripsOf } from "../state/reputation";
import { profileCompletion } from "../state/achievements";
import { blankVehicle, newVehicleId } from "../state/vehicles";
import Settings from "./Settings";
import MapPicker, { DEFAULT_CENTER } from "../components/MapPicker";
import { IconChevronRight, IconSettings } from "../components/Icons";
import type { Feature } from "../engine/types";
import type { Vehicle } from "../state/model";

const FEATURES: Feature[] = ["wheelchair", "pets", "big_trunk", "bikes", "child_seat"];

/**
 * Perfil — lo CORE de tu identidad: quién sos, tu reputación, tu garage.
 * La configuración avanzada vive en Ajustes (un tap desde acá), para no
 * abrumar la pantalla principal (PR-B1).
 */
export default function Profile() {
  const { state, dispatch } = useStore();
  const T = useT();
  const lang = state.settings.lang;
  const me = state.members.find((m) => m.id === state.meId)!;
  const [rateId, setRateId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const rating = ratingOf(state, me.id);
  const myTrips = tripsOf(state, me.id);
  const completion = profileCompletion(me);

  const setVehicles = (vehicles: Vehicle[]) =>
    dispatch({ type: "updateMember", member: { ...me, vehicles } });
  const updateVehicle = (v: Vehicle) =>
    setVehicles(me.vehicles.map((x) => (x.id === v.id ? v : x)));
  const addVehicle = () => setVehicles([...me.vehicles, blankVehicle(newVehicleId())]);
  const removeVehicle = (id: string) => {
    const rest = me.vehicles.filter((x) => x.id !== id);
    const myDriverLegs = state.legs.filter((l) => l.memberId === me.id && l.role === "driver");
    // Toda salida donde manejo puede quedar con una asignación obsoleta al tocar el
    // garage → la invalidamos (mejor "sin calcular" que un convoy corrupto).
    const affectedEvents = myDriverLegs.map((l) => l.eventId);

    if (rest.length === 0) {
      // Sin vehículos no puedo manejar: bajo mis legs de conductor.
      if (myDriverLegs.length > 0) {
        if (!confirm(T("profile.removeVehicleConfirm", { n: myDriverLegs.length }))) return;
        for (const l of myDriverLegs) dispatch({ type: "removeLeg", memberId: me.id, eventId: l.eventId });
      }
    } else {
      // Queda garage: los legs que ofrecían el vehículo borrado pasan al primero que quede.
      for (const l of myDriverLegs.filter((l) => l.vehicleId === id)) {
        dispatch({ type: "setLeg", leg: { ...l, vehicleId: rest[0].id } });
      }
    }
    if (affectedEvents.length > 0) dispatch({ type: "invalidateAssignments", eventIds: affectedEvents });
    setVehicles(rest);
  };

  if (showSettings) return <Settings onBack={() => setShowSettings(false)} />;

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">Convoyar</div>
          <h1>{T("nav.profile")}</h1>
        </div>
        <button type="button" className="iconBtn" onClick={() => setShowSettings(true)} aria-label={T("settings.title")}>
          <IconSettings />
        </button>
      </header>

      <label className="field">
        <span>{T("profile.name")}</span>
        <input value={me.name} onChange={(e) => dispatch({ type: "updateMember", member: { ...me, name: e.target.value } })} />
      </label>
      <label className="field">
        <span>{T("profile.subgroup")}</span>
        <input
          value={me.subgroup ?? ""}
          onChange={(e) => dispatch({ type: "updateMember", member: { ...me, subgroup: e.target.value || undefined } })}
          placeholder={T("profile.subgroupPlaceholder")}
        />
      </label>

      <div className="field">
        <span>{T("profile.myReputation")}</span>
        <div className="card repCard">
          <Avatar id={me.id} name={me.name} size={44} />
          <div>
            <Stars avg={rating.avg} count={rating.count} />
            <div className="sub">{T("profile.memberSince", { since: memberSince(me.joinedISO, lang) })}</div>
          </div>
        </div>
      </div>

      {completion.pct < 100 && (
        <div className="field">
          <span>{T("complete.title", { pct: completion.pct })}</span>
          <div className="completeBar" aria-hidden="true">
            <div className="completeFill" style={{ width: `${completion.pct}%` }} />
          </div>
          <div className="completeSteps">
            {completion.steps.filter((s) => !s.done).map((s) => (
              <span key={s.key} className="pill">{T(s.key as TKey)}</span>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span>{T("ach.title")}</span>
        <Badges memberId={me.id} />
      </div>

      {/* Casa OPCIONAL: atajo de origen para viajes nuevos. No se exige; cada
          viaje elige su propio punto de salida. Se puede borrar. */}
      <div className="field">
        <span>{T("profile.home")}</span>
        <p className="sub">{me.home ? T("profile.homeHint") : T("profile.noHome")}</p>
        <MapPicker
          center={me.home ?? DEFAULT_CENTER}
          zoom={13}
          markers={me.home ? [{ loc: me.home, kind: "origin" }] : []}
          onTap={(loc) => dispatch({ type: "updateMember", member: { ...me, home: loc } })}
          height={200}
        />
        {me.home && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: "updateMember", member: { ...me, home: undefined } })}
          >
            {T("profile.clearHome")}
          </button>
        )}
      </div>

      <div className="field">
        <span>{T("profile.history")}</span>
        {myTrips.length === 0 && <p className="sub">{T("profile.historyEmpty")}</p>}
        {myTrips.slice(0, 6).map((t) => (
          <div key={t.id} className="tripRow">
            <span className={`pill ${t.role === "driver" ? "pill-ok" : ""}`}>
              {t.role === "driver" ? T("common.driver") : T("common.passenger")}
            </span>
            <span className="tripTitle">
              {t.title}
              {t.withName && <span className="sub"> {T("profile.with", { name: t.withName })}</span>}
            </span>
            <span className="sub num">
              {new Date(t.dateISO).toLocaleDateString(localeOf(lang), { day: "numeric", month: "short" })}
            </span>
            {t.withMemberId && (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setRateId(t.withMemberId!)}>
                {T("profile.rate")}
              </button>
            )}
          </div>
        ))}
      </div>

      <Sheet open={!!rateId} onClose={() => setRateId(null)} title={T("explore.viewProfile")}>
        {rateId && <MemberProfile memberId={rateId} allowRate />}
      </Sheet>

      <div className="field">
        <span>{T("garage.title")}</span>
        {me.vehicles.length === 0 && <p className="sub">{T("garage.empty")}</p>}
        {me.vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            index={me.vehicles.indexOf(v)}
            onChange={updateVehicle}
            onRemove={() => removeVehicle(v.id)}
          />
        ))}
        <button type="button" className="btn btn-ghost" onClick={addVehicle}>
          + {T("garage.add")}
        </button>
      </div>

      {/* Puerta a la configuración avanzada — un tap, todo lo demás vive ahí. */}
      <button type="button" className="settingsEntry" onClick={() => setShowSettings(true)}>
        <IconSettings size={20} />
        <span>{T("settings.title")}</span>
        <IconChevronRight size={20} />
      </button>
    </div>
  );
}

/** Tarjeta editable de un vehículo del garage: alias, capacidad, patente, features. */
function VehicleCard({
  vehicle,
  index,
  onChange,
  onRemove,
}: {
  vehicle: Vehicle;
  index: number;
  onChange: (v: Vehicle) => void;
  onRemove: () => void;
}) {
  const T = useT();
  return (
    <div className="card vehCard">
      <div className="row spread vehCardHead">
        <input
          className="vehAlias"
          value={vehicle.alias ?? ""}
          onChange={(e) => onChange({ ...vehicle, alias: e.target.value || undefined })}
          placeholder={T("garage.aliasPlaceholder", { n: index + 1 })}
          aria-label={T("garage.alias")}
        />
        <button type="button" className="btn btn-ghost btn-xs danger" onClick={onRemove} aria-label={T("profile.removeVehicle")}>
          ×
        </button>
      </div>
      <div className="row spread">
        <span>{T("trip.capacity")}</span>
        <Stepper value={vehicle.capacity} min={1} max={8} onChange={(v) => onChange({ ...vehicle, capacity: v })} />
      </div>
      <label className="field">
        <span>{T("profile.plate")}</span>
        <input
          className="num"
          value={vehicle.plate ?? ""}
          onChange={(e) => onChange({ ...vehicle, plate: e.target.value.toUpperCase() || undefined })}
          placeholder="AB 123 CD"
          maxLength={9}
        />
      </label>
      <div className="chips">
        {FEATURES.map((f) => (
          <Chip
            key={f}
            active={vehicle.features.includes(f)}
            onClick={() => {
              const has = vehicle.features.includes(f);
              onChange({
                ...vehicle,
                features: has ? vehicle.features.filter((x) => x !== f) : [...vehicle.features, f],
              });
            }}
          >
            {T(`feature.${f}` as TKey)}
          </Chip>
        ))}
        <Chip active={vehicle.smokeFree} onClick={() => onChange({ ...vehicle, smokeFree: !vehicle.smokeFree })}>
          {T("trip.smokeFree")}
        </Chip>
      </div>
    </div>
  );
}
