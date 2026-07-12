import React, { useState } from "react";
import { useStore, useT } from "../state/store";
import { localeOf, LANGS, type TKey, type Lang } from "../i18n";
import { Chip, Segmented, Sheet, Stepper } from "../components/UI";
import { Avatar, MemberProfile, Stars } from "../components/People";
import { memberSince, ratingOf, tripsOf } from "../state/reputation";
import { PLANS, purchase, type PlanId } from "../services/billing";
import { requestNotifPermission } from "../services/notify";
import { auth, isValidEmail } from "../services/auth";
import { storageMode } from "../services/storage";
import type { Feature } from "../engine/types";
import type { NotifPrefs } from "../state/model";

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

  // --- verificación de email (simulada, ver services/auth.ts) ---
  const [email, setEmail] = useState(me.email ?? "");
  const [codeStage, setCodeStage] = useState(false);
  const [code, setCode] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const prefs = state.settings.notifPrefs;
  const setPref = (k: keyof NotifPrefs, v: boolean) =>
    dispatch({ type: "setSettings", patch: { notifPrefs: { ...prefs, [k]: v } } });

  const startVerify = async () => {
    if (!isValidEmail(email)) {
      setAuthMsg(T("account.invalidEmail"));
      return;
    }
    // No persistimos el email hasta confirmarlo: así no perdés el verificado
    // anterior si abandonás el flujo. Solo pedimos el código.
    const r = await auth.sendCode(email);
    if (r.ok) {
      setCodeStage(true);
      setAuthMsg(T("account.codeSent", { code: r.demoCode ?? "······" }));
    }
  };
  // Comparación canónica (minúsculas): el email tipeado coincide con el verificado.
  const alreadyVerified = !!me.emailVerified && me.email === email.trim().toLowerCase();
  const confirmCode = async () => {
    if (await auth.verifyCode(email, code)) {
      // Guardar en forma canónica (minúsculas) — igual que valida auth — para que
      // el badge y el botón no se contradigan por diferencias de mayúsculas.
      dispatch({ type: "updateMember", member: { ...me, email: email.trim().toLowerCase(), emailVerified: true } });
      setCodeStage(false);
      setCode("");
      setAuthMsg(T("account.verifyOk"));
    } else {
      setAuthMsg(T("account.verifyFail"));
    }
  };

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

      <h2 className="eyebrow">{T("account.title")}</h2>
      <div className="field">
        <span>
          {T("account.email")}{" "}
          {me.email && (
            <span className={`pill ${me.emailVerified ? "pill-ok" : "pill-warn"}`}>
              {me.emailVerified ? `✓ ${T("account.verified")}` : T("account.unverified")}
            </span>
          )}
        </span>
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setCodeStage(false);
            setAuthMsg("");
          }}
          placeholder={T("ob.emailPlaceholder")}
        />
        {!codeStage ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!email.trim() || (alreadyVerified)}
            onClick={startVerify}
          >
            {alreadyVerified ? `✓ ${T("account.verified")}` : T("account.sendCode")}
          </button>
        ) : (
          <div className="row gap">
            <input
              className="num codeInput"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={T("account.codePlaceholder")}
              maxLength={6}
              inputMode="numeric"
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={code.length < 6} onClick={confirmCode}>
              {T("account.confirm")}
            </button>
          </div>
        )}
        {authMsg && <p className="sub">{authMsg}</p>}
      </div>

      <div className="field">
        <span>{T("prefs.title")}</span>
        <PrefRow label={T("prefs.assignments")} on={prefs.assignments} onToggle={(v) => setPref("assignments", v)} />
        <PrefRow label={T("prefs.requests")} on={prefs.requests} onToggle={(v) => setPref("requests", v)} />
        <PrefRow label={T("prefs.chat")} on={prefs.chat} onToggle={(v) => setPref("chat", v)} />
        <PrefRow label={T("prefs.email")} on={prefs.email} onToggle={(v) => setPref("email", v)} />
      </div>

      <h2 className="eyebrow">{T("profile.settings")}</h2>

      <div className="field">
        <span>{T("profile.lang")}</span>
        <div className="langGrid">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`langCard ${lang === l.id ? "langCard-on" : ""}`}
              onClick={() => dispatch({ type: "setSettings", patch: { lang: l.id } })}
              aria-pressed={lang === l.id}
            >
              <span className="langFlag" aria-hidden="true">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
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
        className="btn btn-ghost btn-block"
        onClick={() => dispatch({ type: "setSettings", patch: { onboarded: false } })}
      >
        {T("profile.replayOnboarding")}
      </button>

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

/** Fila con toggle tipo switch para una preferencia de aviso. */
function PrefRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="prefRow">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`toggle ${on ? "toggle-on" : ""}`}
        onClick={() => onToggle(!on)}
      >
        <span className="toggleKnob" />
      </button>
    </div>
  );
}
