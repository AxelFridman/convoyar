import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { type TKey, type Lang } from "../i18n";
import { Chip, Segmented, Sheet, Stepper } from "../components/UI";
import { Avatar, MemberProfile, Stars } from "../components/People";
import { memberSince, ratingOf, tripsOf } from "../state/reputation";
import { PLANS, purchase, type PlanId } from "../services/billing";
import { requestNotifPermission } from "../services/notify";
import { storageMode } from "../services/storage";
import type { Feature } from "../engine/types";

const FEATURES: Feature[] = ["wheelchair", "pets", "big_trunk", "bikes", "child_seat"];

export default function Profile() {
  const { state, dispatch, resetDemo } = useStore();
  const T = useT();
  const lang = state.settings.lang;
  const me = state.members.find((m) => m.id === state.meId)!;
  const [purchaseMsg, setPurchaseMsg] = useState("");
  const [rateId, setRateId] = useState<string | null>(null);
  const rating = ratingOf(state, me.id);
  const myTrips = tripsOf(state, me.id);

  const setVehicle = (v: NonNullable<typeof me.vehicle> | null) =>
    dispatch({ type: "updateMember", member: { ...me, vehicle: v } });

  const removeVehicle = () => {
    // Sin vehículo no se puede manejar: bajamos también los legs de conductor
    // para que los contadores y el matching no queden apuntando a un auto fantasma.
    const driverLegs = state.legs.filter((l) => l.memberId === me.id && l.role === "driver");
    if (driverLegs.length > 0) {
      if (!confirm(T("profile.removeVehicleConfirm", { n: driverLegs.length }))) return;
      for (const l of driverLegs) dispatch({ type: "removeLeg", memberId: me.id, eventId: l.eventId });
    }
    setVehicle(null);
  };

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="eyebrow">Convoyar</div>
          <h1>{T("nav.profile")}</h1>
        </div>
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
              {new Date(t.dateISO).toLocaleDateString(lang === "es" ? "es-AR" : "en-US", { day: "numeric", month: "short" })}
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
        <span>{T("profile.vehicle")}</span>
        {!me.vehicle ? (
          <button type="button" className="btn btn-ghost" onClick={() => setVehicle({ capacity: 3, features: [], smokeFree: true })}>
            + {T("profile.vehicle")}
          </button>
        ) : (
          <div className="card vehCard">
            <div className="row spread">
              <span>{T("trip.capacity")}</span>
              <Stepper value={me.vehicle.capacity} min={1} max={8} onChange={(v) => setVehicle({ ...me.vehicle!, capacity: v })} />
            </div>
            <label className="field">
              <span>{T("profile.plate")}</span>
              <input
                className="num"
                value={me.vehicle.plate ?? ""}
                onChange={(e) => setVehicle({ ...me.vehicle!, plate: e.target.value.toUpperCase() || undefined })}
                placeholder="AB 123 CD"
                maxLength={9}
              />
            </label>
            <div className="chips">
              {FEATURES.map((f) => (
                <Chip
                  key={f}
                  active={me.vehicle!.features.includes(f)}
                  onClick={() => {
                    const has = me.vehicle!.features.includes(f);
                    setVehicle({ ...me.vehicle!, features: has ? me.vehicle!.features.filter((x) => x !== f) : [...me.vehicle!.features, f] });
                  }}
                >
                  {T(`feature.${f}` as TKey)}
                </Chip>
              ))}
              <Chip active={me.vehicle.smokeFree} onClick={() => setVehicle({ ...me.vehicle!, smokeFree: !me.vehicle!.smokeFree })}>
                {T("trip.smokeFree")}
              </Chip>
            </div>
            <button type="button" className="btn btn-ghost btn-xs danger" onClick={removeVehicle} aria-label={T("profile.removeVehicle")}>
              ×
            </button>
          </div>
        )}
      </div>

      <h2 className="eyebrow">{T("profile.settings")}</h2>

      <div className="field row spread">
        <span>{T("profile.lang")}</span>
        <Segmented<Lang>
          value={lang}
          onChange={(l) => dispatch({ type: "setSettings", patch: { lang: l } })}
          options={[
            { value: "es", label: "ES" },
            { value: "en", label: "EN" },
          ]}
        />
      </div>

      <div className="field row spread">
        <span>{T("profile.theme")}</span>
        <Segmented<"system" | "dark" | "light">
          value={state.settings.theme}
          onChange={(th) => dispatch({ type: "setSettings", patch: { theme: th } })}
          options={[
            { value: "system", label: T("profile.theme.system") },
            { value: "dark", label: T("profile.theme.dark") },
            { value: "light", label: T("profile.theme.light") },
          ]}
        />
      </div>

      <div className="field">
        <span>{T("profile.plan")}</span>
        <div className="planRow">
          {(Object.keys(PLANS) as PlanId[]).map((pid) => (
            <button
              key={pid}
              type="button"
              className={`planCard ${state.settings.plan === pid ? "planCard-on" : ""}`}
              onClick={async () => {
                await purchase(pid); // stub: el mensaje real sale de i18n
                setPurchaseMsg(T("profile.purchaseStub"));
                dispatch({ type: "setSettings", patch: { plan: pid } });
              }}
            >
              <b>{T(`plan.${pid}` as TKey)}</b>
              <span className="sub num">{T(`plan.price.${pid}` as TKey)}</span>
            </button>
          ))}
        </div>
        {purchaseMsg && <p className="sub">{purchaseMsg}</p>}
      </div>

      {!state.settings.notifPermission && (
        <div className="field row spread">
          <span>{T("profile.notifs")}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              const ok = await requestNotifPermission();
              dispatch({ type: "setSettings", patch: { notifPermission: ok } });
            }}
          >
            {T("profile.notifsBtn")}
          </button>
        </div>
      )}

      <button
        type="button"
        className="btn btn-ghost danger btn-block"
        onClick={() => {
          if (confirm(T("profile.resetConfirm"))) {
            resetDemo();
          }
        }}
      >
        {T("profile.reset")}
      </button>

      <p className="sub about">
        {T("profile.about", { mode: storageMode })}
        <br />
        <span className="num">v1.0</span>
      </p>
    </div>
  );
}
